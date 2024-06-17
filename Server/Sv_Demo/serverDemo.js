const axios = require('axios');
const {Web3} = require('web3'); // For web3(v4.x), need to declare with curly brackets.
const Tx = require('ethereumjs-tx').Transaction;

const SV_RELAYER = 'http://localhost:8080';
const API_RELAYER = '/new-target-tnx';

// 1. Lắng nghe thông tin MỚI từ api "/new-target-tnx"
// 2. Xác minh MMR thông qua SM_MMR
// 3. Xác minh transaction thông qua SM_TNX_BTC
// 4. Lặp lại bước 1


// Tại bước 3. Sau khi xác minh, smartcontract sẽ gửi
// event "new-txn" với thông tin transaction mới
// Client sẽ lắng nghe event này và xử lý hành động của user




