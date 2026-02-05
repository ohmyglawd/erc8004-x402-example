import { http, createConfig } from 'wagmi'
import { hardhat, baseSepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { fallback } from 'viem'

// Base Sepolia 公開 RPC 有時會 503/限流，所以用多個端點做備援。
const baseSepoliaRpcPrimary =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'

const baseSepoliaRpcFallbacks = (
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_FALLBACKS ||
  [
    // 官方
    'https://sepolia.base.org',
    // 備援（公開）
    'https://rpc.ankr.com/base_sepolia',
    'https://base-sepolia.gateway.tenderly.co',
    'https://base-sepolia-public.nodies.app',
  ].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const baseSepoliaTransports = [baseSepoliaRpcPrimary, ...baseSepoliaRpcFallbacks]
  // 去重
  .filter((v, i, a) => a.indexOf(v) === i)
  .map((url) => http(url, { timeout: 15_000 }))

export const chains = [baseSepolia, hardhat] as const

export const wagmiConfig = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [baseSepolia.id]: fallback(baseSepoliaTransports),
  },
})
