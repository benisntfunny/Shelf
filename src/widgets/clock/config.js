export default {
  defaults: { use24h: false, showSeconds: false },
  schema: [
    { key: 'use24h', label: '24-hour format', type: 'toggle' },
    { key: 'showSeconds', label: 'Show seconds', type: 'toggle' },
  ],
}
