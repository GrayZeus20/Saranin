// Per-route tab title. Screen readers announce document.title on navigation,
// so this is an a11y fix as much as a browser-history one.

import { useEffect } from 'react'

export const FALLBACK_TITLE = 'SARANIN. — Discover trending movies, TV shows, and anime'

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title.trim() || FALLBACK_TITLE
  }, [title])
}
