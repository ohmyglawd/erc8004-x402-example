// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Example implementation of the on-chain registries described in ERC-8004.
///         This is a learning / reference implementation (not production-hardened).
/// @dev ERC-8004 is currently a DRAFT. Treat this code as a starting point.

// =============================================================
//                         Identity Registry
// =============================================================

contract ERC8004IdentityRegistry is ERC721URIStorage, EIP712 {
  using ECDSA for bytes32;

  struct MetadataEntry {
    string metadataKey;
    bytes metadataValue;
  }

  // EIP-712
  bytes32 public constant SET_AGENT_WALLET_TYPEHASH =
    keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)");

  // tokenId counter
  uint256 private _nextId = 1;

  // Optional on-chain metadata (keyed by keccak256(metadataKey))
  mapping(uint256 agentId => mapping(bytes32 keyHash => bytes value)) private _metadata;

  // Reserved key: agentWallet
  string public constant RESERVED_AGENT_WALLET_KEY = "agentWallet";
  bytes32 private constant _RESERVED_AGENT_WALLET_HASH = keccak256(bytes("agentWallet"));

  mapping(uint256 agentId => address wallet) private _agentWallet;

  event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
  event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);

  /// @dev Matches the ERC-8004 event signature (note: duplicated key for indexed filtering).
  event MetadataSet(
    uint256 indexed agentId,
    string indexed indexedMetadataKey,
    string metadataKey,
    bytes metadataValue
  );

  error NotOwnerOrOperator();
  error ReservedKey();
  error InvalidSignature();
  error ExpiredSignature();

  constructor() ERC721("ERC8004 Agent Registry", "AGENT") EIP712("ERC8004IdentityRegistry", "1") {}

  // ------------------------ Views ------------------------

  function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory) {
    bytes32 h = keccak256(bytes(metadataKey));
    if (h == _RESERVED_AGENT_WALLET_HASH) {
      return abi.encode(_agentWallet[agentId]);
    }
    return _metadata[agentId][h];
  }

  function getAgentWallet(uint256 agentId) external view returns (address) {
    return _agentWallet[agentId];
  }

  // --------------------- Registration ---------------------

  function register(string memory agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId) {
    agentId = _register(agentURI);

    // reserved key emits first
    emit MetadataSet(agentId, RESERVED_AGENT_WALLET_KEY, RESERVED_AGENT_WALLET_KEY, abi.encode(_agentWallet[agentId]));

    for (uint256 i = 0; i < metadata.length; i++) {
      _setMetadata(agentId, metadata[i].metadataKey, metadata[i].metadataValue);
    }
  }

  function register(string memory agentURI) external returns (uint256 agentId) {
    agentId = _register(agentURI);
    emit MetadataSet(agentId, RESERVED_AGENT_WALLET_KEY, RESERVED_AGENT_WALLET_KEY, abi.encode(_agentWallet[agentId]));
  }

  function register() external returns (uint256 agentId) {
    agentId = _register("");
    emit MetadataSet(agentId, RESERVED_AGENT_WALLET_KEY, RESERVED_AGENT_WALLET_KEY, abi.encode(_agentWallet[agentId]));
  }

  function _register(string memory agentURI) internal returns (uint256 agentId) {
    agentId = _nextId++;
    _safeMint(msg.sender, agentId);

    if (bytes(agentURI).length != 0) {
      _setTokenURI(agentId, agentURI);
    }

    // initial wallet is owner's address
    _agentWallet[agentId] = msg.sender;

    emit Registered(agentId, agentURI, msg.sender);
  }

  // ------------------------ Updates ------------------------

  function setAgentURI(uint256 agentId, string calldata newURI) external {
    _requireOwnerOrOperator(agentId);
    _setTokenURI(agentId, newURI);
    emit URIUpdated(agentId, newURI, msg.sender);
  }

  function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external {
    _requireOwnerOrOperator(agentId);
    _setMetadata(agentId, metadataKey, metadataValue);
  }

  function _setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) internal {
    bytes32 h = keccak256(bytes(metadataKey));
    if (h == _RESERVED_AGENT_WALLET_HASH) revert ReservedKey();

    _metadata[agentId][h] = metadataValue;
    emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
  }

  /// @notice Update the agent wallet after proving control of newWallet.
  /// @dev newWallet must sign an EIP-712 message; EOAs via ECDSA, contract wallets via ERC-1271.
  function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external {
    _requireOwnerOrOperator(agentId);
    if (block.timestamp > deadline) revert ExpiredSignature();

    bytes32 structHash = keccak256(abi.encode(SET_AGENT_WALLET_TYPEHASH, agentId, newWallet, deadline));
    bytes32 digest = _hashTypedDataV4(structHash);

    if (!_isValidWalletSignature(newWallet, digest, signature)) revert InvalidSignature();

    _agentWallet[agentId] = newWallet;
    emit MetadataSet(agentId, RESERVED_AGENT_WALLET_KEY, RESERVED_AGENT_WALLET_KEY, abi.encode(newWallet));
  }

  function unsetAgentWallet(uint256 agentId) external {
    _requireOwnerOrOperator(agentId);
    _agentWallet[agentId] = address(0);
    emit MetadataSet(agentId, RESERVED_AGENT_WALLET_KEY, RESERVED_AGENT_WALLET_KEY, abi.encode(address(0)));
  }

  // --------------------- Internals ---------------------

  function _requireOwnerOrOperator(uint256 agentId) internal view {
    address owner = ownerOf(agentId);
    if (
      msg.sender != owner &&
      !isApprovedForAll(owner, msg.sender) &&
      getApproved(agentId) != msg.sender
    ) {
      revert NotOwnerOrOperator();
    }
  }

  function _isValidWalletSignature(address wallet, bytes32 digest, bytes calldata signature) internal view returns (bool) {
    if (wallet.code.length == 0) {
      address recovered = digest.recover(signature);
      return recovered == wallet;
    }

    // ERC-1271
    (bool ok, bytes memory ret) = wallet.staticcall(
      abi.encodeWithSelector(IERC1271.isValidSignature.selector, digest, signature)
    );
    if (!ok || ret.length < 32) return false;
    bytes4 magic = abi.decode(ret, (bytes4));
    return magic == IERC1271.isValidSignature.selector;
  }

  /// @dev When the agent is transferred, agentWallet must be cleared.
  function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
    address from = super._update(to, tokenId, auth);
    if (from != address(0) && to != from) {
      _agentWallet[tokenId] = address(0);
      emit MetadataSet(tokenId, RESERVED_AGENT_WALLET_KEY, RESERVED_AGENT_WALLET_KEY, abi.encode(address(0)));
    }
    return from;
  }
}

