const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC-8004 + x402 example", function () {
  async function deployAll() {
    const [deployer, agentOwner, buyer, newWallet, validator] = await ethers.getSigners();

    const All = await ethers.getContractFactory("ERC8004IdentityRegistry", deployer);
    const identity = await All.deploy();

    const Rep = await ethers.getContractFactory("ERC8004ReputationRegistry", deployer);
    const rep = await Rep.deploy(await identity.getAddress());

    const Val = await ethers.getContractFactory("ERC8004ValidationRegistry", deployer);
    const val = await Val.deploy(await identity.getAddress());

    const Token = await ethers.getContractFactory("MockERC20", deployer);
    const usdc = await Token.deploy("MockUSDC", "mUSDC", 6);

    const Paywall = await ethers.getContractFactory("X402Paywall", deployer);
    const paywall = await Paywall.deploy(await usdc.getAddress(), await identity.getAddress());

    return { deployer, agentOwner, buyer, newWallet, validator, identity, rep, val, usdc, paywall };
  }

  it("identity registry: register + setAgentURI", async function () {
    const { agentOwner, identity } = await deployAll();

    const tx = await identity.connect(agentOwner)["register(string)"]("ipfs://agent.json");
    const receipt = await tx.wait();

    // agentId starts at 1
    const agentId = 1n;
    expect(await identity.ownerOf(agentId)).to.equal(agentOwner.address);

    const uri = await identity.tokenURI(agentId);
    expect(uri).to.equal("ipfs://agent.json");

    await expect(identity.connect(agentOwner).setAgentURI(agentId, "https://example.com/agent.json"))
      .to.emit(identity, "URIUpdated")
      .withArgs(agentId, "https://example.com/agent.json", agentOwner.address);
  });

  it("identity registry: setAgentWallet requires signature from newWallet (EIP-712)", async function () {
    const { agentOwner, newWallet, identity } = await deployAll();

    await identity.connect(agentOwner)["register(string)"]("ipfs://agent.json");
    const agentId = 1n;

    const chainId = (await ethers.provider.getNetwork()).chainId;
    const domain = {
      name: "ERC8004IdentityRegistry",
      version: "1",
      chainId,
      verifyingContract: await identity.getAddress(),
    };

    const types = {
      SetAgentWallet: [
        { name: "agentId", type: "uint256" },
        { name: "newWallet", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const value = { agentId, newWallet: newWallet.address, deadline };

    const sig = await newWallet.signTypedData(domain, types, value);

    await expect(identity.connect(agentOwner).setAgentWallet(agentId, newWallet.address, deadline, sig))
      .to.emit(identity, "MetadataSet");

    expect(await identity.getAgentWallet(agentId)).to.equal(newWallet.address);
  });

  it("x402 paywall: pays to agentWallet", async function () {
    const { agentOwner, buyer, newWallet, identity, usdc, paywall } = await deployAll();

    await identity.connect(agentOwner)["register(string)"]("ipfs://agent.json");
    const agentId = 1n;

    // set wallet to newWallet with EIP712 signature
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const domain = {
      name: "ERC8004IdentityRegistry",
      version: "1",
      chainId,
      verifyingContract: await identity.getAddress(),
    };
    const types = {
      SetAgentWallet: [
        { name: "agentId", type: "uint256" },
        { name: "newWallet", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const sig = await newWallet.signTypedData(domain, types, { agentId, newWallet: newWallet.address, deadline });
    await identity.connect(agentOwner).setAgentWallet(agentId, newWallet.address, deadline, sig);

    // mint & approve
    await usdc.mint(buyer.address, 1_000_000n);
    await usdc.connect(buyer).approve(await paywall.getAddress(), 500_000n);

    const ref = ethers.keccak256(ethers.toUtf8Bytes("req-1"));

    await expect(paywall.connect(buyer).payForEndpoint(agentId, "GET /price", 200_000n, ref))
      .to.emit(paywall, "X402Payment")
      .withArgs(buyer.address, agentId, newWallet.address, 200_000n, "GET /price", ref);

    expect(await usdc.balanceOf(newWallet.address)).to.equal(200_000n);
  });

  it("reputation: feedback + getSummary + revoke", async function () {
    const { agentOwner, buyer, identity, rep } = await deployAll();

    await identity.connect(agentOwner)["register(string)"]("ipfs://agent.json");
    const agentId = 1n;

    // buyer gives a 0-100 score (no decimals)
    await expect(
      rep.connect(buyer).giveFeedback(agentId, 87, 0, "starred", "", "https://api.example.com", "ipfs://fb.json", ethers.ZeroHash)
    ).to.emit(rep, "NewFeedback");

    let summary = await rep.getSummary(agentId, [buyer.address], "starred", "");
    expect(summary.count).to.equal(1n);
    // normalized to 18 decimals
    expect(summary.summaryValueDecimals).to.equal(18);

    // revoke and summary should become 0
    await rep.connect(buyer).revokeFeedback(agentId, 1);
    summary = await rep.getSummary(agentId, [buyer.address], "starred", "");
    expect(summary.count).to.equal(0n);
  });

  it("validation: request by agent owner/operator, response by validator", async function () {
    const { agentOwner, validator, identity, val } = await deployAll();

    await identity.connect(agentOwner)["register(string)"]("ipfs://agent.json");
    const agentId = 1n;

    const requestHash = ethers.keccak256(ethers.toUtf8Bytes("job-1"));

    await expect(val.connect(agentOwner).validationRequest(validator.address, agentId, "ipfs://req.json", requestHash))
      .to.emit(val, "ValidationRequest")
      .withArgs(validator.address, agentId, "ipfs://req.json", requestHash);

    await expect(val.connect(validator).validationResponse(requestHash, 100, "ipfs://resp.json", ethers.ZeroHash, "passed"))
      .to.emit(val, "ValidationResponse");

    const st = await val.getValidationStatus(requestHash);
    expect(st.validatorAddress).to.equal(validator.address);
    expect(st.agentId).to.equal(agentId);
    expect(st.response).to.equal(100);
    expect(st.tag).to.equal("passed");
  });
});
