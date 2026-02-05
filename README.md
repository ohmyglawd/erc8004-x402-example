# ERC-8004 + x402 (example contracts)

這是一個**可編譯、可部署、可跑測試**的範例專案，用來示範：

- **ERC-8004 Identity Registry**（ERC-721 + URIStorage）
- **ERC-8004 Reputation Registry**（giveFeedback / revoke / read / summary）
- **ERC-8004 Validation Registry**（validationRequest / validationResponse / summary）
- 一個最小的 **x402-style paywall**（因為 x402 本質上是 HTTP 402 的付款協議，鏈上通常需要的是「可驗證的付款事件」）

> 注意：ERC-8004 仍是 DRAFT；此專案是教學/參考用，不是 production hardened。

## 簡易用戶旅程（你要的 story）

1) **Agent 註冊**
- Agent owner 呼叫 `ERC8004IdentityRegistry.register(agentURI)` 鑄造一個 agent NFT（agentId）。
- agentURI 指向 agent registration file（可以是 `ipfs://...` / `https://...` / `data:...`）。

2) **宣告收款錢包（支援 x402）**
- 預設 `agentWallet = owner`。
- 若想換成另一個 wallet（例如服務端的 hot wallet / smart wallet），owner 呼叫 `setAgentWallet()`，並提供**由 newWallet 簽出的 EIP-712 簽名**，證明 newWallet 的控制權。

3) **買家用 x402（HTTP）呼叫付費 API**
- 在 x402 流程中，server 可能會回 402 + PAYMENT-REQUIRED header。
- buyer 付款後（鏈上或 facilitator），我們在鏈上用 `X402Paywall.payForEndpoint()` 付 stablecoin 給 agentWallet 並 emit `X402Payment`。
- off-chain 可以把 txHash/事件資訊放進 ERC-8004 的 feedback file `proofOfPayment`。

4) **買家留下回饋**
- buyer 呼叫 `ERC8004ReputationRegistry.giveFeedback()`，例如 tag1=`starred`、value=87。
- 任何人可用 `getSummary()` 快速取出某些 reviewer 地址集合下的平均評分（範例實作：normalize 到 18 decimals）。

5) **需要更強信任時：Validation**
- agent（owner/operator）呼叫 `validationRequest()` 提交 requestURI + requestHash。
- validator 合約/帳號回覆 `validationResponse()`，把 0..100 的結果寫入並 emit event。

## 專案結構

- `contracts/ERC8004X402Example.sol`
  - `ERC8004IdentityRegistry`
  - `ERC8004ReputationRegistry`
  - `ERC8004ValidationRegistry`
  - `X402Paywall`
  - `MockERC20`
- `test/erc8004-x402.js`

## Quickstart

```bash
cd erc8004-x402-example
npm install
npm test
```

## 測試涵蓋的重點

- Identity: register、setAgentURI
- Identity: `setAgentWallet`（EIP-712 typed data + ECDSA）
- x402 paywall: 付款到 `agentWallet` 並檢查餘額
- Reputation: giveFeedback → getSummary → revoke → getSummary
- Validation: request / response / read status