// =============================================================
//                        Reputation Registry
// =============================================================

contract ERC8004ReputationRegistry {
  address private immutable _identityRegistry;

  struct Feedback {
    int128 value;
    uint8 valueDecimals;
    string tag1;
    string tag2;
    bool isRevoked;
  }

  // agentId => client => last index
  mapping(uint256 agentId => mapping(address client => uint64 lastIndex)) private _lastIndex;

  // agentId => client => feedbackIndex (1-indexed) => feedback
  mapping(uint256 agentId => mapping(address client => mapping(uint64 idx => Feedback fb))) private _feedback;

  // agentId => clients list (for getClients)
  mapping(uint256 agentId => address[] clients) private _clients;
  mapping(uint256 agentId => mapping(address client => bool seen)) private _clientSeen;

  event NewFeedback(
    uint256 indexed agentId,
    address indexed clientAddress,
    uint64 feedbackIndex,
    int128 value,
    uint8 valueDecimals,
    string indexed indexedTag1,
    string tag1,
    string tag2,
    string endpoint,
    string feedbackURI,
    bytes32 feedbackHash
  );

  event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex);

  event ResponseAppended(
    uint256 indexed agentId,
    address indexed clientAddress,
    uint64 feedbackIndex,
    address indexed responder,
    string responseURI,
    bytes32 responseHash
  );

  error InvalidValueDecimals();
  error AgentNotRegistered();
  error SelfFeedbackNotAllowed();

  constructor(address identityRegistry_) {
    _identityRegistry = identityRegistry_;
  }

  function getIdentityRegistry() external view returns (address identityRegistry) {
    return _identityRegistry;
  }

  // --------------------- Write functions ---------------------

  function giveFeedback(
    uint256 agentId,
    int128 value,
    uint8 valueDecimals,
    string calldata tag1,
    string calldata tag2,
    string calldata endpoint,
    string calldata feedbackURI,
    bytes32 feedbackHash
  ) external {
    if (valueDecimals > 18) revert InvalidValueDecimals();

    // Reverts if not minted.
    address owner = IERC721(_identityRegistry).ownerOf(agentId);

    // submitter MUST NOT be the agent owner or an approved operator.
    if (
      msg.sender == owner ||
      IERC721(_identityRegistry).getApproved(agentId) == msg.sender ||
      IERC721(_identityRegistry).isApprovedForAll(owner, msg.sender)
    ) {
      revert SelfFeedbackNotAllowed();
    }

    uint64 next = _lastIndex[agentId][msg.sender] + 1;
    _lastIndex[agentId][msg.sender] = next;

    _feedback[agentId][msg.sender][next] = Feedback({
      value: value,
      valueDecimals: valueDecimals,
      tag1: tag1,
      tag2: tag2,
      isRevoked: false
    });

    if (!_clientSeen[agentId][msg.sender]) {
      _clientSeen[agentId][msg.sender] = true;
      _clients[agentId].push(msg.sender);
    }

    emit NewFeedback(agentId, msg.sender, next, value, valueDecimals, tag1, tag1, tag2, endpoint, feedbackURI, feedbackHash);
  }

  function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
    Feedback storage fb = _feedback[agentId][msg.sender][feedbackIndex];
    // If it was never written, it will be default; we still allow marking revoked.
    fb.isRevoked = true;
    emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
  }

  function appendResponse(
    uint256 agentId,
    address clientAddress,
    uint64 feedbackIndex,
    string calldata responseURI,
    bytes32 responseHash
  ) external {
    emit ResponseAppended(agentId, clientAddress, feedbackIndex, msg.sender, responseURI, responseHash);
  }

  // --------------------- Read functions ---------------------

  function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
    return _lastIndex[agentId][clientAddress];
  }

  function getClients(uint256 agentId) external view returns (address[] memory) {
    return _clients[agentId];
  }

  function readFeedback(
    uint256 agentId,
    address clientAddress,
    uint64 feedbackIndex
  ) external view returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked) {
    Feedback storage fb = _feedback[agentId][clientAddress][feedbackIndex];
    return (fb.value, fb.valueDecimals, fb.tag1, fb.tag2, fb.isRevoked);
  }

  function getSummary(
    uint256 agentId,
    address[] calldata clientAddresses,
    string calldata tag1,
    string calldata tag2
  ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals) {
    require(clientAddresses.length > 0, "clientAddresses required");

    // Return average value across selected feedbacks, normalized to 18 decimals.
    int256 sum = 0;
    uint64 c = 0;

    for (uint256 i = 0; i < clientAddresses.length; i++) {
      address client = clientAddresses[i];
      uint64 last = _lastIndex[agentId][client];
      for (uint64 idx = 1; idx <= last; idx++) {
        Feedback storage fb = _feedback[agentId][client][idx];
        if (fb.isRevoked) continue;
        if (bytes(tag1).length != 0 && keccak256(bytes(fb.tag1)) != keccak256(bytes(tag1))) continue;
        if (bytes(tag2).length != 0 && keccak256(bytes(fb.tag2)) != keccak256(bytes(tag2))) continue;

        int256 scaled = int256(fb.value);
        if (fb.valueDecimals < 18) {
          scaled = scaled * int256(10 ** (18 - fb.valueDecimals));
        } else if (fb.valueDecimals > 18) {
          scaled = scaled / int256(10 ** (fb.valueDecimals - 18));
        }
        sum += scaled;
        c++;
      }
    }

    if (c == 0) return (0, 0, 18);
    int256 avg = sum / int256(uint256(c));

    // clamp into int128 range (example implementation)
    if (avg > type(int128).max) avg = type(int128).max;
    if (avg < type(int128).min) avg = type(int128).min;

    return (c, int128(avg), 18);
  }

  function readAllFeedback(
    uint256 agentId,
    address[] calldata clientAddresses,
    string calldata tag1,
    string calldata tag2,
    bool includeRevoked
  ) external view returns (
    address[] memory clients,
    uint64[] memory feedbackIndexes,
    int128[] memory values,
    uint8[] memory valueDecimals,
    string[] memory tag1s,
    string[] memory tag2s,
    bool[] memory revokedStatuses
  ) {
    // First pass: count matches
    uint256 total = 0;
    for (uint256 i = 0; i < clientAddresses.length; i++) {
      address client = clientAddresses[i];
      uint64 last = _lastIndex[agentId][client];
      for (uint64 idx = 1; idx <= last; idx++) {
        Feedback storage fb = _feedback[agentId][client][idx];
        if (!includeRevoked && fb.isRevoked) continue;
        if (bytes(tag1).length != 0 && keccak256(bytes(fb.tag1)) != keccak256(bytes(tag1))) continue;
        if (bytes(tag2).length != 0 && keccak256(bytes(fb.tag2)) != keccak256(bytes(tag2))) continue;
        total++;
      }
    }

    clients = new address[](total);
    feedbackIndexes = new uint64[](total);
    values = new int128[](total);
    valueDecimals = new uint8[](total);
    tag1s = new string[](total);
    tag2s = new string[](total);
    revokedStatuses = new bool[](total);

    uint256 k = 0;
    for (uint256 i = 0; i < clientAddresses.length; i++) {
      address client = clientAddresses[i];
      uint64 last = _lastIndex[agentId][client];
      for (uint64 idx = 1; idx <= last; idx++) {
        Feedback storage fb = _feedback[agentId][client][idx];
        if (!includeRevoked && fb.isRevoked) continue;
        if (bytes(tag1).length != 0 && keccak256(bytes(fb.tag1)) != keccak256(bytes(tag1))) continue;
        if (bytes(tag2).length != 0 && keccak256(bytes(fb.tag2)) != keccak256(bytes(tag2))) continue;

        clients[k] = client;
        feedbackIndexes[k] = idx;
        values[k] = fb.value;
        valueDecimals[k] = fb.valueDecimals;
        tag1s[k] = fb.tag1;
        tag2s[k] = fb.tag2;
        revokedStatuses[k] = fb.isRevoked;
        k++;
      }
    }
  }
}

