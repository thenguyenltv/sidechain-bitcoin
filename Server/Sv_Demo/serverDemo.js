const axios = require('axios');
const {Web3} = require('web3'); // For web3(v4.x), need to declare with curly brackets.
const Tx = require('ethereumjs-tx').Transaction;

const {
    INFURA_ID,
    PRIVATE_KEY_MMR,
    PRIVATE_KEY_ERC,
    SM_MMR_ADDRESS,
    MMR_ABI,
    SM_TX_ADDRESS,
    TX_ABI,
    POJAK_ADDRESS,
    POJAK_ABI,
    CHAIN_ID
} = require('./constant');

const SV_RELAYER = 'http://localhost:8080';
const API_RELAYER = '/new-target-tnx';
// const testHashBlock = '0000000070abdb5469cf67ce53cede2c8deb386bc31675576af8d692ca95bebe';


const web3 = new Web3(new Web3.providers.HttpProvider(`https://sepolia.infura.io/v3/${INFURA_ID}`));
const sm_mmr = new web3.eth.Contract(MMR_ABI, SM_MMR_ADDRESS);
// const sm_tx = new web3.eth.Contract(TX_ABI, SM_TX_ADDRESS);

const sm_pojaktoken = new web3.eth.Contract(POJAK_ABI, POJAK_ADDRESS);
const AMOUNT = 0.00001;

const accountMMR = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY_MMR);
const accountERC = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY_ERC);  
const recvAddress = '0x7A16D9DFc229e67095b25783debdE9089E33b400';

class TransferEvent {
    constructor(event, from, to, value, transactionHash) {
        this.event = event;
        this.from = from;
        this.to = to;
        this.value = value;
        this.transactionHash = transactionHash;
    }
}

class BlockInfo{
    constructor(blockHash, blockHeight, merkleRoot, transactionHashes, rawTxs){
        this.blockHash = blockHash;
        this.blockHeight = blockHeight;
        this.merkleRoot = merkleRoot;
        this.TxIds = transactionHashes;
        this.rawTx = rawTxs;
    }
}

class TxInfo{
    constructor(txHash, version, inputVector, outputVector, locktime){
        this.txHash = txHash;
        this.version = version;
        this.vin = inputVector;
        this.vout = outputVector;
        this.locktime = locktime;
    }
}

// 1. Lắng nghe thông tin MỚI từ api "/new-target-tnx"
let lastProcessedBlockHash = null;
async function fetchNewTransaction() {
    try {
        const response = await axios.get(`${SV_RELAYER}${API_RELAYER}`, { timeout: 5000 });
        const { 
            BlockHash: hash, 
            BlockHeight: height, 
            MerkleRoot: merkleRoot, 
            TransactionHashes: transactions
            // add: rawTxs: rawTxs
        } = response.data;

        // If the block hash is the same as the last processed block hash, return null
        if (hash === lastProcessedBlockHash) {
            return null;
        }

        let blockInfo = new BlockInfo(
            hash, 
            height, 
            merkleRoot, 
            transactions
            // rawTxs
        );

        // Update the last processed block hash
        lastProcessedBlockHash = hash;

        return blockInfo;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            // No target block available
            console.error('No target block available');
        } else {
            // Handle error without printing
            console.error(error.message);
        }
    }
}

// 2. Xác minh MMR thông qua sm_mmr
// Nhận vào thông tin BlockHash và BlockHeight từ hàm fetchNewTransaction
// Gọi đến các hàm trong smartcontract sm_mmr để xác minh Merkle Mountain Range
// - getLeafIndex(height) để lấy index của node leaf có height tương ứng
// - getMerkleProof(index) để lấy Merkle Proof của node leaf
// Hàm này trả về các giá trị: proof.root, proof.width, proof.peakBagging, proof.siblings
// - inclusionProof(root, width, index, BlockHash, peakBagging, siblings) 
// để kiểm tra xem leaf có nằm trong MMR không

