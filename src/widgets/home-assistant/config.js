export default {
  defaults: { entities: [], groups: [] },
  schema: [
    { key: 'entities', label: 'Entities', type: 'ha-entity-picker' },
    { key: 'groups', label: 'Entity groups', type: 'list', itemSchema: [
      { key: 'name', label: 'Group name', type: 'text', placeholder: 'e.g. Living Room' },
      { key: 'entities', label: 'Entity IDs (comma-separated)', type: 'text', placeholder: 'light.living_room,sensor.temp' },
    ]},
  ],
}