// =============================================================
//                        Validation Registry
// =============================================================

contract ERC8004ValidationRegistry {
  address private immutable _identityRegistry;

  struct ValidationStatus {
    address validatorAddress;
    uint256 agentId;
    uint8 response; // 0..100
    bytes32 responseHash;
    string tag;
    uint256 lastUpdate;
    bool exists;
  }

  mapping(bytes32 requestHash => ValidationStatus status) private _status;
  mapping(uint256 agentId => bytes32[] requestHashes) private _agentValidations;
  mapping(address validator => bytes32[] requestHashes) private _validatorRequests;

  event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash);
  event ValidationResponse(
    address indexed validatorAddress,
    uint256 indexed agentId,
    bytes32 indexed requestHash,
    uint8 response,
    string responseURI,
    bytes32 responseHash,
    string tag
  );

  error NotOwnerOrOperator();
  error UnknownRequest();
  error NotValidator();

  constructor(address identityRegistry_) {
    _identityRegistry = identityRegistry_;
  }

  function getIdentityRegistry() external view returns (address identityRegistry) {
    return _identityRegistry;
  }

  function validationRequest(address validatorAddress, uint256 agentId, string calldata requestURI, bytes32 requestHash) external {
    _requireOwnerOrOperator(agentId);

    ValidationStatus storage st = _status[requestHash];
    if (!st.exists) {
      _agentValidations[agentId].push(requestHash);
      _validatorRequests[validatorAddress].push(requestHash);
      st.exists = true;
      st.validatorAddress = validatorAddress;
      st.agentId = agentId;
    }

    emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
  }

  function validationResponse(bytes32 requestHash, uint8 response, string calldata responseURI, bytes32 responseHash, string calldata tag) external {
    ValidationStatus storage st = _status[requestHash];
    if (!st.exists) revert UnknownRequest();
    if (msg.sender != st.validatorAddress) revert NotValidator();

    st.response = response;
    st.responseHash = responseHash;
    st.tag = tag;
    st.lastUpdate = block.timestamp;

    emit ValidationResponse(st.validatorAddress, st.agentId, requestHash, response, responseURI, responseHash, tag);
  }

  function getValidationStatus(bytes32 requestHash)
    external
    view
    returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, string memory tag, uint256 lastUpdate)
  {
    ValidationStatus storage st = _status[requestHash];
    if (!st.exists) revert UnknownRequest();
    return (st.validatorAddress, st.agentId, st.response, st.responseHash, st.tag, st.lastUpdate);
  }

  function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory requestHashes) {
    return _agentValidations[agentId];
  }

  function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory requestHashes) {
    return _validatorRequests[validatorAddress];
  }

  function getSummary(uint256 agentId, address[] calldata validatorAddresses, string calldata tag)
    external
    view
    returns (uint64 count, uint8 averageResponse)
  {
    bytes32[] storage hashes = _agentValidations[agentId];

    uint256 sum = 0;
    uint64 c = 0;

    for (uint256 i = 0; i < hashes.length; i++) {
      ValidationStatus storage st = _status[hashes[i]];
      if (!st.exists) continue;

      if (validatorAddresses.length != 0) {
        bool ok = false;
        for (uint256 j = 0; j < validatorAddresses.length; j++) {
          if (validatorAddresses[j] == st.validatorAddress) {
            ok = true;
            break;
          }
        }
        if (!ok) continue;
      }

      if (bytes(tag).length != 0 && keccak256(bytes(st.tag)) != keccak256(bytes(tag))) continue;

      sum += st.response;
      c++;
    }

    if (c == 0) return (0, 0);
    return (c, uint8(sum / uint256(c)));
  }

  function _requireOwnerOrOperator(uint256 agentId) internal view {
    address owner = IERC721(_identityRegistry).ownerOf(agentId);
    if (
      msg.sender != owner &&
      !IERC721(_identityRegistry).isApprovedForAll(owner, msg.sender) &&
      IERC721(_identityRegistry).getApproved(agentId) != msg.sender
    ) {
      revert NotOwnerOrOperator();
    }
  }
}

