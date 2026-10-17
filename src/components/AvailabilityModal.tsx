// The "List" popup behind the country rail: every country TMDB reports for this
// title, each with its services and a deep link to that country's JustWatch
// page. Scrollable on its own — the detail page already locks the document
// body, so this modal owns its scroll container.
//
// Only mounted while open, so a title available in 60 countries costs nothing
// until someone asks for the list.

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ProviderPill } from './ProviderPill'
import type { AvailableRegion } from './RegionFlagRail'

export function AvailabilityModal({ open, regions, title, onClose }: {
  open: boolean
  regions: AvailableRegion[]
  title: string
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Escape closes; focus moves into the dialog when it opens so the keyboard
  // path does not stay behind on the page underneath.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Where ${title} is available`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full sm:max-w-2xl max-h-[85vh] flex flex-col bg-surface-elevated border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4 sm:p-5 border-b border-zinc-800 shrink-0">
              <div className="min-w-0">
                <h2 className="text-text-primary text-sm sm:text-base font-black">Where to watch</h2>
                <p className="text-text-muted text-[11px] mt-0.5 truncate">
                  {title} · available in {regions.length} {regions.length === 1 ? 'country' : 'countries'}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close availability list"
                className="ml-auto shrink-0 grid h-9 w-9 place-items-center rounded-full bg-surface-card text-text-muted hover:text-text-primary hover:bg-surface border border-zinc-800 transition-colors active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </svg>
              </button>
            </div>

            {/* The scrollable body. overscroll-contain keeps a flick at the end
                of this list from scrolling the page behind the modal. */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3">
              {regions.map(({ code, name, link, providers }) => (
                <div key={code} className="bg-surface-card border border-zinc-800/70 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    {/* Flag + code doubled on Windows (no color flag font, so
                        the emoji paints as its two regional letters — 🇮🇩 +
                        "ID" read "ID ID"). The name alone carries the country;
                        the code chip stays as the data anchor. */}
                    <span className="text-text-primary text-sm font-bold truncate">{name}</span>
                    <span className="text-text-muted text-[10px] font-mono shrink-0">{code}</span>
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto shrink-0 text-accent text-[10px] font-bold hover:text-white transition-colors"
                      >
                        JustWatch →
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {providers.map(p => (
                      <ProviderPill key={p.provider_id} provider={p} link={link} small />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AvailabilityModal
