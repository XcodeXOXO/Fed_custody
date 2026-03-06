import * as grpc from '@grpc/grpc-js';
import { connect, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

const channelName = 'collebfedchannel';
const chaincodeName = 'governance';

// Helper function to dynamically connect as any Bank Node (Org)
async function connectAs(orgNum, port) {
    const mspId = `Org${orgNum}MSP`;
    const basePath = path.resolve(process.env.HOME, 'fabric-infrastructure', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', `org${orgNum}.example.com`);
    
    // Dynamic Paths based on Organization
    const certPath = path.resolve(basePath, 'users', `User1@org${orgNum}.example.com`, 'msp', 'signcerts', 'cert.pem');
    const tlsCertPath = path.resolve(basePath, 'peers', `peer0.org${orgNum}.example.com`, 'tls', 'ca.crt');
    const keyDirectoryPath = path.resolve(basePath, 'users', `User1@org${orgNum}.example.com`, 'msp', 'keystore');

    // Setup gRPC connection
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    const client = new grpc.Client(`localhost:${port}`, tlsCredentials, {
        'grpc.ssl_target_name_override': `peer0.org${orgNum}.example.com`,
    });

    // Setup Identity and Signer
    const credentials = await fs.readFile(certPath);
    const identity = { mspId, credentials };

    const files = await fs.readdir(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(path.resolve(keyDirectoryPath, files[0]));
    const signer = signers.newPrivateKeySigner(crypto.createPrivateKey(privateKeyPem));

    const gateway = connect({ client, identity, signer });
    return { gateway, client };
}

async function main() {
    const reqId = process.argv[2];
    if (!reqId) {
        console.error('\n❌ Please provide a Transaction ID. Example: node approve.js TX-1772775987402\n');
        process.exit(1);
    }

    console.log(`\n[Consensus] Initiating federated voting for ${reqId}...\n`);

    // --- ORG 1 APPROVAL ---
    console.log('[Org1] Authenticating and submitting approval...');
    const org1 = await connectAs(1, 7051);
    const contract1 = org1.gateway.getNetwork(channelName).getContract(chaincodeName);
    await contract1.submitTransaction('ApproveWithdrawal', reqId);
    console.log('[Org1] Vote recorded ✅');
    org1.gateway.close(); org1.client.close();

    // --- ORG 2 APPROVAL ---
    console.log('\n[Org2] Authenticating and submitting approval...');
    const org2 = await connectAs(2, 9051);
    const contract2 = org2.gateway.getNetwork(channelName).getContract(chaincodeName);
    await contract2.submitTransaction('ApproveWithdrawal', reqId);
    console.log('[Org2] Vote recorded ✅');

    // --- CHECK FINAL STATE ---
    console.log('\n[Network] Querying final consensus state...');
    const resultBytes = await contract2.evaluateTransaction('GetWithdrawalRequest', reqId);
    const result = JSON.parse(new TextDecoder().decode(resultBytes));
    
    console.log('\n[Ledger State]:', result);
    
    org2.gateway.close(); org2.client.close();
}

main().catch(console.error);