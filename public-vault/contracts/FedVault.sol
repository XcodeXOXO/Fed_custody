// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title FedVault
 * @dev Public settlement layer with BFT Threshold and BLS12-381 verification.
 */
contract FedVault is EIP712 {
    using SafeERC20 for IERC20;

    IERC20 public immutable vaultAsset;
    
    // Total number of registered validators in the federation
    uint256 public totalValidators;

    // Stores the individual G2 public keys for each validator (Index maps to the bitmap bit)
    // G2 points require 4 uint256 values (2 for real, 2 for imaginary)
    mapping(uint256 => uint256[4]) public validatorPubKeys;

    // Bitmap state tracking consumed withdrawal IDs to prevent replay attacks
    mapping(uint256 => bool) public consumedNonces;

    event DepositReceived(address indexed user, uint256 amount);
    event WithdrawalSettled(address indexed recipient, uint256 amount, uint256 nonce);

    error NonceAlreadyConsumed(uint256 nonce);
    error InsufficientQuorum(uint256 activeSigners, uint256 requiredThreshold);
    error InvalidBLSSignature();

    // EIP-2537 Precompile Addresses (Standardized in Pectra)
    address constant G2_ADD_PRECOMPILE = address(0x0e);
    address constant PAIRING_PRECOMPILE = address(0x11);

    constructor(address _asset, uint256[4][] memory _initialPubKeys) EIP712("FedCustody", "1") {
        vaultAsset = IERC20(_asset);
        totalValidators = _initialPubKeys.length;
        
        for(uint256 i = 0; i < totalValidators; i++) {
            validatorPubKeys[i] = _initialPubKeys[i];
        }
    }

    function deposit(uint256 amount) external {
        vaultAsset.safeTransferFrom(msg.sender, address(this), amount);
        emit DepositReceived(msg.sender, amount);
    }

    function withdraw(
        address recipient,
        uint256 amount,
        uint256 nonce,
        uint256[2] calldata signature,
        uint256 signersBitmap
    ) external {
        if (consumedNonces[nonce]) {
            revert NonceAlreadyConsumed(nonce);
        }

        // 1. Enforce BFT Threshold (> 2/3 of total validators must sign)
        uint256 activeSigners = _countSetBits(signersBitmap);
        uint256 requiredThreshold = ((totalValidators * 2) / 3) + 1;
        
        if (activeSigners < requiredThreshold) {
            revert InsufficientQuorum(activeSigners, requiredThreshold);
        }

        // 2. Dynamically Aggregate the Public Keys based on the Bitmap
        uint256[4] memory aggregatedPubKey = _aggregatePublicKeys(signersBitmap);

        // 3. Reconstruct the message hash 
        bytes32 payloadHash = _hashTypedDataV4(
            keccak256(abi.encode(
                keccak256("Withdrawal(address recipient,uint256 amount,uint256 nonce)"),
                recipient,
                amount,
                nonce
            ))
        );

        // 4. Verify the BLS12-381 pairing e(sig, g2) == e(H(m), PK_agg)
        if (!_verifyBLS(payloadHash, signature, aggregatedPubKey)) {
            revert InvalidBLSSignature();
        }

        // 5. Update state and settle
        consumedNonces[nonce] = true;
        vaultAsset.safeTransfer(recipient, amount);

        emit WithdrawalSettled(recipient, amount, nonce);
    }

    /**
     * @dev Counts the number of 1s in the bitmap to verify quorum size.
     */
    function _countSetBits(uint256 bitmap) internal pure returns (uint256 count) {
        uint256 temp = bitmap;
        while (temp > 0) {
            count += temp & 1;
            temp >>= 1;
        }
    }

    /**
     * @dev Adds the G2 public keys of the active signers together using the G2 Add precompile.
     */
    function _aggregatePublicKeys(uint256 bitmap) internal view returns (uint256[4] memory aggPubKey) {
        bool isFirst = true;
        
        for (uint256 i = 0; i < totalValidators; i++) {
            if ((bitmap & (1 << i)) != 0) {
                if (isFirst) {
                    aggPubKey = validatorPubKeys[i];
                    isFirst = false;
                } else {
                    bytes memory input = abi.encodePacked(aggPubKey, validatorPubKeys[i]);
                    (bool success, bytes memory result) = G2_ADD_PRECOMPILE.staticcall(input);
                    require(success, "G2 Addition failed");
                    aggPubKey = abi.decode(result, (uint256[4]));
                }
            }
        }
    }

    /**
     * @dev Pairing check using EIP-2537.
     */
    function _verifyBLS(bytes32 payloadHash, uint256[2] calldata signature, uint256[4] memory aggPubKey) internal view returns (bool) {
        bytes memory input = abi.encodePacked(signature, aggPubKey, payloadHash);
        (bool success, bytes memory result) = PAIRING_PRECOMPILE.staticcall(input);
        if (!success || result.length == 0) return false;
        return abi.decode(result, (bool));
    }
}