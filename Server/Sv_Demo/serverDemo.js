const axios = require('axios');
const { Web3 } = require('web3'); // For web3(v4.x), need to declare with curly brackets.
const Tx = require('ethereumjs-tx').Transaction;

const data = require('../../Scripts/constant.json');
const testTxIds = data.transactions;


const {
    INFURA_ID,
    PRIVATE_KEY_MMR,
    PRIVATE_KEY_ERC,
    SM_MMR_ADDRESS,
    MMR_ABI,
    SM_TX_ADDRESS,
    TX_ABI,
    BTC_ERC20_ADDRESS,
    BTC_ERC20_ABI,
    CHAIN_ID
} = require('./constant');

const SV_RELAYER = 'http://localhost:8080';
const API_RELAYER = '/new-target-tnx';
// pubkeyHex: 17a91421eb2398b15b72b1b863d22c6c5fb9c75e94e92787
const PUBKEY_HASH = '0x3830b89d69371fc6c24c725d0a20b60080829e59994733640dd15df3bd2306bc';
// const testHashBlock = '0000000070abdb5469cf67ce53cede2c8deb386bc31675576af8d692ca95bebe';


const web3 = new Web3(new Web3.providers.HttpProvider(`https://sepolia.infura.io/v3/${INFURA_ID}`));
const sm_mmr = new web3.eth.Contract(MMR_ABI, SM_MMR_ADDRESS);
const sm_tx = new web3.eth.Contract(TX_ABI, SM_TX_ADDRESS);

const sm_pBTC = new web3.eth.Contract(BTC_ERC20_ABI, BTC_ERC20_ADDRESS);

const accountERC = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY_ERC);
// const accountMMR = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY_MMR);
// const recvAddress = '0x7A16D9DFc229e67095b25783debdE9089E33b400';
// const AMOUNT = 0.00001;

class TransferEvent {
    constructor(event, from, to, value, transactionHash) {
        this.event = event;
        this.from = from;
        this.to = to;
        this.value = value;
        this.transactionHash = transactionHash;
    }
}


class TxInfo {
    constructor(txHash, version, inputVector, outputVector, locktime) {
        this.txHash = txHash;
        this.version = version;
        this.vin = inputVector;
        this.vout = outputVector;
        this.locktime = locktime;
    }
}

class BlockInfo {
    constructor(blockHash, blockHeight, merkleRoot, transactionHashes, rawTxs) {
        this.blockHash = blockHash;
        this.blockHeight = blockHeight;
        this.merkleRoot = merkleRoot;
        this.TxIds = transactionHashes;
        this.rawTxs = rawTxs;
        // Ensure rawTxs is an array of TxInfo instances
        // this.rawTxs = rawTxs.map(tx => new TxInfo(tx.txHash, tx.version, tx.vin, tx.vout, tx.locktime));
    }
}


// hàm đảo ngược chuỗi hex
function reverseHex(hex) {
    return hex.match(/.{2}/g).reverse().join('');
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
            TransactionHashes: transactions,
            RawTxs: rawTxs
        } = response.data;

        // console.log('Response:', response.data);

        // console.log('Info of new block');
        // console.log('\tBlock Hash:', hash);
        // console.log('\tBlock Height:', height);
        // console.log('\tMerkle Root:', merkleRoot);
        // console.log('\tTransactions:', transactions);
        // console.log('\tRaw Txs:', rawTxs[0].Vout);

        // If the block hash is the same as the last processed block hash, return null
        if (hash === lastProcessedBlockHash) {
            return null;
        }

        // Create a new block information object
        let blockInfo = new BlockInfo(
            hash,
            height,
            merkleRoot,
            transactions,
            rawTxs
        );

        // console.log('\tRaw Txs:', blockInfo.rawTxs[0].Vout);

        // Update the last processed block hash
        lastProcessedBlockHash = hash;

        // đảo ngược chuỗi hex của từng giao dịch trong transactions
        // blockInfo.TxIds = transactions.map(tx => reverseHex(tx));
        // đảo ngược chuỗi hex của từng giao dịch trong rawTxs.Hash
        // blockInfo.rawTxs = rawTxs.map(tx => { 
        //     tx.Hash = reverseHex(tx.Hash);
        //     return tx;
        // });

        return blockInfo;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            // No target block available
            // console.error('No target block available');
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
        if (!width) {
            throw new Error('Width is not valid');
        }

        // blockInfo.blockHeight = parseInt(blockInfo.blockHeight);
        blockInfo.blockHeight = width;
        const leafIndex = await sm_mmr.methods.getLeafIndex(blockInfo.blockHeight).call();
        // console.log('Leaf Index:', leafIndex);
        if (!leafIndex) {
            throw new Error('Leaf index is not valid');
        }

        // Get the Merkle proof for the leaf node
        const proof = await sm_mmr.methods.getMerkleProof(leafIndex).call();
        // console.log('Merkle Proof:', proof);
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
// async function parseRawTx(rawTx) {
//     const response = await fetch('http://localhost:5000/get-vin-vout-hex', {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'}, 
//         body: JSON.stringify({"raw_tx": rawTx})
//     });
//     const data = await response.json();
//     return data;
// }

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

