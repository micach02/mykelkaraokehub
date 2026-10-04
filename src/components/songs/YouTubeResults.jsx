import { useId } from 'react'
import { useYouTubeSearch } from '../../hooks/useYouTubeSearch'
import { useServerStatus } from '../../hooks/useServerStatus'
import { SongGrid } from './SongGrid'
import { SongSkeletons } from '../common/Skeleton'
import { Button } from '../common/Button'
import { EmptyState } from '../common/EmptyState'

function formatTime(date) {
  return date ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
}

// Explains why YouTube search can't run, if it can't. Null when it can.
export function YouTubeSetupNotice() {
  const { error, youtubeConfigured, quotaBlocked, quotaResetsAt } = useServerStatus()
  if (error?.code === 'server-offline') {
    return <p className="notice notice--error" role="alert">{error.message}</p>
  }
  if (youtubeConfigured === false) {
    return (
      <p className="notice notice--error" role="alert">
        YouTube search isn't set up yet. Add <code>YOUTUBE_API_KEY=…</code> to the <code>.env</code> file on the computer running myKel Karaoke, then restart it.
      </p>
    )
  }
  if (quotaBlocked) {
    return (
      <p className="notice">
        Today's YouTube search limit has been reached{quotaResetsAt ? ` (it resets at about ${formatTime(quotaResetsAt)})` : ''}.
        Earlier searches and saved songs still work.
      </p>
    )
  }
  return null
}

/**
 * Karaoke versions from YouTube.
 * - mode 'live' (pass a debounced query): results appear as you type. The
 *   server answers from its cache when it can and limits live YouTube calls.
 * - mode 'full': the user asked (Enter, the button, a category).
 * If live search can't answer without spending more quota, a "Search
 * YouTube" prompt appears instead.
 */
export function YouTubeResults({ query, mode = 'full', onSubmit, layout = 'grid', title = '▶ Karaoke on YouTube' }) {
  const { searchable, results, hasResults, isLoading, isStale, derived, error, retry } = useYouTubeSearch(query, { mode })
  const { youtubeConfigured, quotaBlocked } = useServerStatus()
  const headingId = useId()
  if (!searchable) return null

  const q = query.trim()
  const canSearch = youtubeConfigured !== false && !quotaBlocked

  return (
    <section className="section youtube-results" aria-labelledby={headingId} aria-busy={isLoading}>
      <div className="section__header">
        <h2 id={headingId} className="section__title">
          {title}
          {isLoading && <span className="live-dot" aria-hidden="true" />}
        </h2>
        {hasResults && results.length > 0 && (
          <p className="section__subtitle">
            {derived && onSubmit ? (
              <>From earlier searches — <button type="button" className="link-button" onClick={onSubmit}>search YouTube for more</button>. </>
            ) : (
              'Karaoke versions only. '
            )}
            Tap ☆ to keep a song in My Songs.
          </p>
        )}
      </div>

      {isLoading && !hasResults && <SongSkeletons layout={layout === 'list' ? 'list' : 'grid'} count={layout === 'list' ? 4 : 6} label="Searching YouTube" />}

      {error && !isLoading && (
        <div className="notice notice--error youtube-results__error" role="alert">
          <span>{error.message}</span>
          {!['quota', 'not-configured'].includes(error.code) && (
            <Button size="sm" variant="secondary" onClick={retry}>Try again</Button>
          )}
        </div>
      )}

      {!hasResults && !isLoading && !error && (canSearch ? (
        onSubmit && (
          <div className="youtube-prompt">
            <p className="youtube-prompt__text">
              Look for karaoke versions of <strong>“{q}”</strong> on YouTube.
            </p>
            <Button variant="primary" icon="▶" onClick={onSubmit}>Search YouTube</Button>
            <span className="youtube-prompt__hint">or press <kbd>Enter</kbd></span>
          </div>
        )
      ) : (
        <YouTubeSetupNotice />
      ))}

      {hasResults && (results.length > 0 ? (
        <SongGrid songs={results} layout={layout} stale={isStale} label="YouTube karaoke results" />
      ) : (
        <EmptyState
          compact
          icon="🎬"
          title="No karaoke versions found on YouTube"
          description="Try the song title plus the artist, like “Buwan Juan Karlos”."
        />
      ))}
    </section>
  )
}
