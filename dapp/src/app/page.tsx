'use client'

import React, { useMemo, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  useAccount,
  useReadContract,
  useSignTypedData,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useChainId,
  usePublicClient,
} from 'wagmi'
import { hardhat, baseSepolia } from 'wagmi/chains'
import { formatUnits, isAddress, parseUnits, zeroHash, zeroAddress, type Hex, parseAbiItem } from 'viem'

import { getDeployment } from '@/config/deployment'
import { identityAbi, reputationAbi, validationAbi, paywallAbi, erc20Abi } from '@/lib/abis'
import { bytes32FromHexOrString, truncateAddr } from '@/lib/utils'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 text-sm font-semibold tracking-wide text-white/90">{title}</div>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 md:flex-row md:items-center">{children}</div>
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        'w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30 ' +
        (props.className ?? '')
      }
    />
  )
}

function Button({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={
        'rounded-md bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed'
      }
    >
      {children}
    </button>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/80">{children}</span>
}

function Help({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-white/55">{children}</div>
}

function useActiveDeployment() {
  const chainId = useChainId()
  return useMemo(() => {
    try {
      return getDeployment(chainId)
    } catch {
      return getDeployment(baseSepolia.id)
    }
  }, [chainId])
}

export default function HomePage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const [mode, setMode] = useState<'tutorial' | 'panels'>('tutorial')
  const [tab, setTab] = useState<'agent' | 'buyer' | 'validator'>('agent')

  const supportedChainIds: number[] = [baseSepolia.id, hardhat.id]

  const deployment = useActiveDeployment()

  const needChainFix = isConnected && !supportedChainIds.includes(chainId)

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-bold">ERC-8004 + x402 教學導覽 dApp</div>
            <div className="mt-1 text-sm text-white/70">
              你可以用 Base Sepolia（可分享）或 Hardhat localhost（本地快速）實際操作一輪：註冊 Agent 身分、設定收款錢包、買家付款、留下評價。
            </div>
          </div>
          <div className="flex items-center gap-3">
            {needChainFix ? (
              <div className="flex gap-2">
                <Button onClick={() => switchChainAsync({ chainId: baseSepolia.id })}>切到 Base Sepolia</Button>
                <Button onClick={() => switchChainAsync({ chainId: hardhat.id })}>切到 Hardhat</Button>
              </div>
            ) : null}
            <ConnectButton />
          </div>
        </div>

        <div className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
          <div className="text-sm text-white/70">
            <div>
              <span className="font-semibold text-white/90">Connected:</span>{' '}
              {isConnected ? <Pill>{truncateAddr(address)}</Pill> : <Pill>not connected</Pill>}
            </div>
            <div className="mt-2">
              <span className="font-semibold text-white/90">Chain:</span>{' '}
              <Pill>
                {chainId}{' '}
                {chainId === hardhat.id
                  ? '(hardhat 本地)'
                  : chainId === baseSepolia.id
                    ? '(Base Sepolia)'
                    : '(不支援的網路)'}
              </Pill>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setMode('tutorial')}
                className={
                  'rounded-md px-3 py-2 text-xs ' +
                  (mode === 'tutorial' ? 'bg-white text-black' : 'bg-white/10 text-white/80')
                }
              >
                教學導覽（推薦）
              </button>
              <button
                onClick={() => setMode('panels')}
                className={
                  'rounded-md px-3 py-2 text-xs ' +
                  (mode === 'panels' ? 'bg-white text-black' : 'bg-white/10 text-white/80')
                }
              >
                工具面板（進階）
              </button>
            </div>
          </div>
          <div className="text-xs text-white/60">
            <div className="font-semibold text-white/80">
              Contracts (from deployments/{chainId === baseSepolia.id ? 'base-sepolia' : 'localhost'}.json)
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1 font-mono">
              <div>Identity: {deployment.contracts.identity}</div>
              <div>Reputation: {deployment.contracts.reputation}</div>
              <div>Validation: {deployment.contracts.validation}</div>
              <div>MockUSDC: {deployment.contracts.usdc}</div>
              <div>Paywall: {deployment.contracts.paywall}</div>
            </div>
          </div>
        </div>

        {mode === 'tutorial' ? (
          <TutorialStepper />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setTab('agent')}
                className={
                  'rounded-md px-3 py-2 text-sm ' +
                  (tab === 'agent' ? 'bg-white text-black' : 'bg-white/10 text-white/80')
                }
              >
                Agent
              </button>
              <button
                onClick={() => setTab('buyer')}
                className={
                  'rounded-md px-3 py-2 text-sm ' +
                  (tab === 'buyer' ? 'bg-white text-black' : 'bg-white/10 text-white/80')
                }
              >
                Buyer
              </button>
              <button
                onClick={() => setTab('validator')}
                className={
                  'rounded-md px-3 py-2 text-sm ' +
                  (tab === 'validator' ? 'bg-white text-black' : 'bg-white/10 text-white/80')
                }
              >
                Validator
              </button>
            </div>

            {tab === 'agent' ? <AgentPanel /> : null}
            {tab === 'buyer' ? <BuyerPanel /> : null}
            {tab === 'validator' ? <ValidatorPanel /> : null}
          </>
        )}

        <div className="mt-10 text-xs text-white/50">
          Prereq: run <span className="font-mono">npm run node</span> +{' '}
          <span className="font-mono">npm run deploy:localhost</span> in the contracts folder, then refresh this page.
        </div>
      </div>
    </main>
  )
}

