import { useState, useEffect } from 'react'

export default function Stocks({ config, size }) {
  const [quotes, setQuotes] = useState([])
  const tickers = config?.tickers?.length ? config.tickers : ['AAPL', 'GOOGL', 'MSFT']
  const interval = (config?.refreshInterval || 60) * 1000

  useEffect(() => {
    let mounted = true
    async function fetchStocks() {
      if (window.shelf) {
        const data = await window.shelf.getStocks(tickers)
        if (mounted) setQuotes(data)
      }
    }
    fetchStocks()
    const timer = setInterval(fetchStocks, interval)
    return () => { mounted = false; clearInterval(timer) }
  }, [tickers.join(','), interval])

  if (quotes.length === 0) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ color: '#6a6a6a', fontSize: '5vh' }}>Loading...</span>
    </div>
  }

  const [w, h] = (size || '4x1').split('x').map(Number)

  // Figure out how many columns fit per row based on widget width
  const colsPerRow = Math.max(1, w <= 2 ? 1 : w <= 4 ? Math.min(quotes.length, w) : Math.min(quotes.length, Math.floor(w * 1.5)))
  const rows = Math.ceil(quotes.length / colsPerRow)

  // Scale text based on available space
  const cellHeight = h / rows
  const isCompact = cellHeight < 1.5 || (h === 1 && quotes.length > w)
  const tickerSize = isCompact ? '2.5vh' : h === 1 ? '3vh' : '4vh'
  const priceSize = isCompact ? '3.5vh' : h === 1 ? '5vh' : '7vh'
  const changeSize = isCompact ? '2.5vh' : h === 1 ? '3vh' : '4.5vh'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${colsPerRow}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      height: '100%', width: '100%', padding: '0.5vh 0',
      overflow: 'hidden',
    }}>
      {quotes.map((q) => (
        <div key={q.ticker} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: isCompact ? '0.2vh' : '0.5vh',
          minWidth: 0, minHeight: 0, overflow: 'hidden',
        }}>
          <div style={{ fontSize: tickerSize, fontWeight: 700, letterSpacing: '0.08em', color: '#6a6a6a' }}>{q.ticker}</div>
          <div style={{ fontSize: priceSize, fontWeight: 600, color: '#e0e0e0', lineHeight: 1 }}>${q.price?.toFixed(2)}</div>
          <div style={{ fontSize: changeSize, fontWeight: 500, color: q.changePercent >= 0 ? '#4caf82' : '#cf6679' }}>
            {q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
          </div>
        </div>
      ))}
    </div>
  )
}
