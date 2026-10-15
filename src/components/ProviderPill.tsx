import { ImageWithFallback } from './ImageWithFallback'
import { tmdbImage } from '../utils/imageSizes'

// A provider pill — used by the detail page's "Available in" row and by every
// country card inside the availability modal. One renderer, two surfaces: the
// old per-surface copies drifted (one hid a failed logo with inline styles and
// left a blank gap in the pill).
export interface ProviderLike {
  provider_id: number
  provider_name: string
  logo_path: string | null
}

export function ProviderPill({ provider, link, small = false }: {
  provider: ProviderLike
  link?: string
  small?: boolean
}) {
  // `relative` is load-bearing: ImageWithFallback paints its loading skeleton
  // with `absolute inset-0`, so without a positioned ancestor that skeleton
  // escapes the pill and covers the page.
  const cls = `relative flex items-center gap-1.5 bg-white rounded-lg ${small ? 'px-3 py-1.5' : 'px-3 py-2'}`
  const inner = (
    <>
      {provider.logo_path && (
        <ImageWithFallback
          src={tmdbImage(provider.logo_path, 'logo', 'w92')}
          alt=""
          kind="logo"
          fallbackText={null}
          className={`${small ? 'w-5 h-5' : 'w-6 h-6'} rounded-md object-cover`}
        />
      )}
      <span className="text-black text-[11px] font-bold">{provider.provider_name}</span>
    </>
  )
  if (!link) return <div className={cls}>{inner}</div>
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={`Where to watch on ${provider.provider_name}`}
      className={`${cls} hover:ring-2 hover:ring-accent hover:scale-105 transition-all active:scale-95`}
    >
      {inner}
    </a>
  )
}

export default ProviderPill
