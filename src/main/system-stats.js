const os = require('os')

let prevCpuInfo = null
let prevNetBytes = null
let prevNetTime = null

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

function getMemUsage() {
  const total = os.totalmem()
  const free = os.freemem()
  return Math.round(((total - free) / total) * 100)
}

function getNetworkStats() {
  try {
    const interfaces = os.networkInterfaces()
    // We can't get throughput from os module alone, return 0 for now
    // Real implementation would use a native addon or parse netstat
    return { up: 0, down: 0 }
  } catch {
    return { up: 0, down: 0 }
  }
}

function getSystemStats() {
  return {
    cpu: getCpuUsage(),
    memory: getMemUsage(),
    network: getNetworkStats(),
  }
}

module.exports = { getSystemStats }
