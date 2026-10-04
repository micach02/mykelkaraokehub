// Detailed statistics. Only values that could be measured are shown.
export function PerformanceStats({ result }) {
  const s = result.statistics
  const melody = result.mode === 'melody'
  const stats = [
    melody
      ? { icon: '🎵', label: 'Notes sung', value: `${s.notesAttempted} of ${s.totalNotes}` }
      : { icon: '🎵', label: 'Notes sung', value: s.notesAttempted },
    { icon: '✅', label: melody ? 'Notes hit' : 'In-tune notes', value: s.notesHit },
    { icon: '🎯', label: 'Perfect notes', value: s.perfectNotes },
    { icon: '🔥', label: 'Best streak', value: s.longestStreak },
    s.averagePitchDeviation != null && { icon: '📏', label: 'Avg. pitch deviation', value: `${s.averagePitchDeviation} cents` },
    melody && s.averageTimingDeviation != null && {
      icon: '⏱',
      label: 'Avg. timing deviation',
      value: `${Math.round(s.averageTimingDeviation * 1000)} ms${s.timingTendency > 0.05 ? ' (late)' : s.timingTendency < -0.05 ? ' (early)' : ''}`,
    },
    s.lowestNote && s.highestNote && { icon: '🎼', label: 'Vocal range', value: `${s.lowestNote} – ${s.highestNote}` },
    { icon: '🎙', label: 'Time singing', value: `${s.voiceSeconds}s` },
  ].filter(Boolean)

  return (
    <dl className="performance-stats">
      {stats.map((stat) => (
        <div key={stat.label} className="performance-stats__item">
          <dt><span aria-hidden="true">{stat.icon}</span> {stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}
