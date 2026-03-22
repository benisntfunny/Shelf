const { loadSecrets } = require('./config-store')

async function haFetch(path, options = {}) {
  const secrets = loadSecrets()
  const url = secrets.ha_url || secrets['home-assistant.ha_url']
  const token = secrets.ha_token || secrets['home-assistant.ha_token']

  if (!url || !token) {
    throw new Error('Home Assistant URL or token not configured')
  }

  const baseUrl = url.replace(/\/+$/, '')
  const resp = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`HA API ${resp.status}: ${text}`)
  }

  return resp.json()
}

async function getStates(entityIds) {
  const allStates = await haFetch('/api/states')
  if (!entityIds || entityIds.length === 0) return allStates
  return allStates.filter(s => entityIds.includes(s.entity_id))
}

async function callService(domain, service, data) {
  return haFetch(`/api/services/${domain}/${service}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

async function getAllEntities() {
  const states = await haFetch('/api/states')
  return states.map(s => ({
    entity_id: s.entity_id,
    friendly_name: s.attributes?.friendly_name || s.entity_id,
    domain: s.entity_id.split('.')[0],
    state: s.state,
  }))
}

module.exports = { haFetch, getStates, callService, getAllEntities }
