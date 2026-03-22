export default {
  defaults: { groups: [] },
  schema: [
    { key: 'groups', label: 'Accessory groups', type: 'list', itemSchema: [
      { key: 'name', label: 'Group name', type: 'text', placeholder: 'e.g. Living Room' },
      { key: 'accessories', label: 'Accessory names (comma-separated)', type: 'text', placeholder: 'e.g. Lamp,Fan' },
    ]},
  ],
}
