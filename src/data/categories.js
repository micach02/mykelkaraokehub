// Browse categories. Every song comes from YouTube, so a category is a
// ready-made karaoke search. The karaoke server caches results for 7 days,
// so each category costs at most one YouTube search per week for everyone.
//
// kind: 'search' (runs `query` on YouTube) | 'saved' (the TV's My Songs)
// `hideWhenEmpty` categories are left out of menus until they have songs.

export const categories = [
  { id: 'opm', label: 'OPM Hits', icon: '🇵🇭', kind: 'search', featured: true, query: 'OPM hits karaoke',
    description: 'Original Pilipino Music — the heart of myKel Karaoke.' },
  { id: 'saved', label: 'My Songs', icon: '⭐', kind: 'saved', hideWhenEmpty: true,
    description: 'Karaoke videos you saved.' },
  { id: 'love', label: 'Love Songs', icon: '💖', kind: 'search', opm: true, query: 'OPM love songs karaoke',
    description: 'Kilig, harana, and heartbreak.' },
  { id: 'rock', label: 'Pinoy Rock', icon: '🎸', kind: 'search', opm: true, query: 'Pinoy rock band karaoke',
    description: 'Band anthems to belt out together.' },
  { id: 'acoustic', label: 'Acoustic', icon: '🪕', kind: 'search', opm: true, query: 'acoustic OPM karaoke',
    description: 'Unplugged and mellow.' },
  { id: 'ballad', label: 'Ballads', icon: '🌙', kind: 'search', opm: true, query: 'OPM ballad karaoke',
    description: 'Big notes, bigger feelings.' },
  { id: 'duets', label: 'Duets', icon: '👫', kind: 'search', opm: true, query: 'OPM duet karaoke',
    description: 'Grab a partner and share the mic.' },
  { id: '80s', label: '80s', icon: '📼', kind: 'search', opm: true, query: '80s OPM karaoke',
    description: 'Hits from the 1980s.' },
  { id: '90s', label: '90s', icon: '💿', kind: 'search', opm: true, query: '90s OPM karaoke',
    description: 'The golden era of Pinoy rock.' },
  { id: '2000s', label: '2000s', icon: '📀', kind: 'search', opm: true, query: '2000s OPM karaoke',
    description: 'Band explosion and acoustic covers.' },
  { id: 'classic', label: 'Classics', icon: '🎙️', kind: 'search', opm: true, query: 'classic OPM karaoke',
    description: 'Timeless songs every Tito and Tita knows.' },
  { id: 'new', label: 'New OPM', icon: '✨', kind: 'search', opm: true, query: 'latest OPM hits karaoke',
    description: 'Fresh releases.' },
  { id: 'tagalog', label: 'Tagalog', icon: '🗣️', kind: 'search', opm: true, query: 'Tagalog songs karaoke',
    description: 'Songs sung in Filipino.' },
  { id: 'english', label: 'English Hits', icon: '🌏', kind: 'search', query: 'popular English songs karaoke',
    description: 'International karaoke staples.' },
  { id: 'videoke', label: 'Videoke Classics', icon: '📺', kind: 'search', query: 'videoke classics',
    description: 'The songs that never leave the videoke machine.' },
]
