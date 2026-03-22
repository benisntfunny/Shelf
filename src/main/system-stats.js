const os = require('os')
const { execSync } = require('child_process')

let prevCpuInfo = null
let prevPerCore = null
let prevNetBytes = null
let prevNetTime = null

const MAX_HISTORY = 60
const history = { cpu: [], ram: [], disk: [], netUp: [], netDown: [] }

function getCpuUsage() {
  const cpus = os.cpus()
  const totals = { idle: 0, total: 0 }
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totals.total += cpu.times[type]
    }
    totals.idle += cpu.times.idle
  }
  if (!prevCpuInfo) {
    prevCpuInfo = totals
    return 0
  }
  const idleDiff = totals.idle - prevCpuInfo.idle
  const totalDiff = totals.total - prevCpuInfo.total
  prevCpuInfo = totals
  return totalDiff === 0 ? 0 : Math.round((1 - idleDiff / totalDiff) * 100)
}

function getCpuPerCore() {
  const cpus = os.cpus()
  const current = cpus.map(cpu => {
    let total = 0
    for (const type in cpu.times) total += cpu.times[type]
    return { idle: cpu.times.idle, total }
  })
  if (!prevPerCore) {
    prevPerCore = current
    return current.map(() => 0)
  }
  const result = current.map((c, i) => {
    const prev = prevPerCore[i]
    const idleDiff = c.idle - prev.idle
    const totalDiff = c.total - prev.total
    return totalDiff === 0 ? 0 : Math.round((1 - idleDiff / totalDiff) * 100)
  })
  prevPerCore = current
  return result
}

function getMemUsage() {
  const total = os.totalmem()
  const free = os.freemem()
  return Math.round(((total - free) / total) * 100)
}

function getRamFull() {
  const total = os.totalmem()
  const free = os.freemem()
  const used = total - free
  return { used, total, percent: Math.round((used / total) * 100) }
}

function getDiskStats() {
  try {
    const output = execSync('df -k /', { encoding: 'utf8', timeout: 3000 })
    const lines = output.trim().split('\n')
    if (lines.length < 2) return []
    const parts = lines[1].split(/\s+/)
    const totalKB = parseInt(parts[1], 10)
    const usedKB = parseInt(parts[2], 10)
    const total = totalKB * 1024
    const used = usedKB * 1024
    return [{ name: '/', used, total, percent: total === 0 ? 0 : Math.round((used / total) * 100) }]
  } catch {
    return []
  }
}

function getNetworkStats() {
  try {
    const output = execSync('netstat -ib', { encoding: 'utf8', timeout: 3000 })
    const lines = output.trim().split('\n')
    let totalIn = 0, totalOut = 0
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/\s+/)
      // Look for lines with byte counts (typically columns: Name Mtu Network Address Ipkts Ierrs Ibytes Opkts Oerrs Obytes)
      if (parts.length >= 10 && parts[0] === 'en0') {
        const ibytes = parseInt(parts[6], 10)
        const obytes = parseInt(parts[9], 10)
        if (!isNaN(ibytes) && !isNaN(obytes)) {
          totalIn = ibytes
          totalOut = obytes
          break
        }
      }
    }

    const now = Date.now()
    if (!prevNetBytes || !prevNetTime) {
      prevNetBytes = { in: totalIn, out: totalOut }
      prevNetTime = now
      return { up: 0, down: 0 }
    }

    const elapsed = (now - prevNetTime) / 1000
    if (elapsed <= 0) return { up: 0, down: 0 }

    const down = Math.max(0, Math.round((totalIn - prevNetBytes.in) / elapsed))
    const up = Math.max(0, Math.round((totalOut - prevNetBytes.out) / elapsed))

    prevNetBytes = { in: totalIn, out: totalOut }
    prevNetTime = now

    return { up, down }
  } catch {
    return { up: 0, down: 0 }
  }
}

function getBatteryStats() {
  try {
    const output = execSync('pmset -g batt', { encoding: 'utf8', timeout: 3000 })
    const match = output.match(/(\d+)%;\s*(charging|discharging|charged|finishing charge|AC attached)/)
    if (!match) return { percent: 0, charging: false, present: false }
    const percent = parseInt(match[1], 10)
    const charging = match[2] !== 'discharging'
    return { percent, charging, present: true }
  } catch {
    return { percent: 0, charging: false, present: false }
  }
}

function recordHistory(stats) {
  history.cpu.push(stats.cpu.usage)
  history.ram.push(stats.ram.percent)
  history.disk.push(stats.disk[0]?.percent ?? 0)
  history.netUp.push(stats.network.up)
  history.netDown.push(stats.network.down)

  if (history.cpu.length > MAX_HISTORY) history.cpu.shift()
  if (history.ram.length > MAX_HISTORY) history.ram.shift()
  if (history.disk.length > MAX_HISTORY) history.disk.shift()
  if (history.netUp.length > MAX_HISTORY) history.netUp.shift()
  if (history.netDown.length > MAX_HISTORY) history.netDown.shift()
}

function getCpuTemp() {
  try {
    // Try reading from ioreg SMC
    const output = execSync(
      'ioreg -rc AppleSmartBattery 2>/dev/null || echo ""',
      { encoding: 'utf8', timeout: 3000 }
    )
    // Fallback: try osx-cpu-temp or powermetrics (best effort)
    try {
      const temp = execSync(
        'sudo -n powermetrics --samplers smc -i1 -n1 2>/dev/null | grep "CPU die temperature" | awk \'{print $4}\'',
        { encoding: 'utf8', timeout: 3000 }
      ).trim()
      if (temp) return { temp: parseFloat(temp), available: true }
    } catch {}
    // Try sysctl (some Macs)
    try {
      const temp = execSync(
        'sysctl -n machdep.xcpm.cpu_thermal_level 2>/dev/null',
        { encoding: 'utf8', timeout: 3000 }
      ).trim()
      if (temp) return { temp: parseInt(temp, 10), available: true }
    } catch {}
    return { temp: 0, available: false }
  } catch {
    return { temp: 0, available: false }
  }
}

function getFullStats() {
  const cpuUsage = getCpuUsage()
  const perCore = getCpuPerCore()
  const ram = getRamFull()
  const disk = getDiskStats()
  const network = getNetworkStats()
  const battery = getBatteryStats()
  const cpuTemp = getCpuTemp()

  const stats = {
    cpu: { usage: cpuUsage, perCore },
    ram,
    disk,
    network,
    battery,
    cpuTemp,
  }

  recordHistory(stats)

  return {
    ...stats,
    history: {
      cpu: [...history.cpu],
      ram: [...history.ram],
      disk: [...history.disk],
      network: [...history.netUp],
      netUp: [...history.netUp],
      netDown: [...history.netDown],
    },
  }
}

function getSystemStats() {
  return {
    cpu: getCpuUsage(),
    memory: getMemUsage(),
    network: getNetworkStats(),
  }
}

module.exports = { getSystemStats, getFullStats }
