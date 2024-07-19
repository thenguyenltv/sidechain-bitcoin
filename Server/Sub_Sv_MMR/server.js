const axios = require('axios');
const { Web3 } = require('web3'); // For web3(v4.x), need to declare with curly brackets.
const Tx = require('ethereumjs-tx').Transaction;

const SV_RELAYER = 'http://localhost:8080';
const API_RELAYER = '/latest-block';

const {
    INFURA_PROJECT_ID,
    ADDRESS_FROM,
    PRIVATE_KEY,
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    CHAIN_ID 
} = require('./constant');

const web3 = new Web3(new Web3.providers.HttpProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`));
// const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
async function createAndSendTransaction(data) {
    try {
        const encodedData = contract.methods.append(data).encodeABI();
        const maxPriorityFeePerGas = web3.utils.toWei('1', 'gwei');
        const estimatedGas = await web3.eth.estimateGas({
            to: CONTRACT_ADDRESS,
            data: encodedData
        });
        const baseFee = await web3.eth.getBlock('latest').then(block => block.baseFeePerGas);
        const maxFeePerGas = web3.utils.toHex(BigInt(baseFee) + BigInt(maxPriorityFeePerGas));

        var rawTx = {
            nonce: '0x' + (await web3.eth.getTransactionCount(account.address, 'pending')).toString(16),
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            maxFeePerGas: maxFeePerGas,
            gasLimit: web3.utils.toHex(estimatedGas),
            to: CONTRACT_ADDRESS,
            value: '0x00',
            data: encodedData,
            type: '0x2', // Specify EIP-1559 transaction type
            chainId: CHAIN_ID
        };

        console.log("--------Raw Tnx--------\n", rawTx);

        account.signTransaction(rawTx).then(signed => {
            web3.eth.sendSignedTransaction(signed.rawTransaction)
                .on('receipt', receipt => console.log(receipt.transactionHash))
                .on('error', error => console.error("Transaction failed:", error.message));
        });
    } catch (error) {
        console.error('Error creating and sending transaction:', error);
    }
}

async function fetchLatestBlock() {
    try {
        const response = await axios.get(`${SV_RELAYER}${API_RELAYER}`);
        if (response.status === 200) {
            const { hash, height } = response.data;
            return { hash, height };
        } else {
            if (response.status === 404) {
                console.error('No block');
            } else {
                console.error('Error fetching data:', response.statusText);
            }
        }
    } catch (error) {
        // console.error('Error fetching data:', error.message);
    }
}

// let lastHash = null;
// async function fetchAndSend() {
//     try {
//         const data = await fetchLatestBlock();
//         if (data.hash !== lastHash) {
//             console.log("New block found!\nHash: ", data.hash, "\nHeight: ", data.height);
//             const receipt = await createAndSendTransaction('0x' + data.hash);
//             lastHash = data.hash;
//         }
//     } catch (error) {
//         console.error(error);
//     }
// }

let blockHashes = [];
let isProcessing = false;
let processedHashes = new Set(); // Thêm dòng này để lưu trữ các hash đã xử lý


async function processBlockHashes() {
    if (isProcessing) return;
    isProcessing = true;
    while (blockHashes.length > 0) {
        const hash = blockHashes.shift();
        if (!processedHashes.has(hash)) { // Kiểm tra xem hash đã được xử lý chưa
            processedHashes.add(hash); // Đánh dấu hash đã được đưa vào hàng chờ xử lý
            await createAndSendTransaction('0x' + hash);
        }
    }
    isProcessing = false;
}

async function fetchAndStoreBlockHash() {
    try {
        const data = await fetchLatestBlock();
        if (!data) return;
        if (data.hash && !blockHashes.includes(data.hash) && !processedHashes.has(data.hash)) {
            console.log("New block found!\nHash: ", data.hash, "\nHeight: ", data.height);
            blockHashes.push(data.hash);
            // Send Transaction to append MMR
            // not use await here to continue fetch next block (if any)
            processBlockHashes(); 
        }
    } catch (error) {
        console.error(error);
    }
}

setInterval(fetchAndStoreBlockHash, 5000); // 5s

