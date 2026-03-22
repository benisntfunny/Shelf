export default {
  defaults: { cities: ['San Francisco', 'New York', 'London'], units: 'F' },
  schema: [
    { key: 'cities', label: 'Cities', type: 'list' },
    { key: 'units', label: 'Units', type: 'select', options: ['C', 'F'] },
  ],
}