async function verifyMMR(blockInfo) {
    try {
        // Get the leaf index for the given block height
        var width = await sm_mmr.methods.getWidth().call();
        console.log('Width:', width);
        if (!width) {
            throw new Error('Width is not valid');
        }

        // blockInfo.blockHeight = parseInt(blockInfo.blockHeight);
        blockInfo.blockHeight = width;
        const leafIndex = await sm_mmr.methods.getLeafIndex(blockInfo.blockHeight).call();
        console.log('Leaf Index:', leafIndex);
        if (!leafIndex) {
            throw new Error('Leaf index is not valid');
        }

        // Get the Merkle proof for the leaf node
        const proof = await sm_mmr.methods.getMerkleProof(leafIndex).call();
        console.log('Merkle Proof:', proof);
        if (!proof) {
            throw new Error('Merkle proof is not valid');
        }

        // Check if the block hash is included in the MMR
        const isIncluded = await sm_mmr.methods.inclusionProof(
            proof.root,
            proof.width,
            leafIndex,
            '0x' + blockInfo.blockHash,
            proof.peakBagging,
            proof.siblings
        ).call();

        return isIncluded;
    } catch (error) {
        console.error('Error verifying MMR:', error.message);
    }
}

// 3. Xác minh transaction thông qua SM_TNX_BTC

// Các hàm bổ trợ phân tích giao dịch Bitcoin
async function parseRawTx(rawTx) {
    const response = await fetch('http://localhost:5000/get-vin-vout-hex', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({"raw_tx": rawTx})
    });
    const data = await response.json();
    return data;
}

// get merkle proof
async function getMerkleProof(transactions, target_txid) {
    const response = await fetch('http://localhost:5000/get-merkle-proof', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "transactions": transactions, "target_txid": target_txid })
    });
    const data = await response.json();
    return data;
}

async function verifyTransaction(blockInfo) {
    return true;
}


// 4. 
// Set the interval in milliseconds
const interval = 5000; // 5 seconds
console.log('Listening new transaction...');

// Store the block information
blockInfos = [];

setInterval(async () => {
    try {

        let isMMRValid = true , isTnsValid = true, isRecvValid = true, checkTokenReleased = true;

        // Fetch new transaction
        const blockInfo = await fetchNewTransaction();
        if (!blockInfo) {
            return;
        }
        else {
            console.log('Info of My block');
            console.log('\tBlock Hash:', blockInfo.blockHash);
            console.log('\tBlock Height:', blockInfo.blockHeight);
        }

        // Add the block information to the array
        blockInfos.push(blockInfo);

        // đợi khoảng 30s để chắc chắn rằng block đã được thêm vào MMR
        // await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verifi MMR, Transaction and Release token
        isMMRValid = await verifyMMR(blockInfo);
        console.log('Check MMR:', isMMRValid);

        isTnsValid = await verifyTransaction(blockInfo);
        console.log('Check Transaction:', isTnsValid);

        if (isMMRValid && isTnsValid && isRecvValid) {
            console.log('All verifications passed');
        }

        // Get EVM address of the receiver and amount of token

        // Release token to recv address if all verifications passed
        checkTokenReleased =  await releaseToken(recvAddress, AMOUNT);
        console.log('Check release:', checkTokenReleased);
    } catch (error) {
        console.error('Error in verification process:', error);
    }
}, interval);


//     function transfer(address recipient, uint256 amount) external returns (bool);
async function releaseToken(toAddress, amount) {
    try {
        const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
        console.log('Amount in Wei:', amountInWei);
        const encodedData = sm_pojaktoken.methods.transfer(toAddress, amountInWei).encodeABI();

        const maxPriorityFeePerGas = web3.utils.toWei('1', 'gwei'); // Example priority fee
        const estimatedGas = await web3.eth.estimateGas({
            from: accountERC.address,
            to: POJAK_ADDRESS,
            data: encodedData
        });
        const baseFee = await web3.eth.getBlock('latest').then(block => block.baseFeePerGas * BigInt(150)/BigInt(100));
        const maxFeePerGas = web3.utils.toHex(BigInt(baseFee) + BigInt(maxPriorityFeePerGas));

        const rawTx = {
            nonce: '0x' + (await web3.eth.getTransactionCount(accountERC.address)).toString(16),
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            maxFeePerGas: maxFeePerGas,
            gasLimit: web3.utils.toHex(estimatedGas),
            from: accountERC.address,
            to: POJAK_ADDRESS,
            value: '0x00',
            data: encodedData,
            type: '0x2', // Specify EIP-1559 transaction type
            chainId: CHAIN_ID
        };

        console.log('--------Raw Tnx--------\n', rawTx);

        const signedTx = await web3.eth.accounts.signTransaction(rawTx, accountERC.privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        return receipt.status;
    } catch (error) {
        console.error('Error releasing token:', error);
    }
}


