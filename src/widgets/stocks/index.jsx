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
    <div style={{display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'space-evenly',height:'100%',width:'100%',padding:'2vh 0'}}>
      {quotes.map((q) => (
        <div key={q.ticker} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'1.5vh',flex:1,minWidth:0}}>
          <div style={{fontSize:'4vh',fontWeight:700,letterSpacing:'0.08em',color:'#6a6a6a'}}>{q.ticker}</div>
          <div style={{fontSize:'7vh',fontWeight:600,color:'#e0e0e0',lineHeight:1}}>${q.price?.toFixed(2)}</div>
          <div style={{fontSize:'4.5vh',fontWeight:500,color:q.changePercent>=0?'#4caf82':'#cf6679'}}>{q.changePercent>=0?'+':''}{q.changePercent?.toFixed(2)}%</div>
        </div>
      ))}
      {quotes.length === 0 && <span style={{ color: '#6a6a6a', fontSize: '5vh' }}>Loading...</span>}
    </div>
  )
}
