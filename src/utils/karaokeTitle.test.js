import { describe, expect, it } from 'vitest'
import { cleanKaraokeTitle, isLikelyKaraoke, splitTitleAndArtist, tidyCase } from './karaokeTitle'
import { findKnownArtist } from './artistLookup'

describe('karaoke titles', () => {
  it('recognizes karaoke versions and rejects originals', () => {
    expect(isLikelyKaraoke('Buwan - Juan Karlos (Karaoke Version)')).toBe(true)
    expect(isLikelyKaraoke('Harana | VIDEOKE')).toBe(true)
    expect(isLikelyKaraoke('Tadhana (Minus One)')).toBe(true)
    expect(isLikelyKaraoke('Kathang Isip', 'Sing King Karaoke')).toBe(true)
    expect(isLikelyKaraoke('Buwan (Official Music Video)', 'Juan Karlos')).toBe(false)
    expect(isLikelyKaraoke('Buwan (Lyrics)', 'Lyrics Hub')).toBe(false)
  })

  it('strips karaoke noise from titles', () => {
    expect(cleanKaraokeTitle('Buwan - Juan Karlos (Karaoke Version)')).toBe('Buwan - Juan Karlos')
    expect(cleanKaraokeTitle('Mundo | IV of Spades | Videoke HD')).toBe('Mundo | IV of Spades')
    expect(cleanKaraokeTitle('KARAOKE Harana - Parokya ni Edgar [HD]')).toBe('Harana - Parokya ni Edgar')
    expect(cleanKaraokeTitle('Tadhana 【Minus One】')).toBe('Tadhana')
    expect(cleanKaraokeTitle('Kathang Isip (Acoustic)')).toBe('Kathang Isip (Acoustic)')
  })

  it('splits title and artist when the artist is known, in either order', () => {
    expect(splitTitleAndArtist('Buwan - Juan Karlos', findKnownArtist)).toEqual({ title: 'Buwan', artist: 'Juan Karlos', isOPM: true })
    expect(splitTitleAndArtist('Ben & Ben - Maybe The Night', findKnownArtist)).toEqual({ title: 'Maybe The Night', artist: 'Ben&Ben', isOPM: true })
    expect(splitTitleAndArtist('BUWAN - Juan Carlos Labajo', findKnownArtist)).toEqual({ title: 'BUWAN', artist: 'Juan Karlos', isOPM: true })
    expect(splitTitleAndArtist('Buwan by juan karlos', findKnownArtist)).toEqual({ title: 'Buwan', artist: 'Juan Karlos', isOPM: true })
    expect(splitTitleAndArtist('Mundo | IV of Spades', findKnownArtist)).toEqual({ title: 'Mundo', artist: 'IV of Spades', isOPM: true })
    expect(splitTitleAndArtist('Mundo | Unknown Band', findKnownArtist)).toBeNull()
    expect(splitTitleAndArtist('Just A Title', findKnownArtist)).toBeNull()
  })

  it('turns ALL-CAPS titles into title case, leaving mixed case alone', () => {
    expect(tidyCase('BUWAN')).toBe('Buwan')
    expect(tidyCase('ANG HULING EL BIMBO')).toBe('Ang Huling El Bimbo')
    expect(tidyCase('SB19')).toBe('SB19')
    expect(tidyCase('IV of Spades')).toBe('IV of Spades')
  })
})
