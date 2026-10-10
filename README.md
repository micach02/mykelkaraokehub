# 🎤 myKelKaraokeHub

**Your Songs. Your Queue. Your Karaoke.**

myKelKaraokeHub (display name **myKel Karaoke**) is a web karaoke jukebox. Search any song, line songs up in a queue, and sing along through whatever microphone and speakers are connected to your laptop, PC, or TV. When a song ends, the next one starts on its own. Friends can scan a QR code on the TV and **add songs from their own phones**.

It's built for Filipino users first, with **OPM (Original Pilipino Music)** front and center.

> Every song is a karaoke video on YouTube, played through the official YouTube embedded player. Nothing is recorded, downloaded, or re-hosted.

---

## Features

- **Live YouTube karaoke search.** Type a song, artist, or vibe ("90s OPM love songs"), and results appear as you type, on the TV and on phones. Only karaoke, videoke, minus-one, and instrumental versions are kept, and messy titles are cleaned up ("BUWAN - Juan Carlos Labajo (HD Karaoke)" becomes **Buwan** by **Juan Karlos**). Each card shows the YouTube channel so you can tell versions apart.
- **Browse categories**: OPM Hits, Love Songs, Pinoy Rock, Acoustic, Ballads, Duets, 80s, 90s, 2000s, Classics, New OPM, Tagalog, English Hits, and Videoke Classics. Each is a ready-made YouTube search, plus one-tap **OPM artist** searches.
- **🕘 Recently sung.** Every song you pick (Play or Queue, on the TV or a phone) is remembered, newest first, for one-tap re-adding at no quota cost. Typing also matches your recent and saved songs instantly, before YouTube answers.
- **✨ Suggested for you** (rule-based, no AI service): "More from…" the artists you sang recently, plus one-tap vibe prompts such as Kilig love songs, Hugot songs, 90s Pinoy rock, and Duets for two.
- **My Songs.** Tap ☆ to save a song. Saved songs are searchable instantly and never use YouTube quota.
- **Modern design**: an aurora background, glass panels, a glowing prompt-style search box that animates while it's working, and shimmer placeholders while results load.
- **📱 Phone Remote.** The TV shows a QR code. Phones on the same Wi-Fi scan it, no app needed, and can:
  - search YouTube and add songs to the TV's queue
  - see what's playing and what's next
  - play/pause and skip. While the TV shows a song's **Karaoke Score**, the phone shows the score too, with the same "next song" countdown. Its **⏭ Next song** button works like the TV's Next Song button.
  - see **their own recently sung songs** ("Recently sung by Mika"): songs they requested that played on the TV, kept on their phone for one-tap re-adding. Other people's songs aren't listed.
  - remove songs they added
  - **invite more friends** from the 📤 Invite tab: show a QR code on their own phone for others to scan, or send the link with Share, Copy link, Messenger, Viber, WhatsApp, or Text message. On plain `http://` home-network addresses, phones often disable the built-in share sheet and clipboard, so the QR code and messaging links are the reliable options, and Copy falls back to a method that works without HTTPS.
  - **enter their name first.** After scanning, a phone shows **Join the karaoke** and asks for a name before any songs appear; the name can't be skipped or left blank. It's remembered on the phone, and the 🎤 name button changes it. Every song they add shows a **🎤 Mika** badge in the TV queue, in Now Playing and Up next (including Karaoke Mode), and on every phone. Your own songs show as **You** on your phone.
