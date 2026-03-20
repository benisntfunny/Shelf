const https = require('https')

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Shelf/1.0' } }, (res) => {
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

async function getStockQuotes(tickers) {
  if (!tickers || tickers.length === 0) return []
  const symbols = tickers.join(',')
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbols}?interval=1d&range=1d`
    // Yahoo finance v8 only supports one symbol at a time
    const results = await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
          const data = await fetchJSON(url)
          const result = data?.chart?.result?.[0]
          if (!result) return { ticker, price: 0, change: 0, changePercent: 0, error: true }
          const meta = result.meta
          const price = meta.regularMarketPrice || 0
          const prevClose = meta.chartPreviousClose || meta.previousClose || price
          const change = price - prevClose
          const changePercent = prevClose ? ((change / prevClose) * 100) : 0
          return {
            ticker,
            price: Math.round(price * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
          }
        } catch {
          return { ticker, price: 0, change: 0, changePercent: 0, error: true }
        }
      })
    )
    return results
  } catch {
    return tickers.map((ticker) => ({ ticker, price: 0, change: 0, changePercent: 0, error: true }))
  }
}

module.exports = { getStockQuotes }
