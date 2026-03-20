const https = require('https')

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error('Invalid JSON'))
        }
      })
    }).on('error', reject)
  })
}

const WMO_CODES = {
  0: 'Clear', 1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Foggy',
  51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Light Showers', 81: 'Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
}

const WMO_ICONS = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫',
  51: '🌦', 53: '🌧', 55: '🌧',
  61: '🌦', 63: '🌧', 65: '🌧',
  71: '🌨', 73: '❄️', 75: '❄️',
  80: '🌦', 81: '🌧', 82: '🌧',
  95: '⛈', 96: '⛈', 99: '⛈',
}

async function getWeather(lat, lon, units = 'C') {
  const tempUnit = units === 'F' ? 'fahrenheit' : 'celsius'
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=${tempUnit}&timezone=auto&forecast_days=1`
  try {
    const data = await fetchJSON(url)
    const code = data.current?.weather_code ?? 0
    return {
      temp: Math.round(data.current?.temperature_2m ?? 0),
      condition: WMO_CODES[code] || 'Unknown',
      icon: WMO_ICONS[code] || '🌡',
      hi: Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
      lo: Math.round(data.daily?.temperature_2m_min?.[0] ?? 0),
      units,
    }
  } catch {
    return { temp: 0, condition: 'Error', icon: '❓', hi: 0, lo: 0, units }
  }
}

module.exports = { getWeather }
