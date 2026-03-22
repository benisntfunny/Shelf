export default {
  defaults: {
    stats: [
      { id: 'cpu', display: 'radial' },
      { id: 'ram', display: 'bar' },
    ],
    pollInterval: 2,
    showSparklines: false,
  },
  schema: [
    {
      key: 'stats',
      label: 'Stats to show (drag to reorder)',
      type: 'list',
      itemSchema: [
        { key: 'id', label: 'Stat', type: 'select', options: [
          { value: 'cpu', label: 'CPU Usage' },
          { value: 'ram', label: 'Memory' },
          { value: 'disk', label: 'Disk Usage' },
          { value: 'network', label: 'Network' },
          { value: 'battery', label: 'Battery' },
          { value: 'cpuTemp', label: 'CPU Temperature' },
        ]},
        { key: 'display', label: 'Style', type: 'select', options: [
          { value: 'radial', label: 'Circle' },
          { value: 'bar', label: 'Bar' },
          { value: 'number', label: 'Number' },
        ]},
      ]
    },
    { key: 'pollInterval', label: 'Poll interval (seconds)', type: 'number', min: 1, max: 10 },
    { key: 'showSparklines', label: 'Show sparklines', type: 'toggle' },
  ],
}
