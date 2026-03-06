import * as grpc from '@grpc/grpc-js';
import { connect, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

// Network Configuration
const mspId = 'Org1MSP';
const channelName = 'collebfedchannel';
const chaincodeName = 'governance';

// Dynamically target the certificates in your fabric-infrastructure folder
const basePath = path.resolve(process.env.HOME, 'fabric-infrastructure', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com');
const certPath = path.resolve(basePath, 'users', 'User1@org1.example.com', 'msp', 'signcerts', 'cert.pem');
const tlsCertPath = path.resolve(basePath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');
const keyDirectoryPath = path.resolve(basePath, 'users', 'User1@org1.example.com', 'msp', 'keystore');

// 1. Establish the secure gRPC connection
async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client('localhost:7051', tlsCredentials, {
        'grpc.ssl_target_name_override': 'peer0.org1.example.com',
    });
}

// 2. Load the User's Public Certificate
async function newIdentity() {
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

// 3. Load the User's Private Key
async function newSigner() {
    const files = await fs.readdir(keyDirectoryPath);
    const keyPath = path.resolve(keyDirectoryPath, files[0]);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

async function main() {
    console.log('\n[Bridge] Initializing connection to CollebFed Private Governance...');

    const client = await newGrpcConnection();
    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
    });

    try {
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        console.log('\n[Bridge] Connection successful!');
        
        // --- THE FIX ---
        // Using the first default Hardhat Address: Account #0
        const realEVMAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        const reqId = `TX-${Date.now()}`; 
        const amount = '15000';
        
        console.log(`[Bridge] Submitting request for ${realEVMAddress}...`);

        // Submit to Fabric
        await contract.submitTransaction('CreateWithdrawalRequest', reqId, realEVMAddress, amount);
        console.log(`[Bridge] Transaction ${reqId} successfully submitted.`);

        console.log('\n[Bridge] Querying the ledger to verify state...');
        const resultBytes = await contract.evaluateTransaction('GetWithdrawalRequest', reqId);
        const result = JSON.parse(new TextDecoder().decode(resultBytes));
        
        console.log(`[Bridge] Current Ledger State:`, result);

    } finally {
        gateway.close();
        client.close();
    }
}

main().catch(console.error);