const fs = require('fs')
const path = require('path')
const { app } = require('electron')

// Lazy-load hap-controller to avoid crashes if native modules aren't compatible
let HttpClient, IPDiscovery
function loadHAP() {
  if (!HttpClient) {
    const hap = require('hap-controller')
    HttpClient = hap.HttpClient
    IPDiscovery = hap.IPDiscovery
  }
}

const PAIRING_DIR = path.join(app.getPath('home'), '.shelf', 'homekit')
const PAIRING_FILE = path.join(PAIRING_DIR, 'pairings.json')

// In-memory state
let discovery = null
let discoveredDevices = []

function ensurePairingDir() {
  if (!fs.existsSync(PAIRING_DIR)) {
    fs.mkdirSync(PAIRING_DIR, { recursive: true })
  }
}

function loadPairings() {
  ensurePairingDir()
  if (!fs.existsSync(PAIRING_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(PAIRING_FILE, 'utf-8'))
  } catch { return {} }
}

function savePairings(pairings) {
  ensurePairingDir()
  fs.writeFileSync(PAIRING_FILE, JSON.stringify(pairings, null, 2), { mode: 0o600 })
}

async function startDiscovery() {
  discoveredDevices = []
  try {
    loadHAP()
    discovery = new IPDiscovery()

    return new Promise((resolve) => {
      const devices = []

      discovery.on('serviceUp', (service) => {
        devices.push({
          id: service.id,
          name: service.name,
          address: service.address,
          port: service.port,
          paired: service.availableToPair === false,
        })
      })

      discovery.start()

      // Discover for 5 seconds
      setTimeout(() => {
        try { discovery.stop() } catch {}
        discovery = null
        discoveredDevices = devices
        resolve(devices)
      }, 5000)
    })
  } catch (e) {
    console.error('[homekit] Discovery error:', e.message)
    return []
  }
}

async function pairDevice(deviceId, pin) {
  const device = discoveredDevices.find(d => d.id === deviceId)
  if (!device) throw new Error('Device not found. Run discovery first.')

  try {
    loadHAP()
    const client = new HttpClient(device.id, device.address, device.port)
    await client.pairSetup(pin)
    const pairingData = client.getLongTermData()

    if (!pairingData) {
      throw new Error('Pairing completed but no long-term data was returned')
    }

    // Save pairing
    const pairings = loadPairings()
    pairings[device.id] = {
      id: device.id,
      name: device.name,
      address: device.address,
      port: device.port,
      pairingData,
    }
    savePairings(pairings)

    return { ok: true, name: device.name }
  } catch (e) {
    throw new Error(`Pairing failed: ${e.message}`)
  }
}

async function getAccessories() {
  const pairings = loadPairings()
  const results = []

  loadHAP()
  for (const [id, pairing] of Object.entries(pairings)) {
    let client
    try {
      client = new HttpClient(id, pairing.address, pairing.port, pairing.pairingData)
      const accessories = await client.getAccessories()

      for (const acc of accessories.accessories) {
        const services = acc.services.map(svc => {
          const type = svc.type
          const chars = svc.characteristics.map(c => ({
            type: c.type,
            iid: c.iid,
            value: c.value,
            perms: c.perms,
            format: c.format,
            description: c.description,
          }))
          return { type, iid: svc.iid, characteristics: chars }
        })

        // Find the accessory info service for the name
        const infoSvc = acc.services.find(s =>
          (s.type || '').toUpperCase().includes('0000003E')
        )
        const nameChr = infoSvc?.characteristics.find(c =>
          (c.type || '').toUpperCase().includes('00000023')
        )

        results.push({
          aid: acc.aid,
          bridgeId: id,
          bridgeName: pairing.name,
          name: nameChr?.value || `Accessory ${acc.aid}`,
          services,
        })
      }
    } catch (e) {
      console.error(`[homekit] Error getting accessories from ${pairing.name}:`, e.message)
      results.push({
        aid: 0,
        bridgeId: id,
        bridgeName: pairing.name,
        name: pairing.name,
        services: [],
        error: e.message,
      })
    } finally {
      try { client?.close() } catch {}
    }
  }

  return results
}

async function setCharacteristic(bridgeId, aid, iid, value) {
  const pairings = loadPairings()
  const pairing = pairings[bridgeId]
  if (!pairing) throw new Error('Bridge not paired')

  loadHAP()
  const client = new HttpClient(bridgeId, pairing.address, pairing.port, pairing.pairingData)
  try {
    await client.setCharacteristics({ [`${aid}.${iid}`]: value })
  } finally {
    try { client.close() } catch {}
  }
}

async function unpairDevice(deviceId) {
  const pairings = loadPairings()
  if (pairings[deviceId]) {
    try {
      const p = pairings[deviceId]
      loadHAP()
      const client = new HttpClient(deviceId, p.address, p.port, p.pairingData)
      // Use the iOSDevicePairingID from the stored pairing data
      await client.removePairing(p.pairingData.iOSDevicePairingID)
      client.close()
    } catch (e) {
      console.error('[homekit] Unpair error:', e.message)
    }
    delete pairings[deviceId]
    savePairings(pairings)
  }
}

function getPairedDevices() {
  const pairings = loadPairings()
  return Object.values(pairings).map(p => ({ id: p.id, name: p.name }))
}

module.exports = { startDiscovery, pairDevice, getAccessories, setCharacteristic, unpairDevice, getPairedDevices }
