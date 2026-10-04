// Navigation is data-driven so desktop and mobile menus stay in sync.
export const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/opm', label: 'OPM', icon: '🇵🇭' },
  { to: '/categories', label: 'Categories', icon: '🗂️' },
  { to: '/queue', label: 'Queue', icon: '📋', showQueueCount: true },
  { to: '/karaoke', label: 'Karaoke Mode', shortLabel: 'Karaoke', icon: '🎤' },
]
