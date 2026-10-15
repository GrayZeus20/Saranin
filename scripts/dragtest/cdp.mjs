// Minimal CDP client for the drag tests — no dependencies.
// Node 18+ ships global fetch (for /json/*) and Node 22+ ships a global
// WebSocket (for the DevTools socket), which is all a headless test needs.
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Prefer the Playwright-bundled Chromium (present wherever Playwright ran),
// then a system Chrome, then Edge. Windows paths first, then Linux/macOS so CI
// (ubuntu-latest) can find the browser it ships with.
const LOCAL = process.env.LOCALAPPDATA || ''
export const CHROME_CANDIDATES = [
  // Windows
  `${LOCAL}/ms-playwright/chromium-1234/chrome-win64/chrome.exe`,
  `${LOCAL}/ms-playwright/chromium-1223/chrome-win64/chrome.exe`,
  `${LOCAL}/ms-playwright/chromium-1208/chrome-win64/chrome.exe`,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  // Linux (GitHub Actions ubuntu-latest ships google-chrome-stable)
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

export function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => p && existsSync(p))
  if (!found) throw new Error('no Chromium/Chrome/Edge binary found')
  return found
}

export async function waitForCdp(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (res.ok) return await res.json()
    } catch {
      /* not up yet — keep polling */
    }
    await sleep(250)
  }
  throw new Error(`CDP did not come up on port ${port} within ${timeoutMs}ms`)
}

export async function openTarget(port, url) {
  // Chrome 111+ requires PUT for /json/new; older builds accept GET.
  for (const method of ['PUT', 'GET']) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method })
      if (res.ok) return await res.json()
    } catch {
      /* try the next method */
    }
  }
  throw new Error('could not open a CDP target')
}

export async function launchChrome({ port, width = 390, height = 844 }) {
  const chromePath = findChrome()
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'saranin-test-'))
  const proc = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--mute-audio',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    'about:blank',
  ], { stdio: 'ignore' })
  return { proc, chromePath, userDataDir }
}

/** Connect to a target's DevTools socket and wrap it in a small promise API. */
export function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    let id = 0
    const pending = new Map()
    ws.onopen = () => resolve({
      ws,
      send(method, params = {}) {
        return new Promise((res, rej) => {
          const msgId = ++id
          pending.set(msgId, { res, rej })
          ws.send(JSON.stringify({ id: msgId, method, params }))
        })
      },
      close: () => ws.close(),
    })
    ws.onerror = () => reject(new Error('DevTools WebSocket failed to open'))
    ws.onmessage = (m) => {
      let msg
      try { msg = JSON.parse(m.data) } catch { return }
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id)
        pending.delete(msg.id)
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result)
      }
    }
  })
}

export async function evaluate(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(`page eval failed: ${r.exceptionDetails.text}`)
  return r.result.value
}

/** Real mouse drag: pressed → N interpolated moves → released. */
export async function drag(cdp, fromX, fromY, toX, toY, steps = 12) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' })
  for (let i = 1; i <= steps; i++) {
    const x = fromX + ((toX - fromX) * i) / steps
    const y = fromY + ((toY - fromY) * i) / steps
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1, pointerType: 'mouse' })
    await sleep(12)
  }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y: toY, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' })
  await sleep(120)
}

export async function clickAt(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' })
  await sleep(30)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' })
  await sleep(150)
}

export async function pressKey(cdp, key, code, vk) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
}

/** Collect console errors + uncaught exceptions for the life of the socket. */
export function watchConsole(cdp) {
  const errors = []
  cdp.ws.addEventListener('message', (m) => {
    let msg
    try { msg = JSON.parse(m.data) } catch { return }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
      errors.push((msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '))
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params?.exceptionDetails?.text || 'uncaught exception')
    }
  })
  return errors
}

export async function setupPage(cdp, url, { width = 390, height = 844 } = {}) {
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true })
  await cdp.send('Page.navigate', { url })
  await sleep(400)
}