// verify tx hash by call method getHashId in smart contract
async function verifyTxHash(tx) {
    try {
        // console.log('Tx:', tx);

        const txHashId = await sm_tx.methods.GetTxHash(
            '0x' + tx.Ver,
            '0x' + tx.Vin,
            '0x' + tx.Vout,
            '0x' + tx.Locktime
        ).call();
        return txHashId;
    } catch (error) {
        console.error('Error verifying tx hash:', error.message);
    }
}

// verify transaction in merkle tree
async function verifyProof(root, proof, txIndex, target_txid) {
    try {
        const isProve = await sm_tx.methods.ProveTx(
            '0x' + target_txid,
            '0x' + root,
            '0x' + proof,
            txIndex)
            .call();
        return isProve;
    } catch (error) {
        console.error('Error verifying transaction:', error.message);
    }
}

async function verifyTransaction(blockInfo, target_txid) {
    // verify tx hash before verify merkle proof
    // use func verifyTxHash
    // Before: find the rawTx with target_txid

    let txIndex = blockInfo.TxIds.indexOf(target_txid);

    let rawIndex = blockInfo.rawTxs.findIndex(tx => tx.Hash === target_txid);

    // đảo ngược target_txid
    target_txid = reverseHex(target_txid);

    // Then: call function verifyTxHash 
    const txHash = await verifyTxHash(blockInfo.rawTxs[rawIndex]);
    if (txHash !== ('0x' + target_txid)) {
        throw new Error('Tx hash is not valid');
    }

    // get merkle proof by list of txids and target_txid
    // Note: blockInfo.TxIds được đảo ngược khi đi qua đoạn code python
    const merkleProof = await getMerkleProof(blockInfo.TxIds, target_txid);
    // console.log("Merkle proof", merkleProof); // merkle_root bị đảo ngược so với bitcoincore
    if (!merkleProof) {
        throw new Error('Merkle proof is not valid');
    }

    // call method verifyTxHash in smart contract
    let merkleRoot = reverseHex(blockInfo.merkleRoot);
    let isProve = await verifyProof(merkleRoot, merkleProof.merkle_proof, txIndex, target_txid);
    if (!isProve) {
        throw new Error('Transaction is not valid');
    }

    return isProve;
}

// Important: Get EVM address of the receiver and amount of token
// Call function extractEvmAddressFromOutput in smart contract
async function callProcessTxOutputs(outputVector, scriptPubKeyHash) {
    try {
        const result = await sm_tx.methods.ProcessTxOutputs(
            '0x' + outputVector,
            scriptPubKeyHash)
            .call();
        // console.log('Result:', result);
        return result; // const { value, evmAddress } = result;
    } catch (error) {
        console.error('Error calling the smart contract function:', error);
    }
}

