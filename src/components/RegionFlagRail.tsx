// The "where is this available" rail: one flag per country, laid out on a
// shallow crescent (the row dips in the middle and lifts at the ends, so it
// reads as a moon rather than a straight line), horizontally scrollable and
// drag-to-scroll on a mouse.
//
// The scrolling, edge fades, arrow buttons, keyboard paging and drag-vs-click
// arbitration all come from the shared ScrollRow — this file only adds the
// country chip and the arc. Reusing that rail is why a drag here cannot fire a
// chip's click (a swipe that opened a country would be a bug).

import ScrollRow from './ScrollRow'
import type { ProviderLike } from './ProviderPill'

export interface AvailableRegion {
  code: string
  name: string
  flag: string
  link?: string
  providers: ProviderLike[]
}

/** How far the middle of the row dips below the ends, in px. */
const ARC_DEPTH = 14
/** Below this many chips an arc just looks like a layout bug. */
const ARC_MIN_ITEMS = 5

export function RegionFlagRail({ regions, activeCode, onPick }: {
  regions: AvailableRegion[]
  activeCode?: string | null
  onPick: (code: string) => void
}) {
  const count = regions.length

  return (
    <div className="relative">
      {/* Moon glow behind the rail — a soft crescent light from below. */}
      <div className="moon-glow pointer-events-none absolute inset-x-0 -bottom-6 h-24" aria-hidden="true" />
      <ScrollRow label="Countries where this is available" className="-mx-1">
        {regions.map((r, i) => {
          // t runs 0 → 1 across the row; sin(t·π) is 0 at both ends and 1 in the
          // middle, so the middle sits ARC_DEPTH lower than the ends — the row
          // hangs like the lower limb of a crescent moon.
          const t = count > 1 ? i / (count - 1) : 0.5
          const dip = count >= ARC_MIN_ITEMS ? Math.round(Math.sin(t * Math.PI) * ARC_DEPTH) : 0
          const active = r.code === activeCode
          const services = r.providers.length
          return (
            <div key={r.code} className="shrink-0 pb-6" style={dip ? { transform: `translateY(${dip}px)` } : undefined}>
              <button
                type="button"
                onClick={() => onPick(r.code)}
                title={`${r.name} — ${services} ${services === 1 ? 'service' : 'services'}`}
                aria-label={`${r.name}, ${services} ${services === 1 ? 'service' : 'services'}. Open the full list.`}
                className="group flex w-14 flex-col items-center gap-1.5 focus:outline-none"
              >
                <span
                  className={`relative grid h-11 w-11 place-items-center rounded-full bg-surface-elevated ring-1 transition-all duration-200 group-hover:scale-105 group-active:scale-95 group-focus-visible:ring-2 ${
                    active ? 'ring-accent' : 'ring-zinc-700 group-hover:ring-accent'
                  }`}
                >
                  <span className="text-xl leading-none" aria-hidden="true">{r.flag}</span>
                  {/* The half-moon: a crescent highlight carved out of the badge. */}
                  <span className="moon-crescent pointer-events-none absolute inset-0 rounded-full bg-white/15" aria-hidden="true" />
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-black">
                    {services}
                  </span>
                </span>
                <span className={`text-[10px] font-bold leading-none transition-colors ${active ? 'text-accent' : 'text-text-muted group-hover:text-text-primary'}`}>
                  {r.code}
                </span>
                {/* The country NAME is moved into the tooltip label: rendering
                    the flag emoji beside the code doubled the code on Windows
                    (no color flag font → the emoji paints as its two indicator
                    letters, e.g. 🇮🇩 under "ID" reads "ID ID"). */}
              </button>
              <span className="sr-only">{r.name}</span>
            </div>
          )
        })}
      </ScrollRow>
    </div>
  )
}

export default RegionFlagRail
