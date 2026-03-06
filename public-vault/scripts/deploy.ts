import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`🚀 Deploying contracts with the account: ${deployer.address}`);

  // 1. Deploy ERC20 Mock Token first
  console.log("📡 Deploying ERC20Mock...");
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const token = await ERC20Mock.deploy(
    "Fed Token",
    "FED",
    deployer.address,
    ethers.parseEther("1000000") // 1 Million tokens
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`✅ ERC20Mock deployed to: ${tokenAddress}`);

  // 2. Prepare Dummy Validator Public Keys (G2 points)
  // FedVault requires uint256[4][]
  const dummyPubKeys = [
    [1n, 2n, 3n, 4n], // Validator 0
    [5n, 6n, 7n, 8n]  // Validator 1
  ];

  // 3. Deploy FedVault
  console.log("📡 Deploying FedVault...");
  const FedVault = await ethers.getContractFactory("FedVault");
  
  // Pass the (assetAddress, publicKeysArray)
  const vault = await FedVault.deploy(tokenAddress, dummyPubKeys);

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("----------------------------------------------");
  console.log(`✅ SUCCESS: FedVault deployed to: ${vaultAddress}`);
  console.log(`🪙 Managed Asset: ${tokenAddress}`);
  console.log("----------------------------------------------");
  console.log("Action: Copy the FedVault address into your listener.js");
}

main().catch((error) => {
  console.error("❌ Deployment failed:");
  console.error(error);
  process.exitCode = 1;
});