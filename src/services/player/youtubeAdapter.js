// Player engine backed by the official YouTube IFrame Player API.
//
// Engine interface (any future engine should match it):
//   load(song, { autoplay }) play() pause() stop() seek(seconds) setVolume(0-100)
//   getCurrentTime() getDuration() destroy()
// Handlers:
//   onStatus(status)  'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'stopped' | 'ended'
//   onError({ code, message })

import { loadYouTubeIframeApi, describePlayerError } from '../youtubeService'
import { PLAYER_CONFIG } from '../../config/appConfig'

export function createYouTubeAdapter(container, handlers) {
  let player = null
  let destroyed = false
  let volume = 100
  let stopRequested = false
  // Browsers may block autoplay with sound (e.g. the TV page was refreshed and
  // nobody has tapped it yet). If playback hasn't started after a while, say
  // "ready" so the UI shows a Start button instead of loading forever.
  let autoplayWatchdog = null
  const clearWatchdog = () => {
    window.clearTimeout(autoplayWatchdog)
    autoplayWatchdog = null
  }

  // The IFrame API replaces this element with an <iframe>. It is created
  // outside React so React never tries to reconcile it.
  const mount = document.createElement('div')
  container.appendChild(mount)

  const ready = loadYouTubeIframeApi().then(
    (YT) =>
      new Promise((resolve) => {
        if (destroyed) return
        player = new YT.Player(mount, {
          width: '100%',
          height: '100%',
          // Watch-only: the app's controls drive playback (see karaoke.css,
          // which also makes the video ignore taps and clicks).
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            fs: 0, // fullscreen is handled by the app so our controls stay visible
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              applyVolume()
              resolve(player)
            },
            onStateChange: (event) => {
              const S = YT.PlayerState
              if ([S.PLAYING, S.BUFFERING, S.PAUSED, S.ENDED].includes(event.data)) clearWatchdog()
              switch (event.data) {
                case S.PLAYING:
                  stopRequested = false
                  handlers.onStatus('playing')
                  break
                case S.PAUSED:
                  handlers.onStatus(stopRequested ? 'stopped' : 'paused')
                  break
                case S.BUFFERING:
                  handlers.onStatus('buffering')
                  break
                case S.ENDED:
                  handlers.onStatus('ended')
                  break
                case S.CUED:
                  handlers.onStatus('ready')
                  break
                default:
                  break
              }
            },
            onError: (event) => {
              clearWatchdog()
              handlers.onError(describePlayerError(event.data))
            },
          },
        })
      }),
  )

  ready.catch((error) => {
    if (!destroyed) handlers.onError({ code: 'player-init', message: error.message })
  })

  function applyVolume() {
    if (!player?.setVolume) return
    player.setVolume(volume)
    if (volume === 0) player.mute()
    else player.unMute()
  }

  return {
    kind: 'youtube',
    async load(song, { autoplay = true } = {}) {
      handlers.onStatus('loading')
      const p = await ready
      if (destroyed) return
      stopRequested = false
      clearWatchdog()
      if (autoplay) {
        p.loadVideoById(song.youtubeVideoId)
        autoplayWatchdog = window.setTimeout(() => {
          autoplayWatchdog = null
          if (!destroyed) handlers.onStatus('ready')
        }, PLAYER_CONFIG.autoplayTimeoutMs)
      } else {
        p.cueVideoById(song.youtubeVideoId)
      }
    },
    play() {
      player?.playVideo?.()
    },
    pause() {
      player?.pauseVideo?.()
    },
    stop() {
      if (!player?.pauseVideo) return
      stopRequested = true
      player.pauseVideo()
      player.seekTo(0, true)
      handlers.onStatus('stopped')
    },
    seek(seconds) {
      player?.seekTo?.(seconds, true)
    },
    setVolume(value) {
      volume = value
      applyVolume()
    },
    getCurrentTime() {
      return player?.getCurrentTime?.() ?? 0
    },
    getDuration() {
      return player?.getDuration?.() ?? 0
    },
    destroy() {
      destroyed = true
      clearWatchdog()
      try {
        player?.destroy?.()
      } catch {
        // ignore
      }
      mount.remove()
    },
  }
}
