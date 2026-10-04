// Sharing helpers that work on a home network over plain http://, where
// browsers often disable navigator.share and navigator.clipboard (both need
// HTTPS). Each helper falls back to something that still works.

export function canNativeShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

// Opens the phone's share sheet. Returns 'shared' | 'cancelled' | 'unavailable'.
export async function nativeShare({ title, text, url }) {
  if (!canNativeShare()) return 'unavailable'
  try {
    await navigator.share({ title, text, url })
    return 'shared'
  } catch (error) {
    return error?.name === 'AbortError' ? 'cancelled' : 'unavailable'
  }
}

// Copies text. Uses the Clipboard API when allowed, otherwise the older
// select-and-copy trick (works on http:// too). Returns true on success.
export async function copyText(text) {
  if (typeof window !== 'undefined' && window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the fallback.
    }
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand?.('copy') ?? false
  } catch {
    ok = false
  }
  textarea.remove()
  return ok
}

// Links into messaging apps popular in the Philippines, plus SMS.
export function messagingLinks({ text, url }) {
  const message = `${text} ${url}`
  return [
    { id: 'messenger', label: 'Messenger', icon: '💬', href: `fb-messenger://share/?link=${encodeURIComponent(url)}` },
    { id: 'viber', label: 'Viber', icon: '📞', href: `viber://forward?text=${encodeURIComponent(message)}` },
    // wa.me opens the WhatsApp app on phones (WhatsApp Web elsewhere).
    { id: 'whatsapp', label: 'WhatsApp', icon: '🟢', href: `https://wa.me/?text=${encodeURIComponent(message)}` },
    // "sms:?&body=" works on both iPhone and Android.
    { id: 'sms', label: 'Text message', icon: '✉️', href: `sms:?&body=${encodeURIComponent(message)}` },
  ]
}
