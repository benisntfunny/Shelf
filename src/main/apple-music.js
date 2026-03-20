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
    const script = [
      'tell application "Music"',
      '  set artData to raw data of artwork 1 of current track',
      `  set artFile to POSIX file "${ARTWORK_PATH}"`,
      '  set fRef to open for access artFile with write permission',
      '  set eof fRef to 0',
      '  write artData to fRef',
      '  close access fRef',
      'end tell',
    ]

    const args = []
    for (const line of script) args.push('-e', line)

    await new Promise((resolve, reject) => {
      const { execFile } = require('child_process')
      execFile('osascript', args, { timeout: 5000 }, (err) => {
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
    // Bulk fetch — gets all properties in 4 calls instead of N iterations
    const script = [
      'tell application "Music"',
      `  set pl to playlist "${escaped}"`,
      '  set tNames to name of every track of pl',
      '  set tArtists to artist of every track of pl',
      '  set tAlbums to album of every track of pl',
      '  set tDurations to duration of every track of pl',
      '  set output to ""',
      '  repeat with i from 1 to count of tNames',
      '    set output to output & item i of tNames & "|||" & item i of tArtists & "|||" & item i of tAlbums & "|||" & (item i of tDurations as string) & linefeed',
      '  end repeat',
      '  return output',
      'end tell',
    ]

    const args = []
    for (const line of script) args.push('-e', line)

    const result = await new Promise((resolve) => {
      const { execFile } = require('child_process')
      execFile('osascript', args, { timeout: 15000 }, (err, stdout) => {
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
        const [name, artist, album, duration] = line.split('|||')
        return {
          name: (name || '').trim(),
          artist: (artist || '').trim(),
          album: (album || '').trim(),
          duration: parseFloat(duration) || 0,
        }
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

const albumArtCache = new Map()

async function getAlbumArtByName(albumName, artistName) {
  const key = `${albumName}|||${artistName}`
  if (albumArtCache.has(key)) return albumArtCache.get(key)

  try {
    const escapedAlbum = albumName.replace(/"/g, '\\"')
    const escapedArtist = artistName.replace(/"/g, '\\"')
    const artPath = `/tmp/shelf-album-art-${Date.now()}.jpg`
    const script = [
      'tell application "Music"',
      `  set matches to (every track whose album is "${escapedAlbum}" and artist is "${escapedArtist}")`,
      '  if matches is {} then',
      `    set matches to (every track whose album is "${escapedAlbum}")`,
      '  end if',
      '  if matches is not {} then',
      '    set t to item 1 of matches',
      '    if (count of artworks of t) > 0 then',
      '      set artData to raw data of artwork 1 of t',
      `      set artFile to POSIX file "${artPath}"`,
      '      set fRef to open for access artFile with write permission',
      '      set eof fRef to 0',
      '      write artData to fRef',
      '      close access fRef',
      '    end if',
      '  end if',
      'end tell',
    ]

    const args = []
    for (const line of script) args.push('-e', line)

    await new Promise((resolve) => {
      const { execFile } = require('child_process')
      execFile('osascript', args, { timeout: 5000 }, (err) => {
        resolve()
      })
    })

    let result = null
    if (fs.existsSync(artPath)) {
      const buf = fs.readFileSync(artPath)
      if (buf.length > 0) {
        result = `data:image/jpeg;base64,${buf.toString('base64')}`
      }
      fs.unlinkSync(artPath)
    }
    albumArtCache.set(key, result)
    return result
  } catch (e) {
    console.error('[apple-music] getAlbumArtByName failed:', e.message)
    albumArtCache.set(key, null)
    return null
  }
}

async function searchTracks(query) {
  try {
    const escaped = query.replace(/"/g, '\\"')
    const script = [
      'tell application "Music"',
      `  set results to (search playlist "Library" for "${escaped}")`,
      '  set output to ""',
      '  set maxCount to 50',
      '  set i to 0',
      '  repeat with t in results',
      '    set i to i + 1',
      '    if i > maxCount then exit repeat',
      '    set output to output & name of t & "|||" & artist of t & "|||" & album of t & "|||" & (duration of t as string) & linefeed',
      '  end repeat',
      '  return output',
      'end tell',
    ]

    const args = []
    for (const line of script) args.push('-e', line)

    const result = await new Promise((resolve) => {
      const { execFile } = require('child_process')
      execFile('osascript', args, { timeout: 15000 }, (err, stdout) => {
        if (err) {
          console.error('[apple-music] searchTracks failed:', err.message)
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
        const [name, artist, album, duration] = line.split('|||')
        return {
          name: (name || '').trim(),
          artist: (artist || '').trim(),
          album: (album || '').trim(),
          duration: parseFloat(duration) || 0,
        }
      })
  } catch (e) {
    console.error('[apple-music] searchTracks failed:', e.message)
    return []
  }
}

module.exports = { getNowPlaying, musicCommand, getPlaylists, getPlaylistTracks, playTrack, getAlbumArtByName, searchTracks }
