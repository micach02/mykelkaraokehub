import { useEffect } from 'react'
import { BRAND } from '../config/appConfig'

export function useDocumentTitle(pageTitle) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · ${BRAND.appName}` : `${BRAND.appName} — ${BRAND.tagline}`
  }, [pageTitle])
}
