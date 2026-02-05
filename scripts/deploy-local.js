const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("Deployer:", deployer.address);
  console.log("ChainId:", chainId);

  const Identity = await hre.ethers.getContractFactory("ERC8004IdentityRegistry", deployer);
  const identity = await Identity.deploy();
  await identity.waitForDeployment();

  const Reputation = await hre.ethers.getContractFactory("ERC8004ReputationRegistry", deployer);
  const reputation = await Reputation.deploy(await identity.getAddress());
  await reputation.waitForDeployment();

  const Validation = await hre.ethers.getContractFactory("ERC8004ValidationRegistry", deployer);
  const validation = await Validation.deploy(await identity.getAddress());
  await validation.waitForDeployment();

  const Token = await hre.ethers.getContractFactory("MockERC20", deployer);
  const usdc = await Token.deploy("MockUSDC", "mUSDC", 6);
  await usdc.waitForDeployment();

  const Paywall = await hre.ethers.getContractFactory("X402Paywall", deployer);
  const paywall = await Paywall.deploy(await usdc.getAddress(), await identity.getAddress());
  await paywall.waitForDeployment();

  const out = {
    chainId,
    deployer: deployer.address,
    contracts: {
      identity: await identity.getAddress(),
      reputation: await reputation.getAddress(),
      validation: await validation.getAddress(),
      usdc: await usdc.getAddress(),
      paywall: await paywall.getAddress(),
    },
  };

  const rootDeploymentPath = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(rootDeploymentPath, { recursive: true });

  const fileName = chainId === 31337 ? "localhost.json" : `${chainId}.json`;
  const outPath = path.join(rootDeploymentPath, fileName);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Wrote", outPath);

  // also sync into the Next.js dapp for convenience
  const dappPath = path.join(__dirname, "..", "dapp", "src", "config", "deployments");
  fs.mkdirSync(dappPath, { recursive: true });
  const dappOutPath = path.join(dappPath, fileName);
  fs.writeFileSync(dappOutPath, JSON.stringify(out, null, 2));
  console.log("Wrote", dappOutPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
