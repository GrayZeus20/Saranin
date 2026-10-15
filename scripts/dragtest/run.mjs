// Headless drag test for src/components/ScrollRow.tsx — no test framework.
//
//   node scripts/dragtest/run.mjs
//
// Boots a vite dev server on the harness page (./harness, which mounts the REAL
// ScrollRow), launches headless Chromium from the Playwright cache (or system
// Chrome/Edge), drives real mouse input over the DevTools protocol, and asserts:
//
//   happy path   drag moves scrollLeft; keyboard ArrowRight pages the rail
//   click guard  the click that ends a drag is swallowed; a plain tap still fires
//   edge         a rail that fits has no overflow and both arrows are disabled
//   error path   pointercancel mid-gesture clears the drag state, no exceptions
//
// Exit code 0 = all checks pass, 1 = at least one failed. Prints a JSON block
// between DRAGTEST_START / DRAGTEST_END either way.
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  clickAt, connect, drag, evaluate, launchChrome, openTarget,
  pressKey, setupPage, sleep, waitForCdp, watchConsole,
} from './cdp.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.resolve(HERE, '../..')
const CDP_PORT = Number(process.env.DRAGTEST_CDP_PORT || 9333)
const VIEWPORT = { width: 390, height: 844 } // iPhone-class portrait

const trackSel = (row) => `[data-row="${row}"] .scroll-row__track`
const arrowSel = (row, dir) => `[data-row="${row}"] .scroll-row__arrow--${dir}`

async function trackGeom(cdp, row) {
  return evaluate(cdp, `(() => {
    const el = document.querySelector('${trackSel(row)}')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { right: r.right, y: r.top + r.height / 2, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollLeft: el.scrollLeft }
  })()`)
}

