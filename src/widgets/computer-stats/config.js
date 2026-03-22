export default {
  defaults: {
    stats: ['cpu', 'ram'],
    displayStyles: {},
    pollInterval: 2,
    showSparklines: false,
  },
  schema: [
    { key: 'stats', label: 'Stats to show', type: 'list' },
    { key: 'pollInterval', label: 'Poll interval (seconds)', type: 'number', min: 1, max: 10 },
    { key: 'showSparklines', label: 'Show sparklines', type: 'toggle' },
  ],
}
