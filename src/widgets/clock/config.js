const TIMEZONES = [
  { value: '', label: 'Local (default)' },
  { value: 'America/New_York', label: 'New York (ET)' },
  { value: 'America/Chicago', label: 'Chicago (CT)' },
  { value: 'America/Denver', label: 'Denver (MT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { value: 'America/Anchorage', label: 'Anchorage (AK)' },
  { value: 'Pacific/Honolulu', label: 'Honolulu (HI)' },
  { value: 'America/Phoenix', label: 'Phoenix (AZ)' },
  { value: 'America/Toronto', label: 'Toronto' },
  { value: 'America/Vancouver', label: 'Vancouver' },
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'Europe/Rome', label: 'Rome (CET)' },
  { value: 'Europe/Zurich', label: 'Zurich (CET)' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET)' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  { value: 'Europe/Istanbul', label: 'Istanbul' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Mumbai / Delhi (IST)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
  { value: 'Africa/Cairo', label: 'Cairo (EET)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
]

const TZ_OPTIONS = TIMEZONES.map(tz => tz.value ? `${tz.label}|${tz.value}` : tz.label)

export { TIMEZONES }

export default {
  defaults: { use24h: false, showSeconds: false, timezone: '', label: '', clocks: [] },
  schema: [
    { key: 'use24h', label: '24-hour format', type: 'toggle' },
    { key: 'showSeconds', label: 'Show seconds', type: 'toggle' },
    { key: 'timezone', label: 'Timezone', type: 'select', options: TIMEZONES },
    { key: 'label', label: 'Location label', type: 'text', placeholder: 'e.g. New York (auto-filled from timezone)' },
    { key: 'clocks', label: 'Additional clocks', type: 'list', itemSchema: [
      { key: 'timezone', label: 'Timezone', type: 'select', options: TIMEZONES },
      { key: 'label', label: 'Label', type: 'text', placeholder: 'e.g. London' },
    ]},
  ],
}
