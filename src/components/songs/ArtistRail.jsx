import { cx } from '../../utils/classNames'

// One-tap artist searches as round "avatar" buttons (initials on a colour
// picked from the name, so each artist always looks the same).

export function artistInitials(name) {
  return name
    .replace(/&/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

function artistHue(name) {
  let hue = 7
  for (const ch of name) hue = (hue * 31 + ch.charCodeAt(0)) % 360
  return hue
}

// wrap: rows of avatars instead of one sideways-scrolling line.
export function ArtistRail({ artists, onSelect, label, wrap = false }) {
  if (!artists.length) return null
  return (
    <div className={cx('artist-rail', wrap && 'artist-rail--wrap')} role="group" aria-label={label}>
      {artists.map((name) => (
        <button key={name} type="button" className="artist-chip" onClick={() => onSelect(name)}>
          <span className="artist-chip__avatar" style={{ '--hue': artistHue(name) }} aria-hidden="true">
            {artistInitials(name)}
          </span>
          <span className="artist-chip__name">{name}</span>
        </button>
      ))}
    </div>
  )
}
