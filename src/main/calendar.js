const { execFile } = require('child_process')

function getCalendarEvents() {
  return new Promise((resolve) => {
    const script = `
      set today to current date
      set endDate to today + (1 * days)
      set output to ""
      tell application "Calendar"
        repeat with cal in calendars
          set evts to (every event of cal whose start date >= today and start date < endDate)
          repeat with evt in evts
            set evtStart to start date of evt
            set h to hours of evtStart
            set m to minutes of evtStart
            set hStr to text -2 thru -1 of ("0" & h)
            set mStr to text -2 thru -1 of ("0" & m)
            set output to output & hStr & ":" & mStr & " | " & summary of evt & linefeed
          end repeat
        end repeat
      end tell
      return output
    `
    execFile('osascript', ['-e', script], { timeout: 5000 }, (err, stdout) => {
      if (err) {
        resolve([])
        return
      }
      const events = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [time, ...rest] = line.split(' | ')
          return { time: time.trim(), title: rest.join(' | ').trim() }
        })
      resolve(events)
    })
  })
}

module.exports = { getCalendarEvents }
