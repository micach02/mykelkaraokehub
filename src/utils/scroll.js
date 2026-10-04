// Scrolls the page back to the top (where the player is). Smooth, unless the
// viewer prefers reduced motion.
export function scrollToTop() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}