// =============================================================
//                         x402-style Paywall
// =============================================================

/// @notice Minimal on-chain payment target that can be used in an x402 flow.
/// @dev x402 itself is an HTTP protocol; on-chain, you typically just need a verifiable payment.
contract X402Paywall {
  using SafeERC20 for IERC20;

  IERC20 public immutable token;
  ERC8004IdentityRegistry public immutable identityRegistry;

  event X402Payment(
    address indexed payer,
    uint256 indexed agentId,
    address indexed paidTo,
    uint256 amount,
    string endpoint,
    bytes32 refId
  );

  constructor(address token_, address identityRegistry_) {
    token = IERC20(token_);
    identityRegistry = ERC8004IdentityRegistry(identityRegistry_);
  }

  /// @notice Pay an agent for a specific endpoint/action.
  /// @param refId A caller-chosen id (e.g. hash of HTTP request) to correlate off-chain.
  function payForEndpoint(uint256 agentId, string calldata endpoint, uint256 amount, bytes32 refId) external {
    address recipient = identityRegistry.getAgentWallet(agentId);
    require(recipient != address(0), "agentWallet not set");

    token.safeTransferFrom(msg.sender, recipient, amount);
    emit X402Payment(msg.sender, agentId, recipient, amount, endpoint, refId);
  }
}

