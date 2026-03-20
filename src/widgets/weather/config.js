export default {
  defaults: { latitude: '37.7749', longitude: '-122.4194', units: 'F' },
  schema: [
    { key: 'latitude', label: 'Latitude', type: 'text' },
    { key: 'longitude', label: 'Longitude', type: 'text' },
    { key: 'units', label: 'Units', type: 'select', options: ['C', 'F'] },
  ],
}
