import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'install-dismissed'

/** Install-to-home-screen state: Android/desktop Chrome get a real prompt, iOS gets instructions. */
export function useInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
  )
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault() // we show our own button instead of the mini-infobar
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const ua = navigator.userAgent
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)

  const install = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferred(null)
  }, [deferred])

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  return {
    installed,
    canPrompt: !!deferred,
    ios,
    /** Worth offering: not installed yet, and we either have a prompt or can explain the iOS steps */
    available: !installed && (!!deferred || ios),
    dismissed,
    install,
    dismiss,
  }
}

export type InstallApi = ReturnType<typeof useInstall>
