import localhost from './deployments/localhost.json'
import baseSepolia from './deployments/base-sepolia.json'

export type Deployment = {
  chainId: number
  deployer: string
  contracts: {
    identity: `0x${string}`
    reputation: `0x${string}`
    validation: `0x${string}`
    usdc: `0x${string}`
    paywall: `0x${string}`
  }
}

export const deploymentsByChainId: Record<number, Deployment> = {
  // hardhat
  31337: localhost as unknown as Deployment,
  // base sepolia
  84532: baseSepolia as unknown as Deployment,
}

export function getDeployment(chainId: number): Deployment {
  const d = deploymentsByChainId[chainId]
  if (!d) throw new Error(`Unsupported chainId: ${chainId}`)
  return d
}