async function runTest() {
  const steps = {}

  const server = await createServer({
    root: path.join(HERE, 'harness'),
    configFile: false,
    plugins: [react()],
    logLevel: 'error',
    server: { port: 5179, strictPort: false, host: '127.0.0.1' },
    css: { postcss: path.join(PROJECT, 'postcss.config.js') },
  })
  await server.listen()
  const pageUrl = `http://127.0.0.1:${server.httpServer.address().port}/`

  const { proc: chrome, userDataDir, chromePath } = await launchChrome({ port: CDP_PORT, ...VIEWPORT })
  let cdp = null
  try {
    await waitForCdp(CDP_PORT)
    const target = await openTarget(CDP_PORT, pageUrl)
    cdp = await connect(target.webSocketDebuggerUrl)
    const consoleErrors = watchConsole(cdp)

    await setupPage(cdp, pageUrl, VIEWPORT)
    // Let the harness mount and the 20-card rail lay out.
    await evaluate(cdp, `new Promise((resolve) => {
      const started = performance.now()
      const tick = () => {
        const el = document.querySelector('${trackSel('cards')}')
        if ((el && el.scrollWidth > el.clientWidth + 200) || performance.now() - started > 8000) resolve(true)
        else setTimeout(tick, 100)
      }
      tick()
    })`)

    // --- happy path: real mouse drag moves the rail -------------------------
    const geom = await trackGeom(cdp, 'cards')
    if (!geom) throw new Error('cards rail never mounted')
    steps.trackMounted = { scrollWidth: geom.scrollWidth, clientWidth: geom.clientWidth, overflow: geom.scrollWidth - geom.clientWidth }

    const startX = geom.right - 40
    await drag(cdp, startX, geom.y, startX - 180, geom.y)
    const afterDrag = await evaluate(cdp, `document.querySelector('${trackSel('cards')}').scrollLeft`)
    steps.scrollLeftBeforeDrag = geom.scrollLeft
    steps.scrollLeftAfterDrag = afterDrag
    steps.dragMovedPx = Math.round(afterDrag - geom.scrollLeft)
    steps.dragWorks = afterDrag - geom.scrollLeft > 80
    steps.clicksAfterDrag = await evaluate(cdp, 'window.__clicks()')
    steps.dragSwallowedClick = steps.clicksAfterDrag === 0
    steps.isDraggingClassCleared = await evaluate(cdp, `!document.querySelector('${trackSel('cards')}').classList.contains('is-dragging')`)
    steps.edgeFadeLeftActive = await evaluate(cdp, `document.querySelector('${trackSel('cards')}').classList.contains('has-left')`)

    // --- click guard: a plain tap still opens a card ------------------------
    const tapGeom = await evaluate(cdp, `(() => {
      const track = document.querySelector('${trackSel('cards')}')
      const card = track.querySelector('[data-card]')
      const r = card.getBoundingClientRect()
      return { x: Math.max(r.left + 8, 4) + Math.min(40, r.width / 3), y: r.top + r.height / 2 }
    })()`)
    await clickAt(cdp, tapGeom.x, tapGeom.y)
    steps.clicksAfterTap = await evaluate(cdp, 'window.__clicks()')
    steps.tapStillClicks = steps.clicksAfterTap === 1

    // --- happy path: keyboard paging ----------------------------------------
    await evaluate(cdp, `document.querySelector('${trackSel('cards')}').focus()`)
    const beforeKey = await evaluate(cdp, `document.querySelector('${trackSel('cards')}').scrollLeft`)
    await pressKey(cdp, 'ArrowRight', 'ArrowRight', 39)
    await sleep(700) // smooth scroll
    const afterKey = await evaluate(cdp, `document.querySelector('${trackSel('cards')}').scrollLeft`)
    steps.keyboardPagedPx = Math.round(afterKey - beforeKey)
    steps.keyboardWorks = afterKey - beforeKey > 80

    // --- edge: a rail that fits must not overflow and both arrows disabled --
    const fits = await trackGeom(cdp, 'fits')
    steps.fitsOverflow = fits.scrollWidth - fits.clientWidth
    steps.fitsNoOverflow = steps.fitsOverflow <= 2
    steps.fitsArrowsDisabled = await evaluate(cdp,
      `document.querySelector('${arrowSel('fits', 'left')}').disabled && document.querySelector('${arrowSel('fits', 'right')}').disabled`)

    // --- error path: pointercancel mid-gesture leaves no stuck drag state ---
    const cancelY = (await trackGeom(cdp, 'cards')).y
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: startX, y: cancelY, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: startX - 60, y: cancelY, button: 'left', buttons: 1, pointerType: 'mouse' })
    await sleep(60)
    steps.draggingDuringGesture = await evaluate(cdp, `document.querySelector('${trackSel('cards')}').classList.contains('is-dragging')`)
    await evaluate(cdp, `document.querySelector('${trackSel('cards')}').dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }))`)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: startX - 60, y: cancelY, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' })
    await sleep(80)
    steps.cancelClearedDragState = await evaluate(cdp, `!document.querySelector('${trackSel('cards')}').classList.contains('is-dragging')`)

    steps.consoleErrors = consoleErrors
    steps.consoleErrorCount = consoleErrors.length

    const checks = {
      dragWorks: steps.dragWorks,
      dragSwallowedClick: steps.dragSwallowedClick,
      isDraggingClassCleared: steps.isDraggingClassCleared,
      tapStillClicks: steps.tapStillClicks,
      keyboardWorks: steps.keyboardWorks,
      fitsNoOverflow: steps.fitsNoOverflow,
      fitsArrowsDisabled: steps.fitsArrowsDisabled,
      cancelClearedDragState: steps.cancelClearedDragState,
      noConsoleErrors: consoleErrors.length === 0,
    }
    return {
      chrome: path.basename(chromePath), serverPort: server.httpServer.address().port,
      steps, checks, pass: Object.values(checks).every(Boolean),
    }
  } finally {
    try { cdp?.close() } catch { /* already closed */ }
    try { chrome.kill() } catch { /* already dead */ }
    try { await server.close() } catch { /* already closed */ }
    try { rmSync(userDataDir, { recursive: true, force: true }) } catch { /* tmp dir, best effort */ }
  }
}

let result = null
let failure = null
try {
  result = await runTest()
} catch (err) {
  failure = err?.stack || String(err)
}
console.log('\nDRAGTEST_START\n' + JSON.stringify({ failure, result }, null, 2) + '\nDRAGTEST_END')
process.exit(failure || !result?.pass ? 1 : 0)
