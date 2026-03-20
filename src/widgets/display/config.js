export default {
  defaults: {
    displayNumber: 3,
    presets: [
      { name: 'Accurate', luminance: 90, contrast: 60, red: 50, green: 41, blue: 35 },
      { name: 'Vivid', luminance: 95, contrast: 65, red: 55, green: 48, blue: 45 },
      { name: 'Night', luminance: 40, contrast: 50, red: 45, green: 35, blue: 28 },
      { name: 'Default', luminance: 100, contrast: 50, red: 100, green: 100, blue: 100 },
    ],
  },
  schema: [
    {
      key: 'displayNumber',
      label: 'Display Number (m1ddc)',
      type: 'number',
    },
  ],
}
