import { useState, useEffect } from 'react'

const PRESETS = [
  { name: 'Accurate', luminance: 90, contrast: 60, red: 50, green: 41, blue: 35 },
  { name: 'Vivid', luminance: 95, contrast: 65, red: 55, green: 48, blue: 45 },
  { name: 'Night', luminance: 40, contrast: 50, red: 45, green: 35, blue: 28 },
  { name: 'Default', luminance: 100, contrast: 50, red: 100, green: 100, blue: 100 },
]

export default function Display({ config }) {
  const [luminance, setLuminance] = useState(90)
  const [activePreset, setActivePreset] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (window.shelf?.displayGet) {
        const vals = await window.shelf.displayGet()
        if (mounted && vals) {
          setLuminance(vals.luminance ?? 90)
          // Check if current values match a preset
          const match = PRESETS.find(
            (p) =>
              p.luminance === vals.luminance &&
              p.contrast === vals.contrast &&
              p.red === vals.red &&
              p.green === vals.green &&
              p.blue === vals.blue
          )
          setActivePreset(match?.name || null)
        }
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  async function handleBrightness(e) {
    const val = Number(e.target.value)
    setLuminance(val)
    setActivePreset(null)
    if (window.shelf?.displaySet) {
      await window.shelf.displaySet({ property: 'luminance', value: val })
    }
  }

  async function applyPreset(preset) {
    setActivePreset(preset.name)
    setLuminance(preset.luminance)
    if (window.shelf?.displaySet) {
      await window.shelf.displaySet({ property: 'luminance', value: preset.luminance })
      await window.shelf.displaySet({ property: 'contrast', value: preset.contrast })
      await window.shelf.displaySet({ property: 'red', value: preset.red })
      await window.shelf.displaySet({ property: 'green', value: preset.green })
      await window.shelf.displaySet({ property: 'blue', value: preset.blue })
    }
  }

  return (
    <div className="display-widget">
      <div className="display-brightness">
        <span className="display-value">{luminance}%</span>
        <input
          type="range"
          min="0"
          max="100"
          value={luminance}
          onChange={handleBrightness}
          className="display-slider"
        />
      </div>
      <div className="display-presets">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            className={`display-preset-pill${activePreset === p.name ? ' active' : ''}`}
            onClick={() => applyPreset(p)}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  )
}
