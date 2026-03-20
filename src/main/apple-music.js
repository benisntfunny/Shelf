const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

const ARTWORK_PATH = '/tmp/shelf-album-art.jpg'

function runOsascript(script) {
  return new Promise((resolve) => {
    exec(`osascript -e '${script}'`, { timeout: 5000 }, (err, stdout) => {
      if (err) {
        if (err.killed || err.signal) {
          console.error('[apple-music] osascript timed out')
        }
        return resolve(null)
      }
      resolve(stdout.trim())
    })
  })
}

async function getAlbumArt() {
  try {
    const script = `
tell application "Music"
  set artData to raw data of artwork 1 of current track
  set artFile to POSIX file "${ARTWORK_PATH}"
  set fRef to open for access artFile with write permission
  set eof fRef to 0
  write artData to fRef
  close access fRef
end tell
`.replace(/\n/g, '\\n')

    await new Promise((resolve, reject) => {
      exec(`osascript -e '${script}'`, { timeout: 5000 }, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })

    if (fs.existsSync(ARTWORK_PATH)) {
      const buf = fs.readFileSync(ARTWORK_PATH)
      if (buf.length > 0) {
        const base64 = buf.toString('base64')
        return `data:image/jpeg;base64,${base64}`
      }
    }
    console.error('[apple-music] artwork file empty or missing')
    return null
  } catch (e) {
    console.error('[apple-music] getAlbumArt failed:', e.message)
    return null
  }
}

async function getNowPlaying() {
  try {
    const state = await runOsascript('tell application "Music" to player state as string')
    if (!state || state === 'stopped') {
      return { playing: false, track: '', artist: '', album: '', artwork: null, position: 0, duration: 0 }
    }

    const [track, artist, album, position, duration, artwork] = await Promise.all([
      runOsascript('tell application "Music" to name of current track'),
      runOsascript('tell application "Music" to artist of current track'),
      runOsascript('tell application "Music" to album of current track'),
      runOsascript('tell application "Music" to player position'),
      runOsascript('tell application "Music" to duration of current track'),
      getAlbumArt(),
    ])

    return {
      playing: state === 'playing',
      track: track || '',
      artist: artist || '',
      album: album || '',
      artwork,
      position: parseFloat(position) || 0,
      duration: parseFloat(duration) || 0,
    }
  } catch (e) {
    console.error('[apple-music] getNowPlaying failed:', e.message)
    return { playing: false, track: '', artist: '', album: '', artwork: null, position: 0, duration: 0 }
  }
}

async function musicCommand(cmd) {
  const commands = {
    play: 'tell application "Music" to play',
    pause: 'tell application "Music" to pause',
    next: 'tell application "Music" to next track',
    previous: 'tell application "Music" to previous track',
    playpause: 'tell application "Music" to playpause',
  }
  if (commands[cmd]) {
    await runOsascript(commands[cmd])
  }
}

async function getPlaylists() {
  try {
    const result = await runOsascript('tell application "Music" to get name of every playlist')
    if (!result) return []
    return result.split(', ').map((n) => n.trim()).filter(Boolean)
  } catch (e) {
    console.error('[apple-music] getPlaylists failed:', e.message)
    return []
  }
}

async function getPlaylistTracks(playlistName) {
  try {
    const escaped = playlistName.replace(/"/g, '\\"')
    const script = `
tell application "Music"
  set pl to playlist "${escaped}"
  set output to ""
  repeat with t in tracks of pl
    set output to output & name of t & "|||" & artist of t & "|||" & (duration of t as string) & "\\n"
  end repeat
  return output
end tell
`.replace(/\n/g, '\\n')

    const result = await new Promise((resolve) => {
      exec(`osascript -e '${script}'`, { timeout: 15000 }, (err, stdout) => {
        if (err) {
          console.error('[apple-music] getPlaylistTracks failed:', err.message)
          return resolve(null)
        }
        resolve(stdout.trim())
      })
    })

    if (!result) return []
    return result
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [name, artist, duration] = line.split('|||')
        return { name: (name || '').trim(), artist: (artist || '').trim(), duration: parseFloat(duration) || 0 }
      })
  } catch (e) {
    console.error('[apple-music] getPlaylistTracks failed:', e.message)
    return []
  }
}

async function playTrack(name, artist) {
  try {
    const escapedName = name.replace(/"/g, '\\"')
    const escapedArtist = artist.replace(/"/g, '\\"')
    const script = `tell application "Music"
set results to (every track whose name is "${escapedName}" and artist is "${escapedArtist}")
if results is not {} then play item 1 of results
end tell`.replace(/\n/g, '\\n')

    await new Promise((resolve) => {
      exec(`osascript -e '${script}'`, { timeout: 5000 }, (err) => {
        if (err) console.error('[apple-music] playTrack failed:', err.message)
        resolve()
      })
    })
  } catch (e) {
    console.error('[apple-music] playTrack failed:', e.message)
  }
}

module.exports = { getNowPlaying, musicCommand, getPlaylists, getPlaylistTracks, playTrack }