function TutorialStepper() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const deployment = useActiveDeployment()

  // Shared tutorial state (kept simple + editable).
  const [step, setStep] = useState(0)

  // We use agentId=1 for the happy path on a fresh chain.
  const [agentId, setAgentId] = useState('1')
  const agentIdBig = BigInt(agentId || '0')

  // --- Agent registration/URI ---
  const [agentURI, setAgentURI] = useState('ipfs://agent.json')
  const [newURI, setNewURI] = useState('https://example.com/agent.json')

  // --- setAgentWallet EIP-712 ---
  const [newWallet, setNewWallet] = useState('')
  const [deadline, setDeadline] = useState(() => String(Math.floor(Date.now() / 1000) + 3600))
  const deadlineBig = BigInt(deadline || '0')
  const [sig, setSig] = useState<Hex | ''>('')

  // --- Buyer / payment ---
  const usdcDecimals = 6
  const [mintAmount, setMintAmount] = useState('1000')
  const [approveAmount, setApproveAmount] = useState('1000')
  const [endpoint, setEndpoint] = useState('GET /price')
  const [payAmount, setPayAmount] = useState('200')
  const [refIdInput, setRefIdInput] = useState('req-1')
  const refId = useMemo(() => bytes32FromHexOrString(refIdInput), [refIdInput])

  // --- Feedback ---
  const [fbValue, setFbValue] = useState('87')
  const [fbDecimals, setFbDecimals] = useState('0')
  const [fbTag1, setFbTag1] = useState('starred')
  const [fbTag2, setFbTag2] = useState('')
  const [fbURI, setFbURI] = useState('ipfs://fb.json')
  const [fbHash, setFbHash] = useState('0x' + '0'.repeat(64))

  // --- Validation request/response ---
  const [validatorAddr, setValidatorAddr] = useState('')
  const [validationRequestURI, setValidationRequestURI] = useState('ipfs://req.json')
  const [validationReqId, setValidationReqId] = useState('job-1')
  const requestHash = useMemo(() => bytes32FromHexOrString(validationReqId), [validationReqId])

  const [validationResponse, setValidationResponse] = useState('100')
  const [validationResponseURI, setValidationResponseURI] = useState('ipfs://resp.json')
  const [validationResponseHash, setValidationResponseHash] = useState('0x' + '0'.repeat(64))
  const [validationTag, setValidationTag] = useState('passed')

  const domain = useMemo(() => {
    return {
      name: 'ERC8004IdentityRegistry',
      version: '1',
      chainId,
      verifyingContract: deployment.contracts.identity,
    } as const
  }, [chainId, deployment.contracts.identity])

  const types = useMemo(
    () => ({
      SetAgentWallet: [
        { name: 'agentId', type: 'uint256' },
        { name: 'newWallet', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ],
    }),
    [],
  )

  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData()

  const {
    writeContractAsync: writeAsync,
    data: hash,
    isPending,
    error,
  } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const walletRead = useReadContract({
    address: deployment.contracts.identity,
    abi: identityAbi,
    functionName: 'getAgentWallet',
    args: [agentIdBig],
    query: { enabled: agentIdBig > 0n },
  })

  const usdcBalance = useReadContract({
    address: deployment.contracts.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  })

  const usdcAllowance = useReadContract({
    address: deployment.contracts.usdc,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address ?? '0x0000000000000000000000000000000000000000', deployment.contracts.paywall],
    query: { enabled: !!address },
  })

  const lastIndex = useReadContract({
    address: deployment.contracts.reputation,
    abi: reputationAbi,
    functionName: 'getLastIndex',
    args: [agentIdBig, address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address && agentIdBig > 0n },
  })

  const validationStatus = useReadContract({
    address: deployment.contracts.validation,
    abi: validationAbi,
    functionName: 'getValidationStatus',
    args: [requestHash],
    query: { enabled: requestHash !== zeroHash },
  })

  const steps = [
    {
      title: '0. What you are about to do (end-to-end)',
      body: (
        <div className="grid gap-3 text-sm text-white/70">
          <div>
            This tutorial runs a full mini story on a fresh Hardhat chain:
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Agent owner mints an Agent NFT (ERC-8004 Identity)</li>
              <li>Agent sets an <span className="font-mono">agentWallet</span> using EIP-712 control proof</li>
              <li>Buyer mints + approves mock USDC</li>
              <li>Buyer pays for a paid endpoint (x402-style on-chain payment event)</li>
              <li>Buyer leaves feedback (ERC-8004 Reputation)</li>
              <li>Agent requests validation; validator responds (ERC-8004 Validation)</li>
            </ol>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3 text-xs text-white/60">
            Pre-reqs (outside the browser):
            <div className="mt-2 font-mono">npm run node</div>
            <div className="font-mono">npm run deploy:localhost</div>
            <div className="mt-2">Then connect MetaMask to <span className="font-mono">http://127.0.0.1:8545</span> (chainId 31337).</div>
          </div>
          <div className="text-xs text-white/60">
            You will switch accounts multiple times (Agent owner → New wallet → Buyer → Validator).
          </div>
        </div>
      ),
    },
    {
      title: '1. Agent（賣家）— 建立 ERC-8004 身分（register / mint agentId）',
      body: (
        <div className="grid gap-3">
          <div className="text-sm text-white/70">
            請先用 <span className="font-semibold text-white/90">Agent owner（賣家/Agent 擁有者）</span> 的錢包連線。
            這一步會在 Identity Registry 鑄造一個新的 Agent NFT，並得到 <span className="font-mono">agentId</span>。
          </div>
          <Row>
            <Input value={agentURI} onChange={(e) => setAgentURI(e.target.value)} placeholder="agentURI" />
            <Button
              disabled={!isConnected || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.identity,
                  abi: identityAbi,
                  functionName: 'register',
                  args: [agentURI],
                })
              }}
            >
              Register Agent
            </Button>
          </Row>
          <Help>
            <div>欄位說明：</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">agentURI</span>：指向「Agent 註冊檔/介紹檔」的 URI（可用 ipfs://、https://、或 data:）。
              </li>
            </ul>
          </Help>
          <div className="text-xs text-white/60">
            在全新鏈上通常第一個 agentId 會是 <span className="font-mono">1</span>（但在測試網可能不是，請以交易事件/畫面顯示為準）。
          </div>
          <Row>
            <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agentId（你的 Agent 編號）" />
            <div className="text-xs text-white/60">
              目前的 agentWallet（收款地址）： <span className="font-mono">{String(walletRead.data ?? '—')}</span>
            </div>
          </Row>
          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">agentId</span>：你的 Agent 身分（ERC-721 tokenId）。後續付款/評價都會指定這個。
              </li>
              <li>
                <span className="font-mono">agentWallet</span>：此 Agent 對外收款用的錢包地址（預設為 owner，可透過 setAgentWallet 更換）。
              </li>
            </ul>
          </Help>
        </div>
      ),
    },
    {
      title: '2. Agent（賣家）— 設定 Agent URI（setAgentURI）',
      body: (
        <div className="grid gap-3">
          <div className="text-sm text-white/70">
            更新 Agent 的「對外介紹檔」指標（ERC-8004 的 registration file URI）。通常是 ipfs://、https:// 或 data: URI。
          </div>
          <Row>
            <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agentId" />
            <Input value={newURI} onChange={(e) => setNewURI(e.target.value)} placeholder="newURI（新的 agentURI）" />
            <Button
              disabled={!isConnected || isPending || agentIdBig <= 0n}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.identity,
                  abi: identityAbi,
                  functionName: 'setAgentURI',
                  args: [agentIdBig, newURI],
                })
              }}
            >
              設定 Agent URI
            </Button>
          </Row>
          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">newURI</span>：新的 agentURI（你的 agent registration file/介紹頁連結）。
              </li>
            </ul>
          </Help>
        </div>
      ),
    },
    {
      title: '3. Agent（賣家）— 設定收款錢包（setAgentWallet，EIP-712 簽名驗證控制權）',
      body: (
        <div className="grid gap-3">
          <div className="text-sm text-white/70">
            為什麼要做這一步：Agent owner（擁有者）想把收款導到另一個錢包（例如伺服器熱錢包/智能錢包）。
            合約要求你提供證明，確認 <span className="font-mono">newWallet</span> 的控制權真的在你手上（用 EIP-712 簽名）。
          </div>

          <div className="rounded-md border border-white/10 bg-black/20 p-3 text-xs text-white/60">
            兩步驟流程（很重要）：
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                用 <span className="font-mono">newWallet</span> 那個帳號連線，點 <b>簽名（Sign typed data）</b>
              </li>
              <li>
                切回 <b>agent owner</b> 帳號，點 <b>送出 setAgentWallet</b>
              </li>
            </ol>
          </div>

          <Row>
            <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agentId" />
            <Input value={newWallet} onChange={(e) => setNewWallet(e.target.value)} placeholder="newWallet（新的收款地址 0x...）" />
            <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="deadline（簽名截止時間 unix 秒）" />
          </Row>
          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">newWallet</span>：你希望 Agent 收款改到的地址（可以是你另一個帳號）。
              </li>
              <li>
                <span className="font-mono">deadline</span>：這次簽名的有效期限（避免簽名被無限期重放）。
              </li>
            </ul>
          </Help>

          <Row>
            <Button
              disabled={!isConnected || !isAddress(newWallet) || isSigning || agentIdBig <= 0n || deadlineBig <= 0n}
              onClick={async () => {
                const signature = await signTypedDataAsync({
                  domain,
                  types,
                  primaryType: 'SetAgentWallet',
                  message: {
                    agentId: agentIdBig,
                    newWallet: newWallet as `0x${string}`,
                    deadline: deadlineBig,
                  },
                })
                setSig(signature)
              }}
            >
              1) 用 newWallet 簽名（Sign typed data）
            </Button>
            <Input value={sig} readOnly placeholder="signature（簽名結果 0x...）" />
          </Row>

          <Row>
            <Button
              disabled={!isConnected || !isAddress(newWallet) || !sig || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.identity,
                  abi: identityAbi,
                  functionName: 'setAgentWallet',
                  args: [agentIdBig, newWallet as `0x${string}`, deadlineBig, sig as Hex],
                })
              }}
            >
              2) 用 agent owner 送出 setAgentWallet
            </Button>
            <div className="text-xs text-white/60">
              更新後的 agentWallet： <span className="font-mono">{String(walletRead.data ?? '—')}</span>
            </div>
          </Row>
        </div>
      ),
    },
    {
      title: '4. Buyer（買家）— 取得測試幣 + 授權 Paywall（mint / approve）',
      body: (
        <div className="grid gap-3">
          <div className="text-sm text-white/70">
            請切換到 <span className="font-semibold text-white/90">Buyer（買家）</span> 的錢包帳號。
            然後先領取測試用的 mUSDC，並授權 Paywall 合約可以從你帳戶扣款。
          </div>

          <div className="text-xs text-white/60">
            餘額（Balance）： <span className="font-mono">{usdcBalance.data ? formatUnits(usdcBalance.data, usdcDecimals) : '—'}</span> mUSDC ·
            授權額度（Allowance）： <span className="font-mono">{usdcAllowance.data ? formatUnits(usdcAllowance.data, usdcDecimals) : '—'}</span>
          </div>

          <Row>
            <Input value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} placeholder="mint 數量（mUSDC）" />
            <Button
              disabled={!isConnected || isPending}
              onClick={async () => {
                if (!address) return
                await writeAsync({
                  address: deployment.contracts.usdc,
                  abi: erc20Abi,
                  functionName: 'mint',
                  args: [address, parseUnits(mintAmount || '0', usdcDecimals)],
                })
              }}
            >
              Mint（領取 mUSDC）
            </Button>
          </Row>
          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">mint 數量</span>：要領多少測試用 mUSDC（這是教學用 token）。
              </li>
            </ul>
          </Help>

          <Row>
            <Input value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)} placeholder="approve 數量（mUSDC）" />
            <Button
              disabled={!isConnected || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.usdc,
                  abi: erc20Abi,
                  functionName: 'approve',
                  args: [deployment.contracts.paywall, parseUnits(approveAmount || '0', usdcDecimals)],
                })
              }}
            >
              Approve（授權 Paywall）
            </Button>
          </Row>
          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">approve 數量</span>：允許 Paywall 從你帳戶扣款的上限（類似信用額度）。
              </li>
            </ul>
          </Help>
        </div>
      ),
    },
    {
      title: '5. Buyer（買家）— 付款（payForEndpoint / x402-style on-chain payment）',
      body: (
        <div className="grid gap-3">
          <div className="text-sm text-white/70">
            這一步在模擬「x402 付款」：在真正的 HTTP x402 流程中，服務端會回 402（Payment Required）並給付款指示，
            客戶端付款後再重試；而鏈上這裡我們示範的是「可驗證的付款事件」。
          </div>

          <Row>
            <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agentId（要付費的 Agent）" />
            <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="endpoint（你要付費的 API/功能）" />
          </Row>
          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">endpoint</span>：純教學用途，用來模擬「你付費解鎖的 API 路徑/功能」。
              </li>
            </ul>
          </Help>

          <Row>
            <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="付款金額（mUSDC）" />
            <Input value={refIdInput} onChange={(e) => setRefIdInput(e.target.value)} placeholder="refId（可輸入文字或 bytes32）" />
            <Button
              disabled={!isConnected || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.paywall,
                  abi: paywallAbi,
                  functionName: 'payForEndpoint',
                  args: [agentIdBig, endpoint, parseUnits(payAmount || '0', usdcDecimals), refId],
                })
              }}
            >
              付款（Pay）
            </Button>
          </Row>

          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">refId</span>：用來把「鏈上付款」和「鏈下 HTTP 請求」對起來的關聯 ID。
                你可以輸入一段文字（會自動 keccak256 變成 bytes32），或直接輸入 bytes32。
              </li>
            </ul>
          </Help>

          <div className="text-xs text-white/60">
            目前計算出的 refId（bytes32）： <span className="font-mono">{refId}</span>
          </div>

          <div className="text-xs text-white/60">
            收款方是此 Agent 的 <span className="font-mono">agentWallet</span>： <span className="font-mono">{String(walletRead.data ?? '—')}</span>
          </div>
        </div>
      ),
    },
    {
      title: '6. Buyer: giveFeedback (ERC-8004 reputation)',
      body: (
        <div className="grid gap-3">
          <div className="text-sm text-white/70">
            After payment, the buyer leaves feedback. Off-chain you can include proofs (like tx hash) inside your feedback URI.
          </div>
          <div className="text-xs text-white/60">
            Your last feedbackIndex for this agent: <span className="font-mono">{String(lastIndex.data ?? '—')}</span>
          </div>

          <Row>
            <Input value={fbValue} onChange={(e) => setFbValue(e.target.value)} placeholder="value (int128)" />
            <Input value={fbDecimals} onChange={(e) => setFbDecimals(e.target.value)} placeholder="valueDecimals" />
            <Input value={fbTag1} onChange={(e) => setFbTag1(e.target.value)} placeholder="tag1" />
            <Input value={fbTag2} onChange={(e) => setFbTag2(e.target.value)} placeholder="tag2" />
          </Row>

          <Row>
            <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="endpoint" />
            <Input value={fbURI} onChange={(e) => setFbURI(e.target.value)} placeholder="feedbackURI" />
            <Input value={fbHash} onChange={(e) => setFbHash(e.target.value)} placeholder="feedbackHash (bytes32)" />
          </Row>

          <Row>
            <Button
              disabled={!isConnected || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.reputation,
                  abi: reputationAbi,
                  functionName: 'giveFeedback',
                  args: [
                    agentIdBig,
                    BigInt(fbValue || '0'),
                    Number(fbDecimals || '0'),
                    fbTag1,
                    fbTag2,
                    endpoint,
                    fbURI,
                    (fbHash as Hex) || zeroHash,
                  ],
                })
              }}
            >
              Give Feedback
            </Button>
          </Row>
        </div>
      ),
    },
    {
      title: '7. Agent（賣家）— 發起驗證請求（validationRequest）',
      body: (
        <div className="grid gap-3">
          <div className="text-sm text-white/70">
            請切回 <span className="font-semibold text-white/90">Agent owner</span>。這一步代表「我希望第三方 validator 幫我驗證某次工作/交付」。
          </div>

          <Row>
            <Input
              value={validatorAddr}
              onChange={(e) => setValidatorAddr(e.target.value)}
              placeholder="validatorAddress（驗證者地址 0x...）"
            />
            <Input
              value={validationRequestURI}
              onChange={(e) => setValidationRequestURI(e.target.value)}
              placeholder="requestURI（鏈下請求資料連結）"
            />
          </Row>

          <Row>
            <Input
              value={validationReqId}
              onChange={(e) => setValidationReqId(e.target.value)}
              placeholder="requestId（輸入文字，會自動轉成 bytes32）"
            />
            <div className="text-xs text-white/60">
              requestHash（bytes32）： <span className="font-mono">{requestHash}</span>
            </div>
          </Row>

          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">validatorAddress</span>：指定誰有權回覆（之後只有這個地址能呼叫 validationResponse）。
              </li>
              <li>
                <span className="font-mono">requestURI</span>：鏈下描述「要驗證什麼」的資料（例如輸入輸出、證據、重現步驟）。
              </li>
              <li>
                <span className="font-mono">requestId</span>：教學用的簡化版，讓你用一段文字就能產生 requestHash（本質是 bytes32 id/commitment）。
              </li>
            </ul>
          </Help>

          <Row>
            <Button
              disabled={!isConnected || !isAddress(validatorAddr) || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.validation,
                  abi: validationAbi,
                  functionName: 'validationRequest',
                  args: [validatorAddr as `0x${string}`, agentIdBig, validationRequestURI, requestHash],
                })
              }}
            >
              送出驗證請求（validationRequest）
            </Button>
          </Row>
        </div>
      ),
    },
    {
      title: '8. Validator: respond (ERC-8004 validation response)',
      body: (
        <div className="grid gap-3">
          <div className="text-sm text-white/70">
            Switch to the <span className="font-semibold text-white/90">Validator</span> account (the exact address you used above).
            Only that validator can respond.
          </div>

          <div className="text-xs text-white/60">
            Current status (on-chain):{' '}
            <span className="font-mono">
              {validationStatus.data
                ? `validator=${validationStatus.data[0]} agentId=${validationStatus.data[1]} response=${validationStatus.data[2]} tag=${validationStatus.data[4]} lastUpdate=${validationStatus.data[5]}`
                : '—'}
            </span>
          </div>

          <Row>
            <Input value={String(requestHash)} readOnly placeholder="requestHash" />
            <Input
              value={validationResponse}
              onChange={(e) => setValidationResponse(e.target.value)}
              placeholder="response (0..100)"
            />
            <Input value={validationTag} onChange={(e) => setValidationTag(e.target.value)} placeholder="tag" />
          </Row>

          <Row>
            <Input
              value={validationResponseURI}
              onChange={(e) => setValidationResponseURI(e.target.value)}
              placeholder="responseURI"
            />
            <Input
              value={validationResponseHash}
              onChange={(e) => setValidationResponseHash(e.target.value)}
              placeholder="responseHash (bytes32)"
            />
            <Button
              disabled={!isConnected || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.validation,
                  abi: validationAbi,
                  functionName: 'validationResponse',
                  args: [requestHash, Number(validationResponse || '0'), validationResponseURI, validationResponseHash as Hex, validationTag],
                })
              }}
            >
              Submit validationResponse
            </Button>
          </Row>
        </div>
      ),
    },
    {
      title: '9. Done: what you proved',
      body: (
        <div className="grid gap-3 text-sm text-white/70">
          <div>
            You completed an end-to-end story:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>ERC-8004 Identity NFT minted + URI updated</li>
              <li>Agent wallet rotation enforced via EIP-712 control proof</li>
              <li>x402-style payment emitted on-chain + funds delivered to <span className="font-mono">agentWallet</span></li>
              <li>Reputation feedback written to chain</li>
              <li>Validation request/response written to chain</li>
            </ul>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3 text-xs text-white/60">
            Next: adapt this UI to your real HTTP x402 server. Typically you’d:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Generate a <span className="font-mono">refId</span> from HTTP request fields</li>
              <li>Verify the on-chain <span className="font-mono">X402Payment</span> event off-chain</li>
              <li>Store txHash/proof in your feedback / validation files</li>
            </ul>
          </div>
        </div>
      ),
    },
  ]

  const atStart = step <= 0
  const atEnd = step >= steps.length - 1

  return (
    <div className="grid gap-4">
      <Section title="Guided tutorial (recommended)">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">
              Step {step + 1} / {steps.length}: {steps[step]?.title}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md bg-white/10 px-3 py-2 text-xs text-white/80"
                onClick={() => setStep(0)}
              >
                Restart
              </button>
              <button
                className="rounded-md bg-white/10 px-3 py-2 text-xs text-white/80"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={atStart}
              >
                Back
              </button>
              <button
                className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                disabled={atEnd}
              >
                Next
              </button>
            </div>
          </div>

          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            {steps[step]?.body}
          </div>

          <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} />
        </div>
      </Section>

      <Section title="Quick tips while following the tutorial">
        <div className="grid gap-2 text-xs text-white/60">
          <div>
            • If you restart Hardhat node, redeploy and refresh the page (contract addresses change).
          </div>
          <div>
            • The <span className="font-mono">setAgentWallet</span> step requires signing as <span className="font-mono">newWallet</span>.
          </div>
          <div>
            • The validator response must be sent by the exact validator address used in <span className="font-mono">validationRequest</span>.
          </div>
        </div>
      </Section>
    </div>
  )
}

