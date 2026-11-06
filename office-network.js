function parseIPv4(address) {
  if (typeof address !== 'string' || !/^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(address)) return null
  return address.split('.').reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0)
}

function fromIPv4(value) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.')
}

function normalizeAddress(address) {
  const firstAddress = String(address ?? '').split(',')[0].trim().toLowerCase()
  return firstAddress.startsWith('::ffff:') ? firstAddress.slice(7) : firstAddress
}

function isLoopback(address) {
  return address === '127.0.0.1' || address === '::1'
}

function isPrivateIPv4(address) {
  const value = parseIPv4(address)
  if (value == null) return false
  const firstOctet = value >>> 24
  const secondOctet = (value >>> 16) & 255
  return firstOctet === 10
    || (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31)
    || (firstOctet === 192 && secondOctet === 168)
}

export function getClientAddress(request) {
  const remoteAddress = normalizeAddress(request.socket?.remoteAddress)
  const forwardedAddress = normalizeAddress(request.headers?.['x-office-client-address'])
  return isLoopback(remoteAddress) && forwardedAddress ? forwardedAddress : remoteAddress
}

export function getOfficeNetworkAddress(clientAddress, localAddresses = []) {
  const address = normalizeAddress(clientAddress)
  if (!isLoopback(address)) return address
  return localAddresses.map(normalizeAddress).find(isPrivateIPv4) ?? address
}

export function validateOfficeNetwork(value) {
  if (typeof value !== 'string' || value.trim() === '') return ''
  const [address, prefixText, ...extra] = value.trim().split('/')
  if (extra.length) throw new Error('Enter a single office network in CIDR format.')
  const ipv4 = parseIPv4(address)
  if (ipv4 != null) {
    const prefix = prefixText === undefined ? 32 : Number(prefixText)
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error('IPv4 prefix must be between 0 and 32.')
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
    return `${fromIPv4(ipv4 & mask)}/${prefix}`
  }
  if (address.includes(':') && /^[0-9a-f:]+$/.test(address)) {
    const prefix = prefixText === undefined ? 128 : Number(prefixText)
    if (prefix !== 128) throw new Error('IPv6 office addresses must use /128.')
    return `${address}/128`
  }
  throw new Error('Enter a valid IPv4 or IPv6 office address.')
}

export function suggestOfficeNetwork(address) {
  const normalizedAddress = normalizeAddress(address)
  const ipv4 = parseIPv4(normalizedAddress)
  if (ipv4 == null) {
    if (normalizedAddress.includes(':') && /^[0-9a-f:]+$/.test(normalizedAddress)) return `${normalizedAddress}/128`
    throw new Error('Could not determine this device network address.')
  }
  return validateOfficeNetwork(`${normalizedAddress}/${isPrivateIPv4(normalizedAddress) ? 24 : 32}`)
}

export function getOfficeNetworkError(clientAddress, officeNetwork, allowRemoteCheckIn = false) {
  if (allowRemoteCheckIn) return null
  if (!officeNetwork) return { status: 409, message: 'The office Wi-Fi network is not configured.' }
  let allowedNetwork
  try {
    allowedNetwork = validateOfficeNetwork(officeNetwork)
  } catch {
    return { status: 409, message: 'The saved office Wi-Fi network is invalid.' }
  }
  const address = normalizeAddress(clientAddress)
  const [networkAddress, prefixText] = allowedNetwork.split('/')
  const addressValue = parseIPv4(address)
  const networkValue = parseIPv4(networkAddress)
  if (addressValue != null && networkValue != null) {
    const prefix = Number(prefixText)
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
    if ((addressValue & mask) === (networkValue & mask)) return null
  } else if (prefixText === '128' && address === networkAddress) {
    return null
  }
  return {
    status: 403,
    message: `Connect to the office Wi-Fi network to clock in or out. Device address: ${address || 'unavailable'}; configured network: ${allowedNetwork}.`,
  }
}