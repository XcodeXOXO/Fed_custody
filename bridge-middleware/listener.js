import * as grpc from '@grpc/grpc-js';
import { connect, signers } from '@hyperledger/fabric-gateway';
import { ethers } from 'ethers';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

// --- FABRIC CONFIGURATION ---
const channelName = 'collebfedchannel';
const chaincodeName = 'governance';

// --- EVM (HARDHAT) CONFIGURATION ---
// staticNetwork: true prevents ethers from trying to look up ENS names on Hardhat
const evmProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545', undefined, {
    staticNetwork: true
}); 

// Default Hardhat Account #0 Private Key
const evmWallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', evmProvider);

// Your newly deployed FedVault Address
const vaultAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'; 

const vaultAbi = [
    // Matches the function in your updated FedVault.sol
    "function releaseFunds(address recipient, uint256 amount, uint256 nonce) external"
];
const evmVaultContract = new ethers.Contract(vaultAddress, vaultAbi, evmWallet);

// --- FABRIC CONNECTION HELPER ---
async function connectToFabric() {
    const basePath = path.resolve(process.env.HOME, 'fabric-infrastructure', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com');
    const certPath = path.resolve(basePath, 'users', 'User1@org1.example.com', 'msp', 'signcerts', 'cert.pem');
    const tlsCertPath = path.resolve(basePath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');
    const keyDirectoryPath = path.resolve(basePath, 'users', 'User1@org1.example.com', 'msp', 'keystore');

    const tlsRootCert = await fs.readFile(tlsCertPath);
    const client = new grpc.Client('localhost:7051', grpc.credentials.createSsl(tlsRootCert), {
        'grpc.ssl_target_name_override': 'peer0.org1.example.com',
    });

    const credentials = await fs.readFile(certPath);
    const files = await fs.readdir(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(path.resolve(keyDirectoryPath, files[0]));

    return connect({
        client,
        identity: { mspId: 'Org1MSP', credentials },
        signer: signers.newPrivateKeySigner(crypto.createPrivateKey(privateKeyPem)),
    });
}

// --- MAIN LISTENER LOGIC ---
async function main() {
    console.log('\n🎧 [Bridge Listener] Starting up...');
    
    // 1. Check EVM Connection
    const network = await evmProvider.getNetwork();
    console.log(`✅ [EVM] Connected to Hardhat network (Chain ID: ${network.chainId})`);

    // 2. Connect to Fabric
    const gateway = await connectToFabric();
    const fabricNetwork = gateway.getNetwork(channelName);
    console.log(`✅ [Fabric] Connected to private channel: ${channelName}`);

    console.log('\n📡 [Bridge Listener] Actively listening for BFT Consensus events...\n');

    // 3. Listen for Chaincode Events
    const events = await fabricNetwork.getChaincodeEvents(chaincodeName);

    try {
        for await (const event of events) {
            if (event.eventName === 'WithdrawalApproved') {
                const payload = JSON.parse(new TextDecoder().decode(event.payload));
                console.log(`\n🚨 [ALERT] BFT Consensus Reached on Fabric for TX: ${payload.id}`);
                console.log(`   User: ${payload.userAddress} | Amount: ${payload.amount}`);

                // 4. Execute the Cross-Chain Transfer
                console.log(`🌉 [EVM] Submitting payload to public EVM Vault...`);
                
                try {
                    // We use the ID hash as a nonce for the releaseFunds function
                    // We strip the "TX-" prefix if necessary to convert to a number
                    const nonce = payload.id.replace('TX-', ''); 
                    
                    const tx = await evmVaultContract.releaseFunds(payload.userAddress, payload.amount, nonce);
                    console.log(`⏳ [EVM] Waiting for transaction confirmation...`);
                    await tx.wait();
                    console.log(`💰 [EVM] Success! Funds released. EVM TX Hash: ${tx.hash}`);
                } catch (error) {
                    console.error(`❌ [EVM] Failed to execute release:`, error.message);
                }
            }
        }
    } finally {
        gateway.close();
    }
}

main().catch(console.error);