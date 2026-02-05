/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(filePath, obj) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const net = await hre.ethers.provider.getNetwork();

  console.log("Deploying with:", deployer.address);
  console.log("Network:", net.chainId.toString());

  const Identity = await hre.ethers.getContractFactory("ERC8004IdentityRegistry");
  const identity = await Identity.deploy();
  await identity.waitForDeployment();

  const Reputation = await hre.ethers.getContractFactory("ERC8004ReputationRegistry");
  const reputation = await Reputation.deploy(await identity.getAddress());
  await reputation.waitForDeployment();

  const Validation = await hre.ethers.getContractFactory("ERC8004ValidationRegistry");
  const validation = await Validation.deploy(await identity.getAddress());
  await validation.waitForDeployment();

  const Token = await hre.ethers.getContractFactory("MockERC20");
  const usdc = await Token.deploy("MockUSDC", "mUSDC", 6);
  await usdc.waitForDeployment();

  const Paywall = await hre.ethers.getContractFactory("X402Paywall");
  const paywall = await Paywall.deploy(await usdc.getAddress(), await identity.getAddress());
  await paywall.waitForDeployment();

  const deployments = {
    network: "baseSepolia",
    chainId: Number(net.chainId),
    deployer: deployer.address,
    contracts: {
      ERC8004IdentityRegistry: await identity.getAddress(),
      ERC8004ReputationRegistry: await reputation.getAddress(),
      ERC8004ValidationRegistry: await validation.getAddress(),
      MockUSDC: await usdc.getAddress(),
      X402Paywall: await paywall.getAddress(),
    },
    deployedAt: new Date().toISOString(),
  };

  const root = path.join(__dirname, "..");
  const out1 = path.join(root, "deployments", "base-sepolia.json");
  const out2 = path.join(root, "dapp", "src", "config", "deployments", "base-sepolia.json");

  writeJson(out1, deployments);
  writeJson(out2, deployments);

  console.log("\nDeployed:");
  console.log(deployments);
  console.log("\nWrote:");
  console.log("-", out1);
  console.log("-", out2);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
