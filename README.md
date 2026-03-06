# List of Commands.

## The list of commands are divided across different terminals, 

### First Launch your hardhat node.
Terminal 1 :
```bash
cd ~/fed-custody/public-vault
npx hardhat node
```


### Deploy the funds and and the public vallet.
Terminal 2: 
    -deploy the script.
    -copy the address that is produced from deployed script.
    -Fund the Vault with FED Tokens
    -copy the code that is present that is used for transfering funds from one wallet to another.

```bash
cd ~/fed-custody/public-vault
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat console --network localhost
```
```bash
const token = await ethers.getContractAt("ERC20Mock", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
const vaultAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
await token.transfer(vaultAddress, ethers.parseEther("500000"));
console.log("Vault Funded");
.exit
```

### Deply and start the Hyperledger fabric.

Terminal 3:
    -start the network from the test-network
    -deploy the governence logic to the local netowrk

```bash
cd ~/fabric-infrastructure/fabric-samples/test-network
./network.sh up createChannel -c collebfedchannel -ca
```
```bash
./network.sh deployCC -ccn governance -ccp ~/fed-custody/private-governance/ -ccl go -c collebfedchannel -ccv 1.0 -ccs 1
```


### Bridge logic using BLS-Cosi

Terminal 4:
    -listener.js, aprove.js, bridge.js have to be run from here

```bash
cd ~/fed-custody/bridge-middleware
node bridge.js
```

Get your TX-0....

```bash
node approve.js <PASTE_TX_ID_HERE>
```


```bash
cd ~/fed-custody/bridge-middleware
node listener.js
```

### To Run the UI

```bash
npm run dev

```