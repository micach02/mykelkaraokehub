import os from 'node:os'

function rank(address) {
  if (address.startsWith('192.168.')) return 0
  if (address.startsWith('10.')) return 1
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) return 2
  return 3
}

// Addresses phones on the same Wi-Fi can use to reach this computer,
// e.g. ['http://192.168.1.23:5173']. Home-network addresses come first.
export function getLanOrigins(port, interfaces = os.networkInterfaces()) {
  const addresses = Object.values(interfaces)
    .flat()
    .filter((iface) => iface && (iface.family === 'IPv4' || iface.family === 4) && !iface.internal)
    .map((iface) => iface.address)
    .filter((address) => !address.startsWith('169.254.')) // no-network fallback addresses
  const unique = [...new Set(addresses)].sort((a, b) => rank(a) - rank(b))
  const suffix = port && String(port) !== '80' ? `:${port}` : ''
  return unique.map((address) => `http://${address}${suffix}`)
}

export function portFromHostHeader(host) {
  const match = /:(\d+)$/.exec(String(host ?? ''))
  return match ? match[1] : '80'
}
