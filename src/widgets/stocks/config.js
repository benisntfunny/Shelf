export default {
  defaults: { tickers: ['AAPL', 'GOOGL', 'MSFT'], refreshInterval: 60 },
  schema: [
    { key: 'tickers', label: 'Tickers', type: 'list' },
    { key: 'refreshInterval', label: 'Refresh (seconds)', type: 'number' },
  ],
}
