import { useCallback, useEffect, useState } from 'react'

// "Install app": browsers that support it (Chrome/Edge on Android, desktop,
// Android TV) fire beforeinstallprompt; we keep it and show our own button.
// iPhone/iPad: Share → Add to Home Screen (no prompt to show).
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null)

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault()
      setPromptEvent(event)
    }
    const onInstalled = () => setPromptEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!promptEvent) return
    promptEvent.prompt()
    await promptEvent.userChoice.catch(() => null)
    setPromptEvent(null) // a prompt can only be used once
  }, [promptEvent])

  return { canInstall: Boolean(promptEvent), install }
}