// =============================================================
//                           Test ERC20
// =============================================================

contract MockERC20 is IERC20 {
  string public name;
  string public symbol;
  uint8 public immutable decimals;

  uint256 public override totalSupply;
  mapping(address => uint256) public override balanceOf;
  mapping(address => mapping(address => uint256)) public override allowance;

  constructor(string memory name_, string memory symbol_, uint8 decimals_) {
    name = name_;
    symbol = symbol_;
    decimals = decimals_;
  }

  function transfer(address to, uint256 value) external override returns (bool) {
    _transfer(msg.sender, to, value);
    return true;
  }

  function approve(address spender, uint256 value) external override returns (bool) {
    allowance[msg.sender][spender] = value;
    emit Approval(msg.sender, spender, value);
    return true;
  }

  function transferFrom(address from, address to, uint256 value) external override returns (bool) {
    uint256 allowed = allowance[from][msg.sender];
    require(allowed >= value, "allowance");
    if (allowed != type(uint256).max) {
      allowance[from][msg.sender] = allowed - value;
      emit Approval(from, msg.sender, allowance[from][msg.sender]);
    }
    _transfer(from, to, value);
    return true;
  }

  function mint(address to, uint256 value) external {
    totalSupply += value;
    balanceOf[to] += value;
    emit Transfer(address(0), to, value);
  }

  function _transfer(address from, address to, uint256 value) internal {
    require(balanceOf[from] >= value, "balance");
    balanceOf[from] -= value;
    balanceOf[to] += value;
    emit Transfer(from, to, value);
  }
}
