import { useState, useEffect } from 'react'

export default function Stocks({ config }) {
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

  return (
    <div className="stock-list">
      {quotes.map((q) => (
        <div key={q.ticker} className="stock-item">
          <div className="stock-ticker">{q.ticker}</div>
          <div className="stock-price">${q.price}</div>
          <div className={`stock-change ${q.changePercent >= 0 ? 'positive' : 'negative'}`}>
            {q.changePercent >= 0 ? '+' : ''}{q.changePercent}%
          </div>
        </div>
      ))}
      {quotes.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>Loading...</span>}
    </div>
  )
}
