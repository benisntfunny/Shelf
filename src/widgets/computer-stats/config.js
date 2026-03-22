export default {
  defaults: {
    stats: ['cpu', 'ram'],
    displayStyles: {},
    pollInterval: 2,
    showSparklines: false,
  },
  schema: [
    { key: 'stats', label: 'Stats to show', type: 'checklist', options: [
      { value: 'cpu', label: 'CPU Usage' },
      { value: 'ram', label: 'Memory' },
      { value: 'disk', label: 'Disk Usage' },
      { value: 'network', label: 'Network' },
      { value: 'battery', label: 'Battery' },
    ]},
    { key: 'pollInterval', label: 'Poll interval (seconds)', type: 'number', min: 1, max: 10 },
    { key: 'showSparklines', label: 'Show sparklines', type: 'toggle' },
  ],
}