function AgentPanel() {
  const { address } = useAccount()

  const [agentURI, setAgentURI] = useState('ipfs://agent.json')
  const [agentId, setAgentId] = useState('1')
  const agentIdBig = BigInt(agentId || '0')

  const [newURI, setNewURI] = useState('https://example.com/agent.json')

  // --- setAgentWallet (2-step EIP-712) ---
  const [newWallet, setNewWallet] = useState('')
  const [deadline, setDeadline] = useState(() => String(Math.floor(Date.now() / 1000) + 3600))
  const deadlineBig = BigInt(deadline || '0')
  const [sig, setSig] = useState<Hex | ''>('')
  const chainId = useChainId()
  const deployment = useActiveDeployment()

  // --- validationRequest ---
  const [validatorAddr, setValidatorAddr] = useState('')
  const [validationRequestURI, setValidationRequestURI] = useState('ipfs://req.json')
  const [validationReqId, setValidationReqId] = useState('job-1')
  const requestHash = useMemo(() => bytes32FromHexOrString(validationReqId), [validationReqId])

  const domain = useMemo(() => {
    return {
      name: 'ERC8004IdentityRegistry',
      version: '1',
      chainId,
      verifyingContract: deployment.contracts.identity,
    } as const
  }, [chainId, deployment.contracts.identity])

  const types = useMemo(
    () => ({
      SetAgentWallet: [
        { name: 'agentId', type: 'uint256' },
        { name: 'newWallet', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ],
    }),
    [],
  )

  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData()

  const {
    writeContractAsync: writeAsync,
    data: hash,
    isPending,
    error,
  } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const walletRead = useReadContract({
    address: deployment.contracts.identity,
    abi: identityAbi,
    functionName: 'getAgentWallet',
    args: [agentIdBig],
    query: { enabled: agentIdBig > 0n },
  })

  return (
    <div className="grid gap-4">
      <Section title="1) 註冊 Agent（register / mint agentId）">
        <div className="grid gap-3">
          <Row>
            <Input value={agentURI} onChange={(e) => setAgentURI(e.target.value)} placeholder="agentURI" />
            <Button
              disabled={!address || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.identity,
                  abi: identityAbi,
                  functionName: 'register',
                  args: [agentURI],
                })
              }}
            >
              註冊（Register）
            </Button>
          </Row>
          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">agentURI</span>：Agent 的介紹/註冊檔 URI（ipfs://、https://、data: 都可）。
              </li>
              <li>
                送出後會在鏈上鑄造一個 ERC-721，tokenId 就是 <span className="font-mono">agentId</span>。
              </li>
            </ul>
          </Help>
        </div>
      </Section>

      <Section title="2) 更新 Agent URI（setAgentURI）">
        <div className="grid gap-3">
          <Row>
            <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agentId" />
            <Input value={newURI} onChange={(e) => setNewURI(e.target.value)} placeholder="newURI" />
            <Button
              disabled={!address || isPending || agentIdBig <= 0n}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.identity,
                  abi: identityAbi,
                  functionName: 'setAgentURI',
                  args: [agentIdBig, newURI],
                })
              }}
            >
              Set URI
            </Button>
          </Row>
        </div>
      </Section>

      <Section title="3) 設定收款地址（setAgentWallet / EIP-712）">
        <div className="grid gap-3">
          <div className="text-xs text-white/60">
            兩步驟流程：
            <ol className="list-decimal pl-5">
              <li>用 <span className="font-mono">newWallet</span> 那個帳號連線，點「Sign typed data」簽名</li>
              <li>切回 Agent owner 帳號，點「Submit setAgentWallet」送交易</li>
            </ol>
          </div>

          <Row>
            <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agentId" />
            <Input value={newWallet} onChange={(e) => setNewWallet(e.target.value)} placeholder="newWallet (0x...)" />
            <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="deadline (unix seconds)" />
          </Row>

          <Row>
            <Button
              disabled={!address || !isAddress(newWallet) || isSigning || agentIdBig <= 0n || deadlineBig <= 0n}
              onClick={async () => {
                const signature = await signTypedDataAsync({
                  domain,
                  types,
                  primaryType: 'SetAgentWallet',
                  message: {
                    agentId: agentIdBig,
                    newWallet: newWallet as `0x${string}`,
                    deadline: deadlineBig,
                  },
                })
                setSig(signature)
              }}
            >
              Sign typed data
            </Button>
            <Input value={sig} readOnly placeholder="signature (0x...)" />
          </Row>

          <Row>
            <Button
              disabled={!address || !isAddress(newWallet) || !sig || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.identity,
                  abi: identityAbi,
                  functionName: 'setAgentWallet',
                  args: [agentIdBig, newWallet as `0x${string}`, deadlineBig, sig as Hex],
                })
              }}
            >
              Submit setAgentWallet
            </Button>
            <div className="text-xs text-white/60">
              Current agentWallet: <span className="font-mono">{String(walletRead.data ?? '')}</span>
            </div>
          </Row>
        </div>
      </Section>

      <Section title="4) 發起驗證請求（validationRequest）">
        <div className="grid gap-3">
          <div className="text-sm text-white/70">
            這一步由 <b>Agent owner</b> 發起：指定某個 validator 來驗證你的工作/交付。
          </div>

          <Row>
            <Input
              value={validatorAddr}
              onChange={(e) => setValidatorAddr(e.target.value)}
              placeholder="validatorAddress（驗證者地址 0x...）"
            />
            <Input
              value={validationRequestURI}
              onChange={(e) => setValidationRequestURI(e.target.value)}
              placeholder="requestURI（鏈下請求資料連結）"
            />
          </Row>

          <Row>
            <Input
              value={validationReqId}
              onChange={(e) => setValidationReqId(e.target.value)}
              placeholder="requestId（輸入文字→自動轉 bytes32）"
            />
            <div className="text-xs text-white/60">
              requestHash： <span className="font-mono">{requestHash}</span>
            </div>
          </Row>

          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">requestURI</span>：建議放一個 JSON/文件，描述「要驗證什麼」、輸入輸出、重現步驟等。
              </li>
              <li>
                這裡為了教學方便，用 <span className="font-mono">requestId</span>（文字）直接生成 bytes32。
              </li>
            </ul>
          </Help>

          <Row>
            <Button
              disabled={!address || !isAddress(validatorAddr) || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.validation,
                  abi: validationAbi,
                  functionName: 'validationRequest',
                  args: [validatorAddr as `0x${string}`, agentIdBig, validationRequestURI, requestHash],
                })
              }}
            >
              送出驗證請求（validationRequest）
            </Button>
          </Row>

          <div className="text-xs text-white/60">
            送出後，請切到 Validator 分頁並用 <span className="font-mono">validatorAddress</span> 那個帳號連線，就會看到待回覆的 requestHash。
          </div>
        </div>
      </Section>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  )
}

