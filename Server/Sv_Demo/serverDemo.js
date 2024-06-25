const axios = require('axios');
const {Web3} = require('web3'); // For web3(v4.x), need to declare with curly brackets.
const Tx = require('ethereumjs-tx').Transaction;

const SV_RELAYER = 'http://localhost:8080';
const API_RELAYER = '/new-target-tnx';
//'/new-target-tnx';
//'/get-block/0000000070abdb5469cf67ce53cede2c8deb386bc31675576af8d692ca95bebe';
const testHashBlock = '0000000070abdb5469cf67ce53cede2c8deb386bc31675576af8d692ca95bebe';

const {
    INFURA_ID,
    PRIVATE_KEY,
    SM_MMR_ADDRESS,
    MMR_ABI,
    SM_TX_ADDRESS,
    TX_ABI,
    POJAK_ADDRESS,
    POJAK_ABI,
    CHAIN_ID
} = require('./constant');

const web3 = new Web3(new Web3.providers.HttpProvider(`https://sepolia.infura.io/v3/${INFURA_ID}`));
const sm_mmr = new web3.eth.Contract(MMR_ABI, SM_MMR_ADDRESS);
// const sm_tx = new web3.eth.Contract(TX_ABI, SM_TX_ADDRESS);

const sm_pojaktoken = new web3.eth.Contract(POJAK_ABI, POJAK_ADDRESS);

const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);
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
    constructor(blockHash, blockHeight, merkleRoot, transactionHashes){
        this.blockHash = blockHash;
        this.blockHeight = blockHeight;
        this.merkleRoot = merkleRoot;
        this.transactionHashes = transactionHashes;
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
        } = response.data;

        // If the block hash is the same as the last processed block hash, return null
        if (hash === lastProcessedBlockHash) {
            return null;
        }
        // console.log('Response:', response.data);

        // gán giá trị vào blockInfo
        let blockInfo = new BlockInfo(
            hash, 
            height, 
            merkleRoot, 
            transactions
        );

        // const blockInfo = {
        //     blockHash: hash, // use <hash> if real block, use <testHashBlock> if test
        //     blockHeight: height,
        //     merkleRoot: merkleRoot,
        //     transactionHashes: transactions
        // };

        // Update the last processed block hash
        lastProcessedBlockHash = hash;

        return blockInfo;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            // No target block available
            // console.error('No target block available');
        } else {
            // Handle error without printing
            // console.error(error.message);
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
// để kiểm tra xem leaf có nằm trong Merkle Proof không

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

        // Check if the block hash is included in the Merkle proof
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

async function verifyTransaction(blockInfo) {
    return true;
}


let transferEvents = [];
async function verifiAll(blockInfo) {
    try {
        // 1. Verifi MMR
        // const isMMRValid = await verifyMMR(blockInfo);
        // console.log('Check MMR:', isMMRValid);

        // 2. Verifi transaction (Chưa làm)
        // for (const tx of blockInfo.transactionHashes) {
        //     const isTxValid = await verifyTransaction(tx);
        //     if (!isTxValid) {
        //         console.error(`Transaction verification failed for ${tx}`);
        //         return;
        //     }
        // }

        // 3. Get recv address from bitcoin transaction (Chưa làm)

        // 4. Release token to recv address
        releaseToken(recvAddress, 8888);

        // 5. Lắng nghe event Transfer từ smartcontract POJAK
        sm_pojaktoken.events.Transfer({
            fromBlock: 'latest' 
        })
        .on('data', event => {
            const transferEvent = new TransferEvent(
                event.event,
                event.returnValues.from,
                event.returnValues.to,
                event.returnValues.value,
                event.transactionHash
            );
            if (transferEvents.length === 0 || JSON.stringify(transferEvents[transferEvents.length - 1]) !== JSON.stringify(transferEvent)) {
                transferEvents.push(transferEvent);
                console.log(transferEvent);
            }
        })

    } catch (error) {
        console.error('Error in verification process:', error);
    }

    return true;
}


// 4. Lặp lại bước 1
// Set the interval in milliseconds
const interval = 5000; // 10 seconds
console.log('Listening new transaction...');

setInterval(async () => {
    try {

        let isMMRValid, isTnsValid, isRecvValid, checkTokenReleased = true;

        // Fetch new transaction
        const blockInfo = await fetchNewTransaction();
        if (!blockInfo) {
            // console.log('No new transaction available');
            return;
        }
        else {
            console.log('Info of My block');
            console.log('\tBlock Hash:', blockInfo.blockHash);
            console.log('\tBlock Height:', blockInfo.blockHeight);
        }

        // đợi khoảng 30s để chắc chắn rằng block đã được thêm vào MMR
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Verifi MMR, Transaction and Release token
        isMMRValid = await verifyMMR(blockInfo);
        console.log('Check MMR:', isMMRValid);

        isTnsValid = await verifyTransaction(blockInfo);
        console.log('Check Transaction:', isTnsValid);

        if (isMMRValid && isTnsValid && isRecvValid) {
            console.log('All verifications passed');
        }

        // Release token to recv address if all verifications passed
        checkTokenReleased =  await releaseToken(recvAddress, 8888);
        console.log('Check release:', checkTokenReleased);

    } catch (error) {
        console.error('Error in verification process:', error);
    }
}, interval);


//     function transfer(address recipient, uint256 amount) external returns (bool);
async function releaseToken(toAddress, amount) {
    try {
        const amountInWei = web3.utils.toHex(amount);
        const encodedData = sm_pojaktoken.methods.transfer(toAddress, amountInWei).encodeABI();

        const maxPriorityFeePerGas = web3.utils.toWei('1', 'gwei'); // Example priority fee
        const estimatedGas = await web3.eth.estimateGas({
            from: account.address,
            to: POJAK_ADDRESS,
            data: encodedData
        });
        const baseFee = await web3.eth.getBlock('latest').then(block => block.baseFeePerGas);
        const maxFeePerGas = web3.utils.toHex(BigInt(baseFee) + BigInt(maxPriorityFeePerGas));

        const rawTx = {
            nonce: '0x' + (await web3.eth.getTransactionCount(account.address, 'pending')).toString(16),
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            maxFeePerGas: maxFeePerGas,
            gasLimit: web3.utils.toHex(estimatedGas),
            from: account.address,
            to: POJAK_ADDRESS,
            value: '0x00',
            data: encodedData,
            type: '0x2', // Specify EIP-1559 transaction type
            chainId: CHAIN_ID
        };

        const signedTx = await web3.eth.accounts.signTransaction(rawTx, account.privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        return receipt.status;
    } catch (error) {
        console.error('Error releasing token:', error);
    }
}


