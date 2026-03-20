export default {
  defaults: { url: 'https://example.com', label: 'Felix', refreshInterval: 30 },
  schema: [
    { key: 'url', label: 'URL', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'refreshInterval', label: 'Refresh (seconds)', type: 'number' },
  ],
}