function BuyerPanel() {
  const { address } = useAccount()
  const deployment = useActiveDeployment()
  const publicClient = usePublicClient()

  const [agentId, setAgentId] = useState('1')
  const agentIdBig = BigInt(agentId || '0')

  const agentWallet = useReadContract({
    address: deployment.contracts.identity,
    abi: identityAbi,
    functionName: 'getAgentWallet',
    args: [agentIdBig],
    query: { enabled: agentIdBig > 0n },
  })

  const [mintAmount, setMintAmount] = useState('1000') // in USDC units
  const [approveAmount, setApproveAmount] = useState('1000')

  const [endpoint, setEndpoint] = useState('GET /price')
  const [payAmount, setPayAmount] = useState('200')
  const [refIdInput, setRefIdInput] = useState('req-1')

  const [fbValue, setFbValue] = useState('87')
  const [fbDecimals, setFbDecimals] = useState('0')
  const [fbTag1, setFbTag1] = useState('starred')
  const [fbTag2, setFbTag2] = useState('')
  const [fbURI, setFbURI] = useState('ipfs://fb.json')
  const [fbHash, setFbHash] = useState('0x' + '0'.repeat(64))

  const [revokeIndex, setRevokeIndex] = useState('1')

  // --- Feedback history (via events logs) ---
  type FbHistoryItem =
    | {
        kind: 'NewFeedback'
        txHash: Hex
        blockNumber: bigint
        clientAddress: `0x${string}`
        feedbackIndex: bigint
        value: bigint
        valueDecimals: number
        tag1: string
        tag2: string
        endpoint: string
        feedbackURI: string
        feedbackHash: Hex
      }
    | {
        kind: 'FeedbackRevoked'
        txHash: Hex
        blockNumber: bigint
        clientAddress: `0x${string}`
        feedbackIndex: bigint
      }

  const [fbHistoryLoading, setFbHistoryLoading] = useState(false)
  const [fbHistoryError, setFbHistoryError] = useState<string | null>(null)
  const [fbHistory, setFbHistory] = useState<FbHistoryItem[]>([])

  const usdcDecimals = 6

  const balance = useReadContract({
    address: deployment.contracts.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  })

  const allowance = useReadContract({
    address: deployment.contracts.usdc,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address ?? '0x0000000000000000000000000000000000000000', deployment.contracts.paywall],
    query: { enabled: !!address },
  })

  const lastIndex = useReadContract({
    address: deployment.contracts.reputation,
    abi: reputationAbi,
    functionName: 'getLastIndex',
    args: [agentIdBig, address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address && agentIdBig > 0n },
  })

  const {
    writeContractAsync: writeAsync,
    data: hash,
    isPending,
    error,
  } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const refId = useMemo(() => bytes32FromHexOrString(refIdInput), [refIdInput])

  return (
    <div className="grid gap-4">
      <Section title="MockUSDC: mint + approve paywall">
        <div className="grid gap-3">
          <div className="text-xs text-white/60">
            Balance: <span className="font-mono">{balance.data ? formatUnits(balance.data, usdcDecimals) : '—'}</span>{' '}
            mUSDC · Allowance to Paywall:{' '}
            <span className="font-mono">{allowance.data ? formatUnits(allowance.data, usdcDecimals) : '—'}</span>
          </div>

          <Row>
            <Input value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} placeholder="mint amount (USDC)" />
            <Button
              disabled={!address || isPending}
              onClick={async () => {
                if (!address) return
                await writeAsync({
                  address: deployment.contracts.usdc,
                  abi: erc20Abi,
                  functionName: 'mint',
                  args: [address, parseUnits(mintAmount || '0', usdcDecimals)],
                })
              }}
            >
              Mint
            </Button>
          </Row>

          <Row>
            <Input
              value={approveAmount}
              onChange={(e) => setApproveAmount(e.target.value)}
              placeholder="approve amount (USDC)"
            />
            <Button
              disabled={!address || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.usdc,
                  abi: erc20Abi,
                  functionName: 'approve',
                  args: [deployment.contracts.paywall, parseUnits(approveAmount || '0', usdcDecimals)],
                })
              }}
            >
              Approve paywall
            </Button>
          </Row>
        </div>
      </Section>

      <Section title="付款（x402-style）：payForEndpoint（買家付給 agentWallet）">
        <div className="grid gap-3">
          <Row>
            <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agentId（要付費的 Agent）" />
            <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="endpoint（你要付費的 API/功能）" />
          </Row>

          {agentWallet.data === zeroAddress ? (
            <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">
              目前這個 <span className="font-mono">agentId</span> 的 <span className="font-mono">agentWallet</span> 是 0x0，代表尚未完成註冊或未設定收款地址。
              <div className="mt-1 text-red-200/80">
                請先到 <b>Agent</b> 分頁完成「Register Agent」，必要時再做「setAgentWallet」。
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-white/10 bg-black/20 p-3 text-xs text-white/60">
              收款地址（agentWallet）： <span className="font-mono">{String(agentWallet.data ?? '—')}</span>
            </div>
          )}

          <Row>
            <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="付款金額（mUSDC）" />
            <Input value={refIdInput} onChange={(e) => setRefIdInput(e.target.value)} placeholder="refId（可輸入文字或 bytes32）" />
            <Button
              disabled={!address || isPending || agentWallet.data === zeroAddress}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.paywall,
                  abi: paywallAbi,
                  functionName: 'payForEndpoint',
                  args: [agentIdBig, endpoint, parseUnits(payAmount || '0', usdcDecimals), refId],
                })
              }}
            >
              付款（Pay）
            </Button>
          </Row>

          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">refId</span>：把「鏈上付款」跟「鏈下 HTTP 請求」對起來的關聯 ID（輸入文字會自動轉成 bytes32）。
              </li>
            </ul>
          </Help>

          <div className="text-xs text-white/60">
            目前計算出的 refId（bytes32）： <span className="font-mono">{refId}</span>
          </div>
        </div>
      </Section>

      <Section title="評價（Reputation）：留下評價 / 撤回 / 查看歷史">
        <div className="grid gap-3">
          <div className="text-xs text-white/60">
            你對此 agentId 的最後一筆 feedbackIndex： <span className="font-mono">{String(lastIndex.data ?? '—')}</span>
          </div>

          <Row>
            <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agentId" />
            <Input value={fbValue} onChange={(e) => setFbValue(e.target.value)} placeholder="value（評分/數值，例如 87）" />
            <Input value={fbDecimals} onChange={(e) => setFbDecimals(e.target.value)} placeholder="valueDecimals（小數位，0..18）" />
          </Row>
          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">value</span> + <span className="font-mono">valueDecimals</span>：用固定小數表示評價（例如 87/100 就 value=87, decimals=0）。
              </li>
            </ul>
          </Help>

          <Row>
            <Input value={fbTag1} onChange={(e) => setFbTag1(e.target.value)} placeholder="tag1（主標籤，例如 starred）" />
            <Input value={fbTag2} onChange={(e) => setFbTag2(e.target.value)} placeholder="tag2（副標籤，可空）" />
            <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="endpoint（對應的 API/功能，可空）" />
          </Row>

          <Row>
            <Input value={fbURI} onChange={(e) => setFbURI(e.target.value)} placeholder="feedbackURI（補充說明檔連結，可空）" />
            <Input value={fbHash} onChange={(e) => setFbHash(e.target.value)} placeholder="feedbackHash（bytes32，可 0x0）" />
            <Button
              disabled={!address || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.reputation,
                  abi: reputationAbi,
                  functionName: 'giveFeedback',
                  args: [
                    agentIdBig,
                    BigInt(fbValue || '0'),
                    Number(fbDecimals || '0'),
                    fbTag1,
                    fbTag2,
                    endpoint,
                    fbURI,
                    (fbHash as Hex) || zeroHash,
                  ],
                })
              }}
            >
              留下評價（giveFeedback）
            </Button>
          </Row>
          <Help>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-mono">tag1/tag2</span>：方便分類與過濾（例如 starred / responseTime）。
              </li>
              <li>
                <span className="font-mono">feedbackURI</span>：指向鏈下 JSON（可放 proofOfPayment、A2A/MCP context、截圖等）。
              </li>
              <li>
                <span className="font-mono">feedbackHash</span>：鏈下檔案的 keccak256（若是 IPFS 這欄可填 0x0）。
              </li>
            </ul>
          </Help>

          <Row>
            <Input value={revokeIndex} onChange={(e) => setRevokeIndex(e.target.value)} placeholder="feedbackIndex（要撤回哪一筆）" />
            <Button
              disabled={!address || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.reputation,
                  abi: reputationAbi,
                  functionName: 'revokeFeedback',
                  args: [agentIdBig, BigInt(revokeIndex || '0')],
                })
              }}
            >
              撤回（revokeFeedback）
            </Button>
          </Row>

          <div className="mt-2 rounded-md border border-white/10 bg-black/20 p-3">
            <div className="text-sm font-semibold text-white/80">評價歷史（事件 logs）</div>
            <div className="mt-1 text-xs text-white/60">
              這裡會直接從鏈上讀取 <span className="font-mono">NewFeedback</span> / <span className="font-mono">FeedbackRevoked</span> 事件並列出。
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                disabled={fbHistoryLoading || !publicClient}
                onClick={async () => {
                  try {
                    setFbHistoryLoading(true)
                    setFbHistoryError(null)

                    const newFeedbackEvent = parseAbiItem(
                      'event NewFeedback(uint256 indexed agentId,address indexed clientAddress,uint64 feedbackIndex,int128 value,uint8 valueDecimals,string indexed indexedTag1,string tag1,string tag2,string endpoint,string feedbackURI,bytes32 feedbackHash)',
                    )
                    const revokedEvent = parseAbiItem(
                      'event FeedbackRevoked(uint256 indexed agentId,address indexed clientAddress,uint64 indexed feedbackIndex)',
                    )

                    const fromBlock = 0n
                    const [newLogs, revokedLogs] = await Promise.all([
                      publicClient!.getLogs({
                        address: deployment.contracts.reputation,
                        event: newFeedbackEvent,
                        args: { agentId: agentIdBig },
                        fromBlock,
                      }),
                      publicClient!.getLogs({
                        address: deployment.contracts.reputation,
                        event: revokedEvent,
                        args: { agentId: agentIdBig },
                        fromBlock,
                      }),
                    ])

                    const items: FbHistoryItem[] = []

                    for (const l of newLogs) {
                      const a: any = l.args
                      items.push({
                        kind: 'NewFeedback',
                        txHash: l.transactionHash,
                        blockNumber: l.blockNumber,
                        clientAddress: (a.clientAddress || zeroAddress) as `0x${string}`,
                        feedbackIndex: BigInt(a.feedbackIndex ?? 0),
                        value: BigInt(a.value ?? 0),
                        valueDecimals: Number(a.valueDecimals ?? 0),
                        tag1: String(a.tag1 ?? ''),
                        tag2: String(a.tag2 ?? ''),
                        endpoint: String(a.endpoint ?? ''),
                        feedbackURI: String(a.feedbackURI ?? ''),
                        feedbackHash: (a.feedbackHash || zeroHash) as Hex,
                      })
                    }

                    for (const l of revokedLogs) {
                      const a: any = l.args
                      items.push({
                        kind: 'FeedbackRevoked',
                        txHash: l.transactionHash,
                        blockNumber: l.blockNumber,
                        clientAddress: (a.clientAddress || zeroAddress) as `0x${string}`,
                        feedbackIndex: BigInt(a.feedbackIndex ?? 0),
                      })
                    }

                    items.sort((x, y) => (x.blockNumber > y.blockNumber ? -1 : 1))
                    setFbHistory(items)
                  } catch (e: any) {
                    setFbHistoryError(e?.shortMessage || e?.message || String(e))
                  } finally {
                    setFbHistoryLoading(false)
                  }
                }}
              >
                {fbHistoryLoading ? '載入中…' : '載入評價歷史'}
              </Button>

              {fbHistoryError ? <div className="text-xs text-red-200">{fbHistoryError}</div> : null}
            </div>

            <div className="mt-3 grid gap-2">
              {fbHistory.length === 0 ? (
                <div className="text-xs text-white/50">尚無資料（或還沒按「載入評價歷史」）。</div>
              ) : (
                fbHistory.map((it, i) => (
                  <div key={i} className="rounded-md border border-white/10 bg-white/5 p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-white/80">
                        {it.kind === 'NewFeedback' ? 'NewFeedback（新增評價）' : 'FeedbackRevoked（撤回）'}
                      </div>
                      <div className="font-mono text-white/50">{truncateAddr(it.txHash)}</div>
                    </div>
                    <div className="mt-2 grid gap-1 text-white/70">
                      <div>
                        client：<span className="font-mono">{truncateAddr(it.clientAddress)}</span>
                      </div>
                      <div>
                        feedbackIndex：<span className="font-mono">{String(it.feedbackIndex)}</span>
                      </div>
                      {it.kind === 'NewFeedback' ? (
                        <>
                          <div>
                            value：<span className="font-mono">{String(it.value)}</span>（decimals {it.valueDecimals}）
                          </div>
                          <div>
                            tag：<span className="font-mono">{it.tag1}</span> {it.tag2 ? ` / ${it.tag2}` : ''}
                          </div>
                          <div>
                            endpoint：<span className="font-mono">{it.endpoint || '（空）'}</span>
                          </div>
                          <div>
                            feedbackURI：<span className="font-mono">{it.feedbackURI || '（空）'}</span>
                          </div>
                          <div>
                            feedbackHash：<span className="font-mono">{truncateAddr(it.feedbackHash)}</span>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Section>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  )
}

function ValidatorPanel() {
  const { address } = useAccount()
  const deployment = useActiveDeployment()

  // Validator = 第三方驗證者（不是 agent、也不是買家）
  // 用來對 agent 的工作/輸出做「可追蹤的外部驗證」。

  const [requestHashInput, setRequestHashInput] = useState('')
  const [response, setResponse] = useState('100')
  const [responseURI, setResponseURI] = useState('ipfs://resp.json')
  const [responseHash, setResponseHash] = useState('0x' + '0'.repeat(64))
  const [tag, setTag] = useState('passed')

  const validatorRequests = useReadContract({
    address: deployment.contracts.validation,
    abi: validationAbi,
    functionName: 'getValidatorRequests',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  })

  const picked = (requestHashInput || (validatorRequests.data?.[0] as string) || '') as Hex | ''

  const status = useReadContract({
    address: deployment.contracts.validation,
    abi: validationAbi,
    functionName: 'getValidationStatus',
    args: picked ? [picked as Hex] : undefined,
    query: { enabled: !!picked },
  })

  const {
    writeContractAsync: writeAsync,
    data: hash,
    isPending,
    error,
  } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  return (
    <div className="grid gap-4">
      <Section title="Validator（驗證者）：查看/回覆驗證請求">
        <div className="grid gap-3">
          <div className="text-xs text-white/60">
            你目前是 Validator 地址：<span className="font-mono">{address ?? '—'}</span>
            （共找到 <span className="font-mono">{String(validatorRequests.data?.length ?? 0)}</span> 筆 requestHash）
          </div>

          <div className="rounded-md border border-white/10 bg-black/20 p-3 text-xs text-white/60">
            <div className="font-semibold text-white/80">這個分頁在做什麼？</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Agent 可以對外發出「請驗證我的工作」的請求（<span className="font-mono">validationRequest</span>），內容放在鏈下（requestURI），
                鏈上只存一個 <span className="font-mono">requestHash</span> 做為承諾（commitment）。
              </li>
              <li>
                Validator 看到 requestHash 後，用自己的方法驗證（重跑、審核、TEE、zk proof…），然後回覆 <span className="font-mono">validationResponse</span>。
              </li>
              <li>
                回覆會被記錄在鏈上，讓任何人都能查到「這個 agentId 被哪些 validator 以什麼分數/狀態驗證過」。
              </li>
            </ul>
          </div>
          <div className="max-h-40 overflow-auto rounded-md border border-white/10 bg-black/20 p-2 text-xs font-mono">
            {(validatorRequests.data ?? []).map((h) => (
              <div key={h as string} className="flex items-center justify-between gap-2">
                <span>{h as string}</span>
                <button
                  className="rounded bg-white/10 px-2 py-1 text-[11px]"
                  onClick={() => setRequestHashInput(h as string)}
                >
                  使用
                </button>
              </div>
            ))}
          </div>

          <Row>
            <Input
              value={requestHashInput}
              onChange={(e) => setRequestHashInput(e.target.value)}
              placeholder="requestHash (bytes32)"
            />
          </Row>

          <div className="text-xs text-white/60">
            Status:{' '}
            <span className="font-mono">
              {status.data
                ? `agentId=${status.data[1]} response=${status.data[2]} tag=${status.data[4]} lastUpdate=${status.data[5]}`
                : '—'}
            </span>
          </div>
        </div>
      </Section>

      <Section title="Respond to validationRequest (validator only)">
        <div className="grid gap-3">
          <Row>
            <Input value={picked} readOnly placeholder="requestHash" />
            <Input value={response} onChange={(e) => setResponse(e.target.value)} placeholder="response (0..100)" />
            <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="tag" />
          </Row>
          <Row>
            <Input value={responseURI} onChange={(e) => setResponseURI(e.target.value)} placeholder="responseURI" />
            <Input
              value={responseHash}
              onChange={(e) => setResponseHash(e.target.value)}
              placeholder="responseHash (bytes32)"
            />
            <Button
              disabled={!address || !picked || isPending}
              onClick={async () => {
                await writeAsync({
                  address: deployment.contracts.validation,
                  abi: validationAbi,
                  functionName: 'validationResponse',
                  args: [picked as Hex, Number(response || '0'), responseURI, responseHash as Hex, tag],
                })
              }}
            >
              Submit response
            </Button>
          </Row>
        </div>
      </Section>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  )
}

function TxStatus({
  hash,
  isPending,
  isConfirming,
  isSuccess,
  error,
}: {
  hash?: Hex
  isPending?: boolean
  isConfirming?: boolean
  isSuccess?: boolean
  error?: Error | null
}) {
  if (!hash && !error && !isPending) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
      <div className="font-semibold text-white/90">Transaction</div>
      {hash ? <div className="mt-2 font-mono">hash: {hash}</div> : null}
      {isPending ? <div className="mt-2">awaiting wallet confirmation…</div> : null}
      {isConfirming ? <div className="mt-2">confirming on-chain…</div> : null}
      {isSuccess ? <div className="mt-2 text-emerald-300">confirmed ✅</div> : null}
      {error ? <div className="mt-2 text-red-300">error: {error.message}</div> : null}
    </div>
  )
}
