import { describe, expect, it } from 'vitest'
import { getClientAddress, getOfficeNetworkAddress, getOfficeNetworkError, suggestOfficeNetwork, validateOfficeNetwork } from './office-network.js'

describe('office Wi-Fi attendance', () => {
  it('suggests a local subnet and exact public address', () => {
    expect(suggestOfficeNetwork('192.168.1.71')).toBe('192.168.1.0/24')
    expect(suggestOfficeNetwork('203.0.113.16')).toBe('203.0.113.16/32')
  })

  it('uses the host Wi-Fi address when office setup runs through localhost', () => {
    expect(getOfficeNetworkAddress('127.0.0.1', ['127.0.0.1', '192.168.1.71'])).toBe('192.168.1.71')
    expect(getOfficeNetworkAddress('192.168.1.43', ['192.168.1.71'])).toBe('192.168.1.43')
  })

  it('normalizes and validates IPv4 CIDR settings', () => {
    expect(validateOfficeNetwork('192.168.1.71/24')).toBe('192.168.1.0/24')
    expect(() => validateOfficeNetwork('192.168.1.999/24')).toThrow('valid IPv4')
    expect(() => validateOfficeNetwork('192.168.1.0/33')).toThrow('prefix')
  })

  it('allows devices on the configured subnet and rejects other networks', () => {
    expect(getOfficeNetworkError('192.168.1.22', '192.168.1.0/24')).toBeNull()
    expect(getOfficeNetworkError('192.168.2.22', '192.168.1.0/24')?.status).toBe(403)
    expect(getOfficeNetworkError('192.168.2.22', '192.168.1.0/24')?.message).toContain('Device address: 192.168.2.22')
    expect(getOfficeNetworkError('203.0.113.17', '203.0.113.16/32')?.status).toBe(403)
  })

  it('requires an office network before attendance can be recorded', () => {
    expect(getOfficeNetworkError('192.168.1.22', '')?.status).toBe(409)
  })

  it('allows remote attendance when explicitly enabled', () => {
    expect(getOfficeNetworkError('203.0.113.17', '203.0.113.16/32', true)).toBeNull()
    expect(getOfficeNetworkError('192.168.1.22', '', true)).toBeNull()
  })

  it('trusts forwarded client IPs only from a local proxy', () => {
    expect(getClientAddress({ socket: { remoteAddress: '::ffff:127.0.0.1' }, headers: { 'x-office-client-address': '192.168.1.22' } })).toBe('192.168.1.22')
    expect(getClientAddress({ socket: { remoteAddress: '203.0.113.30' }, headers: { 'x-office-client-address': '192.168.1.22' } })).toBe('203.0.113.30')
  })
})