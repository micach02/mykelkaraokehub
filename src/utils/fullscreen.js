export function isFullscreenSupported() {
  return typeof document !== 'undefined' && Boolean(document.fullscreenEnabled)
}

export function getFullscreenElement() {
  return typeof document !== 'undefined' ? document.fullscreenElement : null
}

export async function enterFullscreen(element = document.documentElement) {
  if (!isFullscreenSupported() || !element?.requestFullscreen) return false
  try {
    await element.requestFullscreen()
    return true
  } catch {
    return false
  }
}

export async function exitFullscreen() {
  if (!getFullscreenElement()) return
  try {
    await document.exitFullscreen()
  } catch {
    // Already exited (e.g. the user pressed Esc).
  }
}