//     function transfer(address recipient, uint256 amount) external returns (bool);
async function releaseToken(toAddress, amount) {
    try {
        // convert amount from Satoshi to BTC
        let amountInBTC = Number(amount) / 100000000;
        const amountInWei = web3.utils.toWei(amountInBTC.toString(), 'ether')
        const encodedData = sm_pBTC.methods.deposit(toAddress, amountInWei).encodeABI();

        const maxPriorityFeePerGas = web3.utils.toWei('1', 'gwei'); // Example priority fee
        const estimatedGas = await web3.eth.estimateGas({
            from: accountERC.address,
            to: BTC_ERC20_ADDRESS,
            data: encodedData
        });
        const baseFee = await web3.eth.getBlock('latest').then(block => block.baseFeePerGas * BigInt(150) / BigInt(100));
        const maxFeePerGas = web3.utils.toHex(BigInt(baseFee) + BigInt(maxPriorityFeePerGas));

        const rawTx = {
            nonce: '0x' + (await web3.eth.getTransactionCount(accountERC.address)).toString(16),
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            maxFeePerGas: maxFeePerGas,
            gasLimit: web3.utils.toHex(estimatedGas),
            from: accountERC.address,
            to: BTC_ERC20_ADDRESS,
            value: '0x00',
            data: encodedData,
            type: '0x2', // Specify EIP-1559 transaction type
            chainId: CHAIN_ID
        };

        // console.log('--------Raw Tnx--------\n', rawTx);

        const signedTx = await web3.eth.accounts.signTransaction(rawTx, accountERC.privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log('Transaction hash:', receipt.transactionHash);


        // accountERC.signTransaction(rawTx).then(signed => {
        //     web3.eth.sendSignedTransaction(signed.rawTransaction)
        //         .on('receipt', receipt => console.log(receipt.transactionHash))
        //         .on('error', error => console.error("Transaction failed:", error.message));
        // });

        return true;

    } catch (error) {
        console.error('Error releasing token:', error);
        return false;
    }
}

// 4. 
// Set the interval in milliseconds
const interval = 10000; // 5 seconds
let lastProcessedBlockHeight = 0; // Giả sử bắt đầu từ 0
console.log('Listening new transaction...');

setInterval(async () => {
    try {

        let isMMRValid = true, isTnsValid = true, checkTokenReleased = true;

        // Fetch new transaction

        // // Just for test
        // let blockInfo = {
        //     blockHash: '000000000000001638cfab69d80c4f27d8bd544236c0e4cdda540c119962f219',
        //     blockHeight: 2869112,
        //     merkleRoot: '60bb8a5d89711c63f9d0676f15e67a35325896e6f2f0ea25e084387d86cc5b37',
        //     TxIds: testTxIds,
        //     rawTxs: [{
        //         Hash: 'eb6b9ae943370276c23121b760fa50f85f4f66b8783bae2ed8c4eb7e643665bb',
        //         Ver: '01000000',
        //         Vin: '01b6f016f682e17ee887ce8ad0c04421e3fb5608263a02ca3fa54124453573098f000000006b483045022100a9d91af81decd0b089baf5cbc0223f3940008129e96e310abfe4ba74d0a69d10022009c1613f5f82686013c5c77dec5723c2214ed644af0f8ebe4b825377e409f38c012103b2596e1ee05f56c95ef9ccfceb1fcc973602db0ff230abea5a5ef5d4f68f87a9ffffffff',
        //         Vout: '03b80b00000000000017a91421eb2398b15b72b1b863d22c6c5fb9c75e94e92787b0570000000000001976a9140fa70baad3a962964583b43bb32850bddcbb254b88ac0000000000000000166a14279e2071b5337f40c2932aaef5e4f5b01a5a08f3',
        //         Locktime: '00000000'
        //     }]
        // };

        const blockInfo = await fetchNewTransaction();
        if (!blockInfo) {
            return;
        }
        if (blockInfo.blockHeight > lastProcessedBlockHeight) {
            console.log('Info of My block');
            console.log('\tBlock Hash:', blockInfo.blockHash);
            console.log('\tBlock Height:', blockInfo.blockHeight);

            // Cập nhật chiều cao khối cuối cùng đã xử lý
            lastProcessedBlockHeight = blockInfo.blockHeight;
                    

            // đợi khoảng 30s để chắc chắn rằng block đã được thêm vào MMR
            await new Promise(resolve => setTimeout(resolve, 30000));

            // Verifi MMR, Transaction and Release token
            isMMRValid = await verifyMMR(blockInfo);
            if (isMMRValid) {
                console.log('Check MMR:', isMMRValid);
            } else {
                console.log('MMR is not valid');
                return;
            }

            console.log('Check transaction...');
            for (let i = 0; i < blockInfo.rawTxs.length; i++) {
                isTnsValid = await verifyTransaction(blockInfo, blockInfo.rawTxs[i].Hash);
                console.log(`Transaction ${blockInfo.rawTxs[i].Hash}, Verification Result:`, isTnsValid);

                console.log('Release token...');
                // Get EVM address of the receiver and amount of token
                const { value, evmAddress } = await callProcessTxOutputs(
                    blockInfo.rawTxs[i].Vout,
                    PUBKEY_HASH
                );
                // console.log('Value:', value);
                // console.log('EVM Address:', evmAddress);

                // Release token to recv address if all verifications passed
                checkTokenReleased = await releaseToken(evmAddress, value);
                console.log('Check release:', checkTokenReleased);
            }
        }

    } catch (error) {
        console.error('Error in verification process:', error);
    }
}, interval);





