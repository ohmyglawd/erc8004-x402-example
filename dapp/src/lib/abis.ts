import { parseAbi } from 'viem'

// Minimal ABIs for the example dapp.

export const identityAbi = parseAbi([
  'event Registered(uint256 indexed agentId,string agentURI,address indexed owner)',
  'event URIUpdated(uint256 indexed agentId,string newURI,address indexed updatedBy)',
  'event MetadataSet(uint256 indexed agentId,string indexed indexedMetadataKey,string metadataKey,bytes metadataValue)',
  // NOTE: to keep the frontend types simple, we only include register(string).
  'function register(string agentURI) external returns (uint256 agentId)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function getAgentWallet(uint256 agentId) external view returns (address)',
  'function setAgentURI(uint256 agentId,string newURI) external',
  'function setAgentWallet(uint256 agentId,address newWallet,uint256 deadline,bytes signature) external',
])

export const reputationAbi = parseAbi([
  'event NewFeedback(uint256 indexed agentId,address indexed clientAddress,uint64 feedbackIndex,int128 value,uint8 valueDecimals,string indexed indexedTag1,string tag1,string tag2,string endpoint,string feedbackURI,bytes32 feedbackHash)',
  'event FeedbackRevoked(uint256 indexed agentId,address indexed clientAddress,uint64 indexed feedbackIndex)',
  'function giveFeedback(uint256 agentId,int128 value,uint8 valueDecimals,string tag1,string tag2,string endpoint,string feedbackURI,bytes32 feedbackHash) external',
  'function revokeFeedback(uint256 agentId,uint64 feedbackIndex) external',
  'function getLastIndex(uint256 agentId,address clientAddress) external view returns (uint64)',
  'function getClients(uint256 agentId) external view returns (address[])',
  'function getSummary(uint256 agentId,address[] clientAddresses,string tag1,string tag2) external view returns (uint64 count,int128 summaryValue,uint8 summaryValueDecimals)',
])

export const validationAbi = parseAbi([
  'event ValidationRequest(address indexed validatorAddress,uint256 indexed agentId,string requestURI,bytes32 indexed requestHash)',
  'event ValidationResponse(address indexed validatorAddress,uint256 indexed agentId,bytes32 indexed requestHash,uint8 response,string responseURI,bytes32 responseHash,string tag)',
  'function validationRequest(address validatorAddress,uint256 agentId,string requestURI,bytes32 requestHash) external',
  'function validationResponse(bytes32 requestHash,uint8 response,string responseURI,bytes32 responseHash,string tag) external',
  'function getValidationStatus(bytes32 requestHash) external view returns (address validatorAddress,uint256 agentId,uint8 response,bytes32 responseHash,string tag,uint256 lastUpdate)',
  'function getValidatorRequests(address validatorAddress) external view returns (bytes32[])',
  'function getAgentValidations(uint256 agentId) external view returns (bytes32[])',
])

export const paywallAbi = parseAbi([
  'event X402Payment(address indexed payer,uint256 indexed agentId,address indexed paidTo,uint256 amount,string endpoint,bytes32 refId)',
  'function payForEndpoint(uint256 agentId,string endpoint,uint256 amount,bytes32 refId) external',
])

export const erc20Abi = parseAbi([
  'function decimals() external view returns (uint8)',
  'function balanceOf(address) external view returns (uint256)',
  'function allowance(address owner,address spender) external view returns (uint256)',
  'function approve(address spender,uint256 value) external returns (bool)',
  'function mint(address to,uint256 value) external',
])
