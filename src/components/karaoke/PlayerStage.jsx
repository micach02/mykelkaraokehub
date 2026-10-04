import { useRef, useState } from 'react'
import { useKaraokeActions, useKaraokeState } from '../../context/KaraokeContext'
import { KaraokePlayer } from './KaraokePlayer'
import { NowPlaying } from './NowPlaying'
import { PlayerControls } from './PlayerControls'
import { RecordingBadge } from '../scoring/RecordingBadge'
import { useScoring } from '../../context/ScoringContext'
import { cx } from '../../utils/classNames'

// Connects the karaoke session to the player. Lives in the layout so the
// video keeps playing while people browse between pages.
export function PlayerStage({ isKaraokeMode, onBrowse }) {
  const state = useKaraokeState()
  const actions = useKaraokeActions()
  const scoring = useScoring()
  const stageRef = useRef(null)
  const [collapsed, setCollapsed] = useState(false)
  const nextSong = state.queue[0]?.song ?? null

  return (
    <section
      ref={stageRef}
      className={cx(
        'player-stage',
        isKaraokeMode && 'player-stage--karaoke',
        collapsed && !isKaraokeMode && 'player-stage--collapsed',
        !state.currentSong && 'player-stage--idle',
      )}
      aria-label="Karaoke player"
    >
      <KaraokePlayer
        song={state.currentSong}
        entryId={state.currentEntryId}
        autoplay={state.autoplay}
        volume={state.volume}
        isMuted={state.isMuted}
        // While scoring, the results screen comes first; the queue continues
        // from there.
        onEnded={(entryId) => scoring.handleSongEnded(entryId) || actions.songEnded(entryId)}
        onStatusChange={actions.setPlaybackStatus}
        onRegister={actions.registerPlayer}
        nextSong={nextSong}
        lastPlayedSong={state.lastPlayedSong}
        onSkip={actions.skipSong}
        onPlayAgain={actions.playSong}
        onBrowse={onBrowse}
      />

      <RecordingBadge />

      {!isKaraokeMode && (
        <div className="player-stage__bar">
          <NowPlaying song={state.currentSong} requestedBy={state.currentRequestedBy} isPlaying={state.isPlaying} />
          <PlayerControls fullscreenTarget={stageRef} />
          {state.currentSong && (
            <button
              type="button"
              className="player-stage__collapse"
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? '▾ Show video' : '▴ Hide video'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
