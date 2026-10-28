import { useEffect, useState } from 'react'

// Is at least `ratio` of the element on screen? (false when it can't tell,
// e.g. no IntersectionObserver, or the element is hidden.)
export function useInView(ref, { ratio = 0.3, enabled = true } = {}) {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!enabled || !element || typeof IntersectionObserver === 'undefined') {
      setInView(false)
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= ratio),
      { threshold: [0, ratio, 1] },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, ratio, enabled])

  return inView
}