- **🎯 Karaoke Score** (optional): with **Auto-score** on (the default), scoring and recording start by themselves whenever a song starts, with no button to press. The app listens through your microphone, analyzes your voice **locally in the browser**, and when the song ends shows your final score out of 100, your stats, and your recording to play back or save. The next song plays automatically after 20 seconds. Nothing is uploaded. [How it works](#-karaoke-score).
- **Queue**: add, Play Now, remove, reorder (drag and drop, ▲/▼, or ☰ plus arrow keys), skip, clear (asks first), and duplicate protection. **The next song plays automatically.**
- **Karaoke Mode** (`/karaoke`) for a TV: maximized player, large controls, now playing and up next, a song picker, the queue, a QR card in the corner, fullscreen, and keyboard shortcuts.
- **Saved on the device**: the queue, current song, volume, My Songs, and the active room survive a refresh.
- **Mobile layout**: bottom navigation, mini player, queue bottom sheet, and a video you can hide.
- **Accessibility**: semantic landmarks, a skip link, focus rings, ARIA labels, native `<dialog>` modals, live regions, and `prefers-reduced-motion` support.

### Play Now vs. Add to Queue

| Action | Behavior |
| --- | --- |
| **▶ Play** | Starts the song right away. The existing queue is kept. If the song was waiting in the queue, it's taken out so it won't play twice. |
| **+ Queue** | Adds the song to the end of the queue. If nothing is loaded in the player, the song starts right away, as a jukebox would (`QUEUE_CONFIG.autoStartWhenIdle`). |

### Keyboard shortcuts (Karaoke Mode)

<kbd>Space</kbd>/<kbd>K</kbd> play/pause · <kbd>N</kbd> next · <kbd>F</kbd> fullscreen · <kbd>Q</kbd> queue · <kbd>A</kbd> add songs · <kbd>Esc</kbd> exit · <kbd>/</kbd> search

---

## Getting started

Requires Node.js 20 or later.

```bash
npm install
npm run dev        # app + karaoke server → http://localhost:5173
npm test           # run the tests (Vitest)
npm run build      # production build → dist/
npm start          # build, then serve the production build (also includes the karaoke server)
```

`npm run dev` and `npm start` both run the **karaoke server** inside Vite. It provides YouTube search and the phone-remote rooms on the same address and port as the app. There's nothing else to start.

### 1. YouTube API key (required for search)

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create a project, and enable **YouTube Data API v3**.
2. Under **APIs & Services → Credentials**, create an **API key**.
3. Edit the key:
   - **Application restrictions: None.** The karaoke server calls YouTube itself, so browser-website restrictions would block it. The key never leaves your computer.
   - **API restrictions:** restrict the key to **YouTube Data API v3**.
4. Copy `.env.example` to `.env` and paste the key:

```bash
YOUTUBE_API_KEY=AIza...
```

5. Restart `npm run dev`.

> Upgrading from an earlier version? The variable used to be `VITE_YOUTUBE_API_KEY`. The old name still works, but `YOUTUBE_API_KEY` keeps the key out of the browser build.

### 2. Phone remote

1. Open the app on the TV/laptop. The **landing page shows the room's QR code above the search box**; the room starts by itself. Tap the QR card for a bigger code and share links. The **📱 Phone Remote** button in the header and the corner card in Karaoke Mode work too. If you end the room, it stays ended until you start a new one.
2. Friends scan the QR code with their phone camera. Phones must be on the **same Wi-Fi** as the laptop.
3. **Windows:** the first time, Windows Firewall asks whether Node.js may use the network. Allow **Private networks**. If you dismissed that prompt, allow Node.js in *Windows Security → Firewall → Allow an app through firewall*.

The terminal also prints the address phones use (e.g. `http://192.168.1.8:5173`). The QR code uses that address automatically, even when the TV page is open at `localhost`.

---

## 🎯 Karaoke Score

An optional, AI-style singing score. It's **for fun and practice, not professional vocal assessment.**

### How to use it

Scoring is controlled by one switch under the player: **🎤 Auto-score** (on by default, remembered on this device). There's no button to press. Scoring and recording start by themselves when a song plays.

1. Play any song.
2. **First time only:** the app explains what it does with the microphone. Press **Allow Microphone** and accept the browser's prompt.
3. **First time only:** a 3-second **microphone check**. Sing or talk. It reports *GOOD*, *too quiet*, *no sound*, or *too loud / clipping* and measures your room's background noise. If it says **GOOD**, it moves on by itself after a second; otherwise you choose **Try again** or **Continue anyway**. Then **3 – 2 – 1**, and the song restarts from the beginning.
4. **From then on**, every song that starts, from the queue, a phone, or **Next Song** on the results, is scored and recorded **straight away**, with no pause or countdown.
5. Sing. Nothing gets in the way of the lyrics: no live score while you sing, just a small **● Recording** badge in the corner of the video, so everyone knows the mic is on. The recording pauses when the song is paused.
6. When the song ends, a **score counter sound** plays (it follows the app's volume and Mute; set `resultsSoundVolume` in `scoringConfig.js` to `0` to turn it off) and you get the results, kept short: your **final score** out of 100 with its grade (👑 LEGENDARY 95+, 🌟 EXCELLENT 90+, 🔥 GREAT 80+, 👏 GOOD 70+, 🎶 KEEP SINGING 60+, 🎤 WARM UP) and personal best, plus your **stats**: notes sung, notes hit, perfect notes, best streak, average pitch (and timing) deviation, vocal range, and time singing. Underneath, **▶ your recording** to play back, and **⬇ Save recording** to keep it as a file. The **next song plays automatically after 20 seconds** (`resultsAutoNextSeconds` in `scoringConfig.js`). Tap the results to keep reading them, or choose **Sing Again**, **Next Song**, or **Back to Songs**.
7. **Nobody sang?** Then there are no results: the next song just starts, with a short note that there was no singing to score.

While you sing:

- **⏸ Pause** pauses the scoring too.
- **⏹ Stop, then ▶ Play** drops the take and starts a fresh one from the top. Use it to sing a song again.
- **⏭ Skip** stops the scoring for that song without a score. The queue carries on as normal.

The switch:

- **Turning it on mid-song** scores that song: the song restarts from the top after a 3-2-1. If the song has only just started, scoring begins right away.
- **Turning it off** means songs just play.
- **Pressing Not now** on the mic screen, or a microphone error, turns it off, so you aren't asked on every song.
- **A song resumed halfway**, for example after a refresh, isn't scored from the middle. Use ⏹ then ▶.
- **Where the mic can't be used**, such as the `http://192.168…` address, the switch is dimmed, and tapping it explains why.

### Melody score vs. Voice score

YouTube doesn't provide the notes of a song, so the app can't know what you *should* be singing in a YouTube video. Scores therefore come in two modes:

| | **🎯 Melody score** | **🎤 Voice score** |
| --- | --- | --- |
| When | The song has a **reference melody** (the expected notes, with timing) | Every other song, which today means **all YouTube songs** |
| Pitch | Your note vs. the expected note (octaves don't count against you, so men and women can sing the same song) | How close each sung note is to a real musical note (in tune) |
| Timing | When you started each note vs. the melody | Not scored. It's shown as "Needs a melody guide" rather than guessed |
| Weights | Pitch 50%, Timing 20%, Stability 15%, Energy 10%, Consistency 5% | Pitch 55%, Stability 25%, Energy 12%, Consistency 8% |

Songs with a melody show a **🎯 Melody scoring** chip. Two public-domain **practice tracks** on Home (*Do-Re-Mi Warm-up* and *Twinkle, Twinkle, Little Star*) have melodies, play through the browser instead of YouTube, and show the notes on a scrolling piano roll. The guide tone is muted while you're scored, so it's your voice, not the speaker, that gets judged.

### How the score is calculated

About 30 times a second, the app reads 2,048 samples from the microphone and works out:

- **Pitch**: the fundamental frequency, with [pitchy](https://github.com/ianprime0509/pitchy) (McLeod Pitch Method). Its *clarity* value is the confidence of each reading.
- **Voice activity**: each moment is *silence*, *noise*, or *voice*, using loudness above the measured room noise, clarity ≥ 0.88, and a 70–1100 Hz singing range. Silence and noise are skipped, never scored as wrong notes, so instrumental breaks don't cost points.

Then, per note:

| Component | What it measures |
| --- | --- |
| **Pitch** | The median distance from the target in cents (100 cents = one semitone). Melody score: within 20 cents is perfect, 50 is good, 100 is acceptable, and 300 or more scores zero. Voice score is stricter, because you're judged against the nearest note. |
| **Timing** | When the expected pitch first appears vs. when the note starts: within 0.1 s is excellent, 0.2 s good, 0.4 s fair. A repeated note (e.g. "Twin-kle") only counts if you re-articulate it. Sung smoothly, it can't be timed, so it isn't. |
| **Stability** | The wobble within each note, ignoring the start and end of the note. Normal vibrato (±35 cents) isn't penalized. |
| **Energy** | Whether you sang at a healthy level (not too quiet), and how often the mic clipped. |
| **Consistency** | Whether the first and last parts of the song were sung about as well as each other. |

If a component can't be measured, the total is re-weighted over the rest. With less than 2 seconds of singing, you get "We couldn't hear enough singing" instead of a misleadingly low score. All thresholds and weights are in [`src/config/scoringConfig.js`](src/config/scoringConfig.js).

### Microphone and privacy

- The browser asks for permission **only when a song starts with Auto-score on** (or when you turn Auto-score on), never on page load.
- Your voice is **analyzed locally in your browser and is not uploaded**. The server never receives audio.
- **The recording stays on this device.** It's kept in the browser's memory only until the results close. **⬇ Save recording** downloads it to your own device as a .webm file. The score comes from the live analysis, not from the file.
- The microphone is released as soon as scoring finishes or stops.
- Scores and personal bests are saved on this device only (the last 20 performances, plus your best score per song).

> **The microphone needs a secure page.** Browsers only allow the mic on `https://` or `http://localhost`. On the TV computer, open **http://localhost:5173**. On the `http://192.168…` Wi-Fi address (as phones use it), the button explains why scoring isn't available there. The phone remote doesn't do scoring.

### Adding a reference melody

Melody data lives in [`src/data/referenceMelodies/`](src/data/referenceMelodies/). Each melody is a list of `{ start, end, midi }` notes in seconds, keyed by `songId` (`yt-<videoId>` for YouTube songs), with an optional `offsetSeconds` to line up with a specific video. [`buildNotes.js`](src/data/referenceMelodies/buildNotes.js) lets you write the melody in beats instead.

**Only add melodies you have the rights to** (public domain, your own, or licensed). This project doesn't include copyrighted melodies. `referenceMelodyService.getReferenceMelody(songId)` is the single entry point, so a licensed melody API can be plugged in later without changing the scoring engine.

### Testing the score yourself

- **Real voice:** on the TV computer, open `http://localhost:5173` and choose **Do-Re-Mi Warm-up** on Home (Auto-score on) and sing along with the piano roll. Then try a YouTube song for a Voice score.
- **Headphones help:** with speakers, the music reaches the mic. Echo cancellation and the voice filter reduce this, but headphones (or a mic held close) give a cleaner score.
- **Automated:** `npm test` covers the music math, pitch detection on synthetic tones, voice activity, perfect/slightly-off/out-of-tune/octave/vibrato/silent performances, partial songs, personal bests, and the full UI flow with a fake microphone.

---

## Deploy online (GitHub Pages + Render)

The app can also run on the internet, so it works without a computer at home:

| Part | Where | What it does |
| --- | --- | --- |
| Web app | **GitHub Pages**: https://micach02.github.io/mykelkaraokehub/ | The pages you see. Built and published automatically on every push to `main` ([workflow](.github/workflows/deploy-pages.yml)). |
| Karaoke server | **Render** (free plan): https://mykelkaraokehub.onrender.com | YouTube search (holds the API key) and phone-remote rooms. Runs `node server/index.js` ([render.yaml](render.yaml)). |

**One-time setup**

1. **Render:** sign in at [render.com](https://render.com) with GitHub. Choose **New → Blueprint**, pick this repository, and enter your `YOUTUBE_API_KEY` when asked. It deploys the server. Note its address; if it isn't `https://mykelkaraokehub.onrender.com`, do step 3.
2. **GitHub Pages:** in the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**. Then re-run the latest **Deploy to GitHub Pages** workflow (**Actions** tab), or push any change.
3. *(Only if the Render address differs)*: open **Settings → Secrets and variables → Actions → Variables** and add `API_BASE_URL` = your Render address. Then re-run the workflow.

**How it differs from running at home**

- **Phones join from anywhere.** The QR code links to the public site, so the phone doesn't need the same Wi-Fi.
- **Scoring works on any device with a mic**, because the site uses HTTPS.
- **The free server sleeps after about 15 minutes idle.** The first visit then takes about a minute to wake it ("Can't reach the karaoke server… waking up"), and open rooms reset. The TV starts a new room by itself; scan the new QR code.
- **Limits to protect your quota:** only the Pages site may call the server from a browser (`ALLOWED_ORIGINS`). Each visitor (IP address) gets at most 200 YouTube searches and 20 new rooms per hour, on top of the daily quota guard.
- **The search cache resets** when the server restarts or redeploys.

---

## YouTube quota

YouTube gives each key **10,000 units per day**, and each search costs **100**, so about **100 searches a day**. The app is built around that:

| What happens | Uses quota? |
| --- | --- |
| Typing: matching your recent and saved songs | No |
| Typing: live results for something anyone searched in the last 7 days, or that earlier results already cover ("kathang" → "kathang isip") | No |
| Typing: anything else (after a short pause, 3+ characters) | Yes, one search, up to **60 live searches per day** (`liveSearchesPerDay` in `server/youtubeSearch.js`). After that, typing shows a **Search YouTube** button instead. |
| Pressing <kbd>Enter</kbd> / **Search YouTube** / a vibe or artist chip / opening a category for the first time this week | Yes, one search (never limited by the live budget) |
| Repeating any search from the last 7 days, **from any device** (shared server cache in `.cache/`) | No |
| Playing, queueing, saving songs, and phone remote actions | No |

When the quota runs out, the app says so and stops calling YouTube until it resets (midnight Pacific Time). My Songs and earlier searches keep working.

---

## Architecture

```
TV / laptop browser                      Phones (same Wi-Fi)
React app (player + queue)               /remote/:code (search + add)
   │   ▲                                    │   ▲
   │   │ SSE "command"                      │   │ SSE "state"
   ▼   │                                    ▼   │
┌──────────────────── karaoke server (inside Vite) ─────────────────────┐
│  /api/youtube/search  → YouTube Data API v3 (key in .env) + 7-day cache │
│  /api/rooms/...       → rooms: phones POST commands, TV POSTs state     │
└─────────────────────────────────────────────────────────────────────────┘
```

- **The TV is the source of truth.** Phone commands (`ADD_TO_QUEUE`, `REMOVE_FROM_QUEUE`, `SKIP_SONG`, `TOGGLE_PLAY`) go to the TV, which applies them to its own queue through the same reducer actions the local UI uses, then publishes a snapshot back to the phones.
- **Transport**: HTTP POST to send, Server-Sent Events to receive. It needs no extra dependencies and reconnects automatically after Wi-Fi hiccups. If the server restarts, the TV opens a new room automatically and tells you to share the new QR code.
- **Security**: the TV needs a secret host token to publish its queue. Phones can only send the four commands above, with validated songs (real 11-character YouTube IDs, known fields only). Phones can only remove songs they added. The API key stays on the server.
- **Player**: the official YouTube IFrame API, behind a small engine interface. YouTube's own control bar and keyboard shortcuts are off; the app's controls and phone remotes run playback. The video itself stays **unlocked** by default, so taps reach YouTube (for example its **Skip** button on ads). **🔒 Lock video** (top-left of the video) makes it watch-only: taps do nothing (no accidental pausing, YouTube links, or suggested videos), except in the bottom-right corner, where YouTube's ad Skip button appears. The lock is remembered on the device until **Unlock**. The app can't skip or block ads itself (YouTube doesn't allow it), and ads without a Skip button must play out. If a browser blocks autoplay (e.g. the TV was refreshed and nobody has tapped it yet), a **▶ Play** button appears instead of loading forever.
- **Scoring**: the microphone is analyzed in the browser (Web Audio API + [pitchy](https://github.com/ianprime0509/pitchy)). Nothing about it touches the server. See [Karaoke Score](#-karaoke-score).

### Project structure

```
server/                      karaoke server (Node, no framework)
├── vitePlugin.js            runs the API inside `vite` / `vite preview`
├── api.js                   HTTP routes
├── youtubeSearch.js         YouTube search, karaoke filter, shared cache, quota guard
├── rooms.js                 rooms, command validation, SSE relay
├── network.js               Wi-Fi addresses for the QR code
└── http.js                  JSON/SSE helpers
src/
├── App.jsx                  routes: TV app + /remote/:code
├── config/                  appConfig.js (brand, queue/player/search/room settings), domIds.js,
│                            scoringConfig.js (scoring weights, thresholds, grades)
├── data/                    categories.js (browse searches), artists.js (OPM artists + aliases),
│                            practiceSongs.js, referenceMelodies/ (public-domain melodies)
├── services/
│   ├── apiClient.js         fetch wrapper for /api
│   ├── youtubeService.js    search via the server, IFrame API loader
│   ├── roomService.js       rooms: create, events, commands, identity
│   ├── libraryService.js    My Songs
│   ├── songService.js       My Songs search, categories
│   ├── storageService.js    the only localStorage access
│   ├── lyricsService.js     future synced-lyrics interface
│   ├── scoringHistoryService.js   scores + personal bests (this device)
│   ├── player/              youtubeAdapter.js, practiceAdapter.js (Web Audio practice tracks)
│   └── scoring/             voice scoring, all in the browser:
│       ├── audioAnalysisProvider.js   microphone → Web Audio analyser → frames (+ local recording)
│       ├── pitchAnalyzer.js           pitchy pitch detection, pitch score
│       ├── voiceActivityDetector.js   silence / noise / voice
│       ├── microphoneCalibration.js   mic check + room noise
│       ├── noteMatcher.js             frames → judged notes (melody or voice mode)
│       ├── timingAnalyzer.js, stabilityAnalyzer.js, energyAnalyzer.js
│       ├── scoringEngine.js           combines everything into the score
│       ├── scoringSession.js          one take: song clock, frames, final score
│       ├── referenceMelodyService.js  getReferenceMelody(songId)
│       └── musicMath.js
├── context/                 KaraokeContext + karaokeReducer (queue), RoomContext (TV host), ScoringContext, ToastContext
├── hooks/                   useQueue, useKaraokePlayer, useYouTubeSearch, useRemoteRoom, useScoreHistory, …
├── components/
│   ├── layout/ songs/ karaoke/ common/
│   ├── scoring/             Auto-score switch, permission, mic check, countdown, ● Recording badge, piano roll, results (score, stats, recording)
│   ├── room/                RoomButton, RoomPanel, RoomQrCard, QrCode
│   └── remote/              phone UI: RemoteNowPlaying, RemoteSearch, RemoteQueue, …
├── pages/                   Home, OPM, Categories, QueuePage, Karaoke, Remote, NotFound
├── styles/
└── utils/                   karaokeTitle.js + artistLookup.js (shared with the server)
```

### API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/status` | YouTube setup/quota status, Wi-Fi addresses |
| GET | `/api/youtube/search?q=&mode=` (`live` / `full` / `cache`) | Karaoke search (`live` = as you type, budgeted; `cache` never spends quota) |
| GET | `/api/youtube/recent` | Recent searches (free to repeat) |
| POST | `/api/rooms` | Create a room → `{ code, hostToken }` |
| GET | `/api/rooms/:code` | Room info (TV online? phones connected?) |
| GET | `/api/rooms/:code/events?role=host&token=…` / `?role=remote` | SSE stream |
| POST | `/api/rooms/:code/state` | TV publishes its queue (`X-Host-Token` header) |
| POST | `/api/rooms/:code/commands` | Phone sends a command |

---

## Testing

`npm test` runs **134 tests**. YouTube and the microphone are never used: the tests use fake responses, a fake karaoke server, a fake player, and a fake microphone.

- **Server**: karaoke filtering and title cleanup (with artist aliases), the shared cache (including saving to disk), the quota guard, key errors, rooms and command validation, and a real HTTP + SSE round trip (phone command → TV stream, TV state → phone stream).
- **Queue logic**: Play Now, add, duplicates, auto-start, remove, reorder, skip, song ended, stale events, clear, volume, restore, requester tracking, and dropping old placeholder songs.
- **TV app**: search on Enter only (typing uses free lookups), adding and duplicates, queue management, **automatic next song**, restore without autoplay, categories, My Songs, the "not set up" notice, and Karaoke Mode.
- **Karaoke Score**:
  - the engine: pitch detection on synthetic tones; scores for perfect, slightly off, out-of-tune, octave, vibrato, silent, noisy, and partly sung performances; repeated-note timing; and mic calibration
  - the session: song clock, pause, scoring a whole song or part of one
  - personal bests
  - the full flow with a fake microphone: Auto-score (first song, next songs, Stop → Play, "Not now", off, turning it on mid-song), permission, mic check, countdown, results, the auto-next countdown, Next Song, Sing Again, songs nobody sang, skip mid-song, a blocked microphone, and unsupported browsers
- **Phone remote**: creating a room with the QR code and Wi-Fi URL; TV applying phone commands (only removing the phone's own songs); TV publishing state; the phone's required name (join screen), saved songs, search and add, playback controls, queue, duplicate blocking, and the room-ended and TV-offline states.

---

## Roadmap

### Phase 2
- ~~Shared karaoke rooms~~ ✅
- ~~QR room joining~~ ✅
- ~~Phone remote~~ ✅
- ~~Synchronized queue~~ ✅
- ~~Favorites~~ ✅ (My Songs, per device)
- User accounts
- Recently played
- Rooms over the internet (not only the same Wi-Fi)
- Cloud song lists (My Songs shared across devices)

### Phase 3
- Song requests and voting
- ~~Singer names~~ ✅
- Room host controls (e.g. turn off phone skipping)
- ~~Karaoke scoring~~ ✅ (Melody and Voice scores, personal bests)
- Licensed reference melodies for popular songs (Melody score for YouTube songs)
- Multiple singers, song history, leaderboard

### Phase 4
- Subscriptions, business and karaoke-bar accounts, venue management, analytics, premium features

---

## Known limitations

- **Phones need the same Wi-Fi as the TV's computer.** Some public, hotel, or office Wi-Fi networks block devices from reaching each other ("client isolation"). Rooms over the internet would need a hosted server.
- **About 100 YouTube searches per day per key.** The shared cache, My Songs, and categories reduce how many you need. Google can raise the quota on request.
- **The karaoke filter is keyword-based.** It can occasionally let through a non-karaoke video or miss an oddly titled karaoke one.
- **Some videos block embedding or are region-locked.** The player shows an error and skips to the next song after 8 seconds.
- **Rooms live in the server's memory.** Restarting `npm run dev` ends them, and the TV starts a new room automatically.
- **Anyone on the Wi-Fi who has the room code can add songs.** That suits a home party; venues would want host controls (Phase 3).
- **Autoplay:** after a refresh, the TV may wait for a tap on **▶ Play**, because browsers block autoplay with sound until you interact with the page. Phone-added songs then play automatically.
- **Personal use.** Public performance (karaoke bars) needs proper music licensing.

### Karaoke Score limitations

- **For entertainment and practice only.** It isn't professional vocal assessment.
- **YouTube songs get a Voice score.** Without a reference melody, the app can tell whether you're *in tune*, but not whether you're singing the *right notes* or on time. A fully accurate score needs a licensed melody for each song.
- **The microphone needs `https://` or `http://localhost`.** Use the TV computer at `http://localhost:5173`. The Wi-Fi address (`http://192.168…`) can't use the mic.
- **Background music can leak into the mic.** Echo cancellation and the voice filter help, but loud speakers near the mic can still affect the score. Headphones or a close mic work best.
- **Microphones differ.** Built-in laptop mics are noisier than headsets or USB mics. The mic check adapts to the room, but not perfectly.
- **Bluetooth headsets and speakers add delay,** which can make timing look *late*. Adjust `inputLatencyMs` in `scoringConfig.js` (default 40 ms).
- **Browsers differ.** It was tested in Chrome. Edge, Firefox, and Safari support the same Web Audio features, but their microphone processing differs, so scores can vary slightly. Browsers without microphone support show "Karaoke scoring unavailable".
- **Rap, spoken parts, and whispering** have little steady pitch. They're skipped like silence, so a mostly spoken song may end with "We couldn't hear enough singing".

---

## Credits

- Score counter sound (`src/assets/sounds/mixkit-score-casino-counter-1998.wav`): "Score casino counter" from [Mixkit](https://mixkit.co/free-sound-effects/), used under the Mixkit Sound Effects Free License.
