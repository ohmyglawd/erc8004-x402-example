# Base Sepolia – BaseScan verification helper

BaseScan / Etherscan verification APIs have migrated to V2, and Hardhat's older `hardhat-etherscan` plugin can fail.

This folder provides a **Standard JSON Input** bundle that you can upload in the BaseScan UI.

## Generate bundle

From `erc8004-x402-example/`:

```bash
npm run compile
npm run verify:bundle:baseSepolia
```

This writes:

- `verify/base-sepolia/standard-json-input.json`
- `verify/base-sepolia/build-info.meta.json`

## Verify in BaseScan UI

1) Open BaseScan (Base Sepolia)
2) Go to each contract address → **Contract** tab → **Verify and Publish**
3) Choose compiler type: **Solidity (Standard-Json-Input)**
4) Upload `standard-json-input.json`
5) Compiler version: use the one in `build-info.meta.json`
6) Optimization: enabled (runs 200)
7) Via IR: enabled
8) For “Contract Name”, pick the matching fully-qualified contract from the dropdown.

## Constructor arguments

Use these when BaseScan asks for constructor args:

- `ERC8004IdentityRegistry`: *(none)*
- `ERC8004ReputationRegistry(identityRegistry)`: identityRegistry address
- `ERC8004ValidationRegistry(identityRegistry)`: identityRegistry address
- `MockERC20(name,symbol,decimals)`: `MockUSDC`, `mUSDC`, `6`
- `X402Paywall(token, identityRegistry)`: token=MockUSDC address, identityRegistry address

The deployed addresses are stored in `deployments/base-sepolia.json`.
