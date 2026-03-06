import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat"; // Using 'hre' instead of 'ethers' directly

describe("FedVault", function () {
  
  async function deployVaultFixture() {
    const [owner, user] = await hre.ethers.getSigners();

    const MockToken = await hre.ethers.getContractFactory("ERC20Mock");
    const token = await MockToken.deploy("Mock Asset", "MOCK", owner.address, hre.ethers.parseEther("1000"));

    const dummyKeys = [
      [1n, 1n, 1n, 1n],
      [2n, 2n, 2n, 2n],
      [3n, 3n, 3n, 3n],
      [4n, 4n, 4n, 4n]
    ];
    
    const FedVault = await hre.ethers.getContractFactory("FedVault");
    const vault = await FedVault.deploy(await token.getAddress(), dummyKeys);

    // Transfer some mock tokens to the vault so it has funds to withdraw
    await token.transfer(await vault.getAddress(), hre.ethers.parseEther("100"));

    return { vault, token, owner, user };
  }

  it("Should revert if the BFT threshold is not met (< 2/3)", async function () {
    const { vault, user } = await loadFixture(deployVaultFixture);
    
    // Bitmap '3' in binary is 0011 (Only 2 validators signed out of 4)
    // Threshold for 4 validators is 3.
    const signersBitmap = 3n; 
    const signature = [0n, 0n];

    await expect(
      vault.withdraw(user.address, hre.ethers.parseEther("10"), 1, signature, signersBitmap)
    ).to.be.revertedWithCustomError(vault, "InsufficientQuorum");
  });
});