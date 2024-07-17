const data = require('../../Scripts/constant.json');
const transactions = data.transactions;

const RAW_TX = "0100000001448264ebfc64ae753673b6e379e9d0f5173aa06b9a104212638aed380060670b00000000fd5f02004730440220441f0892393bd822b8419083a8a3f745f6446b50d6c1f2afbbd931f91539298c02200dd963b87536a65af64b5eeedd2528c7e5755328f67292b2eaf558326743304d01483045022100f9b1e81648c973c066c08ac3fe3db01f414287c03903e038c746d602dda6aa2802205d8a7ae6dd988c4e345c60164a055f63c54bbcb6aa42ee9b839d97fffbac4d3901483045022100f339b819c367810387a65fcd093ebb7387bdd846cf921dd7d4e04b63ab72463802204192ed69bd21fa9b8973a2a35de668eca4212337eed0e16624886cdd877d804c01483045022100ddc63b9cc944bda1ad8438d3d40bbd4c572c2f46cabbf703250cf4d8890bee4a022026db27da05cb8701b8105663a52fd678d6fbbd32ca4cf106732f5537d8e875c30147304402204e32943ce981f4080b4e9b420a9e90065982c99632513828c357495d231cbd26022017c7fd1e27e89d9278b51564c010f673d44ac9e340821111b3efaba4032904e3014cf155210362b19ea469a6f90f6a46589a59e0cf03b92cca9ad675a33263bf5b892b984b5b2102ce4c40ab57996aa18bb354c42e2633b98900144bda8df367f356bbed2cd4090b2102bd1ae55b1ac4af987e2570a9ce59900ab290cdfa4f990d5a55dbeb1d5df61cc521025c3e6463307ae607265dbea84935665a90c3fde706512ef04070247ab1772b8121026bdc22a8f2cc6a2a6a2efb48979b9606275358d5c02ebfd8e7f883630cd178372103f73d194d3507abf7eeee0433dcb529cdedd57d089c25a7f0a7c6e4c663d13eae21020fc50638dda38ea7dd759754eb0a603d06134ee6607e72d4340b038f21ba7d6657aeffffffff02e8030000000000001976a91439b404ffe8f8bed76116d2e5200753d4f600b2c288ac6c1d00000000000017a91421eb2398b15b72b1b863d22c6c5fb9c75e94e9278700000000";

// array to store times
let times = [];
let start;
let startPlus6s;

// Function to get the current time, convert it to an integer, and push it to the array
function logCurrentTime() {
    let now = new Date().getTime(); // Get the current time in milliseconds

    if (times.length > 0) {
        // Calculate the difference between now and the last time
        let lastTime = times[times.length - 1];
        let difference = now - lastTime;
        times.push(difference); // Push the difference to the array

        let target_txid = "4f3bc52aea597951609eaaf992e3d139f150a2492dbb1d2ab8a1439443a696f4";
        // console.log("Transaction: ", transactions, "Target txid: ", target_txid);
        fetch('http://localhost:5000/get-merkle-proof', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "transactions": transactions, "target_txid": target_txid })
        })
        .then(res => res.json()).then(console.log);

        fetch('http://localhost:5000/get-vin-vout-hex', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({"raw_tx": RAW_TX})
        })
        .then(res => res.json()).then(console.log);

    } else {
        // If it's the first time, push now directly
        times.push(now);
        start = now;
        console.log("Start time: ", now.toString());
        return;
    }

    // console.log(times[times.length - 1]); // Log the last time in the array
}

// Call logCurrentTime every 1000 milliseconds (1 second)
setInterval(logCurrentTime, 1000);