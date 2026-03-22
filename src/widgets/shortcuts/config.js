export default {
  defaults: { actions: [], columns: 0 },
  schema: [
    {
      key: 'actions',
      label: 'Actions',
      type: 'list',
      itemSchema: [
        { key: 'type', label: 'Type', type: 'select', options: [
          { value: 'shortcut', label: 'macOS Shortcut' },
          { value: 'app', label: 'App' },
          { value: 'url', label: 'URL' },
          { value: 'shell', label: 'Shell Command' },
        ]},
        { key: 'name', label: 'Label', type: 'text', placeholder: 'Button label' },
        { key: 'icon', label: 'Icon', type: 'text', placeholder: 'Emoji e.g. \uD83D\uDE80' },
        { key: 'value', label: 'Value', type: 'text', placeholder: 'Shortcut name, app path, URL, or command' },
      ]
    },
    { key: 'columns', label: 'Columns (0 = auto)', type: 'number', min: 0, max: 6 },
  ],
}
