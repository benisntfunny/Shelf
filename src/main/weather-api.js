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

// Cache geocoding results so we don't hit the API every refresh
const geoCache = new Map()

async function geocodeCity(name) {
  if (geoCache.has(name)) return geoCache.get(name)

  // Try postal code search first, then name search
  let data = null
  try {
    const nameUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`
    data = await fetchJSON(nameUrl)
  } catch {}

  if (data?.results?.length) {
    const r = data.results[0]
    const result = {
      lat: r.latitude, lon: r.longitude,
      city: r.name, state: r.admin1 || '', country: r.country_code || '',
      postcode: r.postcodes?.[0] || '',
    }
    // Build display label: "City, State ZIP" or "City, Country"
    let label = r.name
    if (r.admin1) label += `, ${r.admin1}`
    if (r.postcodes?.[0]) label += ` ${r.postcodes[0]}`
    result.displayName = label
    geoCache.set(name, result)
    return result
  }
  return null
}

async function getWeather(lat, lon, units = 'C') {
  const tempUnit = units === 'F' ? 'fahrenheit' : 'celsius'
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=${tempUnit}&timezone=auto&forecast_days=5`
  try {
    const data = await fetchJSON(url)
    const code = data.current?.weather_code ?? 0
    const forecast = []
    for (let i = 0; i < (data.daily?.time?.length || 0); i++) {
      const fCode = data.daily.weather_code?.[i] ?? 0
      forecast.push({
        date: data.daily.time[i],
        hi: Math.round(data.daily.temperature_2m_max[i] ?? 0),
        lo: Math.round(data.daily.temperature_2m_min[i] ?? 0),
        icon: WMO_ICONS[fCode] || '🌡',
        condition: WMO_CODES[fCode] || 'Unknown',
      })
    }
    return {
      temp: Math.round(data.current?.temperature_2m ?? 0),
      condition: WMO_CODES[code] || 'Unknown',
      icon: WMO_ICONS[code] || '🌡',
      hi: Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
      lo: Math.round(data.daily?.temperature_2m_min?.[0] ?? 0),
      units,
      forecast,
    }
  } catch {
    return { temp: 0, condition: 'Error', icon: '❓', hi: 0, lo: 0, units, forecast: [] }
  }
}

async function getWeatherByCity(cityName, units = 'C') {
  const geo = await geocodeCity(cityName)
  if (!geo) return { city: cityName, temp: 0, condition: 'Not Found', icon: '❓', hi: 0, lo: 0, units, forecast: [] }
  const weather = await getWeather(geo.lat, geo.lon, units)
  const label = geo.state ? `${geo.city}, ${geo.state}` : geo.city
  return { ...weather, city: label }
}

module.exports = { getWeather, getWeatherByCity, geocodeCity }
