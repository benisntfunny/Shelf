const { exec } = require('child_process')

function runOsascript(script) {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err) return resolve(null)
      resolve(stdout.trim())
    })
  })
}

async function getNowPlaying() {
  const state = await runOsascript('tell application "Music" to player state as string')
  if (!state || state === 'stopped') {
    return { playing: false, track: '', artist: '', album: '', artwork: '' }
  }

  const [track, artist, album] = await Promise.all([
    runOsascript('tell application "Music" to name of current track'),
    runOsascript('tell application "Music" to artist of current track'),
    runOsascript('tell application "Music" to album of current track'),
  ])

  return {
    playing: state === 'playing',
    track: track || '',
    artist: artist || '',
    album: album || '',
    artwork: '',
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

module.exports = { getNowPlaying, musicCommand }
