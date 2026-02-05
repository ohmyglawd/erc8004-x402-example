import { keccak256, stringToHex, type Hex } from 'viem'

export function bytes32FromString(s: string): Hex {
  // keccak256(utf8Bytes(s))
  return keccak256(stringToHex(s))
}

export function bytes32FromHexOrString(s: string): Hex {
  if (s.startsWith('0x') && s.length === 66) return s as Hex
  return bytes32FromString(s)
}

export function safeNumber(v: string, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function safeBigInt(v: string, fallback = 0n): bigint {
  try {
    if (v.trim() === '') return fallback
    return BigInt(v)
  } catch {
    return fallback
  }
}

export function truncateAddr(addr?: string, chars = 4) {
  if (!addr) return ''
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`
}
