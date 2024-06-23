const {Web3} = require('web3'); // For web3(v4.x), need to declare with curly brackets.

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
const sm_pojaktoken = new web3.eth.Contract(POJAK_ABI, POJAK_ADDRESS);

// Lắng nghe event Transfer từ smartcontract POJAK
let transferEvents = [];
setInterval(() => {
    try {
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
        console.error('An error occurred:', error);
    }
}, 5000); // Thực hiện hàm này mỗi 5000 milliseconds (5 giây)
