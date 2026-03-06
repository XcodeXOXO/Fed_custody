import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FedVaultModule", (m) => {
  // Pass in your test ERC20 token address here
  const mockAssetAddress = m.getParameter("asset", "0x0000000000000000000000000000000000000001");
  
  // Mocking 4 Validator G2 Public Keys for initialization (4 arrays of 4 uint256s)
  const initialPubKeys = m.getParameter("initialPubKeys", [
    [0n, 0n, 0n, 0n], // Validator 0
    [0n, 0n, 0n, 0n], // Validator 1
    [0n, 0n, 0n, 0n], // Validator 2
    [0n, 0n, 0n, 0n]  // Validator 3
  ]);

  const fedVault = m.contract("FedVault", [mockAssetAddress, initialPubKeys]);

  return { fedVault };
});