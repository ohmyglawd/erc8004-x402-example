# ERC-8004 + x402 Example dApp (Next.js)

A small Next.js frontend for the contracts in this repo.

## Prereqs

- Node 18+ (repo currently using Node 22 fine)
- MetaMask (or another injected wallet)

## Option A) Local demo (Hardhat)

From `erc8004-x402-example/`:

```bash
npm install
npm run node
```

In a second terminal (same folder):

```bash
npm run deploy:localhost
```

This writes:

- `erc8004-x402-example/deployments/localhost.json`
- `erc8004-x402-example/dapp/src/config/deployments/localhost.json` (synced copy for the UI)

## Option B) Shareable demo (Base Sepolia)

1) Create a `.env` in `erc8004-x402-example/` (copy from `.env.example`) and set:

- `DEPLOYER_PRIVATE_KEY=` (funded with Base Sepolia ETH)
- `BASE_SEPOLIA_RPC_URL=` (optional; defaults to `https://sepolia.base.org`)

2) Deploy:

```bash
npm run deploy:baseSepolia
```

This writes:

- `erc8004-x402-example/deployments/base-sepolia.json`
- `erc8004-x402-example/dapp/src/config/deployments/base-sepolia.json` (synced copy for the UI)

## 2) Run the dapp

```bash
cd dapp
npm install
npm run dev
```

Open <http://localhost:3000>.

## UX flows

### Tutorial mode (recommended)

Open the app and follow the **stepper** (Step 1 → Step N). One run is designed to let you experience the entire story:

1. Agent owner mints an agent NFT (ERC-8004 Identity)
2. Agent updates URI
3. Agent rotates `agentWallet` using **EIP-712** (signature by `newWallet`, transaction by owner)
4. Buyer mints + approves mock USDC
5. Buyer pays for an endpoint (`X402Paywall.payForEndpoint`) → emits `X402Payment`
6. Buyer leaves feedback (`ReputationRegistry.giveFeedback`)
7. Agent requests validation (`ValidationRegistry.validationRequest`)
8. Validator responds (`validationResponse`)

### Power-user panels

If you prefer manual control, switch to **Power-user panels** for separate Agent / Buyer / Validator screens.

## Notes

- The dapp supports **Base Sepolia (chainId 84532)** and **Hardhat localhost (chainId 31337)**.
- If you redeploy, the addresses JSON must be updated (the UI reads from `src/config/deployments/*`).
