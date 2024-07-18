// SPDX-License-Identifier: UNLICENSED
        
pragma solidity >=0.4.22 <0.9.0;

// This import is automatically injected by Remix
import "remix_tests.sol"; 

import "hardhat/console.sol";

// This import is required to use custom transaction context
// Although it may fail compilation in 'Solidity Compiler' plugin
// But it will work fine in 'Solidity Unit Testing' plugin
import "remix_accounts.sol";
import "../contracts/BitcoinTx.sol";

import {BTCUtils} from "@keep-network/bitcoin-spv-sol/contracts/BTCUtils.sol";
import {ValidateSPV} from "@keep-network/bitcoin-spv-sol/contracts/ValidateSPV.sol";

// File name has to end with '_test.sol', this file can contain more than one testSuite contracts
contract testSuite {

    using BTCUtils for bytes;
    using ValidateSPV for bytes32;

    /// 'beforeAll' runs before all other tests
    /// More special functions are: 'beforeEach', 'beforeAll', 'afterEach' & 'afterAll'
    function beforeAll() public {
        // <instantiate contract>
        Assert.equal(uint(1), uint(1), "1 should be equal to 1");
    }

    function test_ReverseEndianness() public {
        bytes32 b = hex"f496a6439443a1b82a1dbb2d49a250f139d1e392f9aa9e60517959ea2ac53b4f";
        (bytes32 txHash) = BitcoinTx.reverseEndianness(b);

        console.logBytes32(txHash);
        Assert.equal(txHash, hex"4f3bc52aea597951609eaaf992e3d139f150a2492dbb1d2ab8a1439443a696f4", "test_ReverseEndianness fail");
    }
    
    function test_GetTxHash() public {
        // f496a6439443a1b82a1dbb2d49a250f139d1e392f9aa9e60517959ea2ac53b4f
        bytes32 txId = hex"4f3bc52aea597951609eaaf992e3d139f150a2492dbb1d2ab8a1439443a696f4";

        BitcoinTx.Info memory txInfo = BitcoinTx.Info({
            version: hex"01000000",
            inputVector: hex"01448264ebfc64ae753673b6e379e9d0f5173aa06b9a104212638aed380060670b00000000fd5f02004730440220441f0892393bd822b8419083a8a3f745f6446b50d6c1f2afbbd931f91539298c02200dd963b87536a65af64b5eeedd2528c7e5755328f67292b2eaf558326743304d01483045022100f9b1e81648c973c066c08ac3fe3db01f414287c03903e038c746d602dda6aa2802205d8a7ae6dd988c4e345c60164a055f63c54bbcb6aa42ee9b839d97fffbac4d3901483045022100f339b819c367810387a65fcd093ebb7387bdd846cf921dd7d4e04b63ab72463802204192ed69bd21fa9b8973a2a35de668eca4212337eed0e16624886cdd877d804c01483045022100ddc63b9cc944bda1ad8438d3d40bbd4c572c2f46cabbf703250cf4d8890bee4a022026db27da05cb8701b8105663a52fd678d6fbbd32ca4cf106732f5537d8e875c30147304402204e32943ce981f4080b4e9b420a9e90065982c99632513828c357495d231cbd26022017c7fd1e27e89d9278b51564c010f673d44ac9e340821111b3efaba4032904e3014cf155210362b19ea469a6f90f6a46589a59e0cf03b92cca9ad675a33263bf5b892b984b5b2102ce4c40ab57996aa18bb354c42e2633b98900144bda8df367f356bbed2cd4090b2102bd1ae55b1ac4af987e2570a9ce59900ab290cdfa4f990d5a55dbeb1d5df61cc521025c3e6463307ae607265dbea84935665a90c3fde706512ef04070247ab1772b8121026bdc22a8f2cc6a2a6a2efb48979b9606275358d5c02ebfd8e7f883630cd178372103f73d194d3507abf7eeee0433dcb529cdedd57d089c25a7f0a7c6e4c663d13eae21020fc50638dda38ea7dd759754eb0a603d06134ee6607e72d4340b038f21ba7d6657aeffffffff",
            outputVector: hex"02e8030000000000001976a91439b404ffe8f8bed76116d2e5200753d4f600b2c288ac6c1d00000000000017a91421eb2398b15b72b1b863d22c6c5fb9c75e94e92787",
            locktime: hex"00000000"
        });

        bytes32 txHash =
            abi.encodePacked(txInfo.version, txInfo.inputVector, txInfo.outputVector, txInfo.locktime).hash256View();

        console.logBytes32(txHash);
        Assert.equal(txId, txHash, "Hash(Content) is not equal TxId");
    }

    function test_ProveTx() public {
        bytes32 txId = hex"4f3bc52aea597951609eaaf992e3d139f150a2492dbb1d2ab8a1439443a696f4";

        bytes32 merkleRoot = hex"2e916e07fd8cb515ed5a95376e7eb0b34382e54b3354810df94729dcb37e6885";
        bytes memory merkleProof =
            hex"0dc2b97184f882a9a80a615be301e06604ae611e07aafe7f92ac5a872560cbaf2d2650bd998904439634967da046f940a3160954d2309709eed28bc6e8f64a1a9dc2b0f2fb8147d8511c5fa431b994d3e659cdf3090ed2fadfdf1f1b1861c6b49d1f8e6eb605544f00d6eba9cfc96a8166fbbd1f39115d62e2c316d2207d16e417dbab1b086e1e77ec204ac874aff0332a040c61cdd78a55c1d7021cefa911c9612b1facf0f1af3e8f54dd7c11dfb1a6c0539fd7d834472d60ce210e510fae73511623f58fa492c191139fb5eb0757cb349056ff8791b32d9ebc353aa07f2d5d9f2703babd7c8d95c4c2458c0483ab181b5a5bbd62ed857a5aa0009a92cdb77508c8c8e89414e113070bd3bd33f9ac230f9f34ba38cabaf9514b12739358c54863de5703032b222e790afb62f594f55a89773ce669509111163648cc311bf7bd7b62454156b7bdc4e3e5d6a089c6ce76b3bcb7cd4c6bfe655426786edf5c025d3f2b085079e7d1039094f9c2f3df3638e3ca7dcd67e0271289cd3e0cf23eb1ece956b289a5baaad45e8de21f45660ef8bbae30301e51a53cf7f3377537ef3b1e";
        uint256 txIndexInBlock = 4227;

        bool proved = txId.prove(merkleRoot, merkleProof, txIndexInBlock);
        Assert.ok(proved, "Tx merkle proof is not valid for provided header and tx hash");
    }

    // Revert if fail (in ensureTxInputSpendsUtxo function)
    function test_EnsureTxInputSpendsUtxo() public {
        bytes memory inputVector =
            hex"01448264ebfc64ae753673b6e379e9d0f5173aa06b9a104212638aed380060670b00000000fd5f02004730440220441f0892393bd822b8419083a8a3f745f6446b50d6c1f2afbbd931f91539298c02200dd963b87536a65af64b5eeedd2528c7e5755328f67292b2eaf558326743304d01483045022100f9b1e81648c973c066c08ac3fe3db01f414287c03903e038c746d602dda6aa2802205d8a7ae6dd988c4e345c60164a055f63c54bbcb6aa42ee9b839d97fffbac4d3901483045022100f339b819c367810387a65fcd093ebb7387bdd846cf921dd7d4e04b63ab72463802204192ed69bd21fa9b8973a2a35de668eca4212337eed0e16624886cdd877d804c01483045022100ddc63b9cc944bda1ad8438d3d40bbd4c572c2f46cabbf703250cf4d8890bee4a022026db27da05cb8701b8105663a52fd678d6fbbd32ca4cf106732f5537d8e875c30147304402204e32943ce981f4080b4e9b420a9e90065982c99632513828c357495d231cbd26022017c7fd1e27e89d9278b51564c010f673d44ac9e340821111b3efaba4032904e3014cf155210362b19ea469a6f90f6a46589a59e0cf03b92cca9ad675a33263bf5b892b984b5b2102ce4c40ab57996aa18bb354c42e2633b98900144bda8df367f356bbed2cd4090b2102bd1ae55b1ac4af987e2570a9ce59900ab290cdfa4f990d5a55dbeb1d5df61cc521025c3e6463307ae607265dbea84935665a90c3fde706512ef04070247ab1772b8121026bdc22a8f2cc6a2a6a2efb48979b9606275358d5c02ebfd8e7f883630cd178372103f73d194d3507abf7eeee0433dcb529cdedd57d089c25a7f0a7c6e4c663d13eae21020fc50638dda38ea7dd759754eb0a603d06134ee6607e72d4340b038f21ba7d6657aeffffffff";
        BitcoinTx.UTXO memory utxo2;
        utxo2.txHash = hex"0b67600038ed8a631242109a6ba03a17f5d0e979e3b6733675ae64fceb648244";
        utxo2.txOutputIndex = 0;
        utxo2.txOutputValue = 0;
        
        bool isUtxo = BitcoinTx.ensureTxInputSpendsUtxo(inputVector, utxo2);
        Assert.ok(isUtxo, "Input should be spend a utxo");
    }

    // Not use Assert
    function test_EnsureTxInputSpendsUtxoWhenTxIsNotSpend() public pure {
        bytes memory inputVector =
            hex"063941cf4ed4dad655dcbbf363347f2ddd3eb8851991c9f4f635cfe2a26ef2498f0d000000fc00473044022035a1616b0c034a9a17aaa409a60049b4da34148ebc84b97750b20b28a67751230220580a8bac27e7e31675adcbcc27937389d1f35c976d41f9dde0e62de4c94e38260147304402200cb5d3dbc523da3a99ca4da0fc8ba35d3266939a6c6eb6e6ba70979fc9c1e93302201e91fcc95928da5e01ccc5127000a792d407987503ef59e55d07b7bdb720eefb014c69522103cbc6a30564adc716a52fc28a9ead7b06611765f6f9ecd90d19567033ed9b01b421034c939adc400e67354b4df6afcbedea2a3dc5a4c4805631426363f2fcffd709bd210270fec2b3df4961de8a5e10febb3319922b288efa1300cf048752f3a413a44e1553aefffffffff81c0fe333bc864e0c9d1b32a1dcc14352694dabb015fb6c35f9fc2f0e32ca9d00000000fdfd00004830450221009cf1afe74a98a37798b7324fd2871410b2e269c14aeb05968ca8ce1f23ebe1b4022024164457fcbac57c978dba1bc3ae53378f26aa5380d1bec975da4f85ff9c16ea01473044022042f5950266ad1be284c7ec10d7ca4e7b6cdfbec0c009c5f73f2bdbd24e85eb2902203ac84a337b6e4448a6f7e5d6720e513deefa52a3bb11ce58255756fc9ab48dfe014c695221037fe3f1cffadb5a78862ec191411a824dbc6fbc162db232cc54c845d08527a8922102e983bee0d7339993c6c64ec038a3a576fe3f71b90471a35b22f566fbdefe00e92103bb54d778d8a51d87ddbadb81930c24c316be852cc8b8b3ada9ff50c70e19c9b553aeffffffffab937ce4cf7db7259523eb70e3a2534fae8c899bf101c96eca826caa8dbb44650000000000ffffffff405eaef05128f2d4b1af6fbf7f8584b6d9937b67f18e0f73c4bc1cdf2d6280ec00000000fdfd0000483045022100aba3ac85c6f81fb692cb1227b0a525514e8d6eb46f89a4f407e547dc70b89a5b02207cec256fedfa4407a96eefdb413f79618b3d199677e2b1031a5d66008e7346b701473044022072dc0e1f6208fde1d9a94d14ac945eec6b018af9857ba2f8c5e3df9ae694070e02207328cbeae5be5680152d6b7ab1c706dd3f3098977a94cc12458a44be7b804b58014c69522103a780028aebbf4948a667fc13c7d65926b584aa89d6dcf7f5ea2781f536c99b612103f336f404719f79111f4b06589de871fc9cb7da49a03d02da36dbeb046554c4752102200acc243b2f9d8b84369a28732236c2df0709d59b1199a0a451d332b4fc93c453aeffffffff977ca6132acad11a89ceae92ea15a540ae5366f19f871a61fb6ae6b4daa5b52f00000000fdfd00004730440220352b828c387a78968cb945cca1c7001397dbb5aa723ca817159e5237ec1d69e902201059d50234972874a2aff4473baf53657e8779fb360c83770ab6305b55836720014830450221008a71067a4a4e8acca22ac59bf91d14c4d25e8693a50fbf79ff7cc392e75d2bd5022079b7a6e3f663cb443cf3e2c512176ab36b96b5ee0c03ffbe05f4404f7ed2e338014c69522102fca18dc12a5f3d1dae0a3e76d77f5f79b89d76cbb24e861c7d982be60dd4bf5d210274627fee4ab8e5953b183ddc7edbd45488e4d6faf9df9c640e05035c4af9ec5c210291ed80108c6fb853de2e4f993c7b63a8a5935ee03ac90fed8cdd1b8725c5a7b253aefffffffff00c97eb214c453a7f51b55182d448cd410dc937dbfd967135548a8a2a1f7ade00000000fdfd000047304402200645636f91c792d54346a589d021fbfb7af8803f3d8feaff2f4cd1f2e703f6dc02205eb48fa9428b6e7d1d03bc1788025ff1da58a686903e46386929ce8f810064af01483045022100b32407c41ce04d92976ebfb55018a3cf6b9bf00315c21b29c237f18e0e4f4eec022063de776c5cbdf4d3322a5229bfbea21ec12bd5470c5423cd612c4ca2f823efc4014c69522103f570642ab999a8ccaccf6d275aabb24db32907e1a37b62ab6271865c5a8194ac2103cf7901f7a585cf32aa1d9024807639540062afba94fd466f7b50417e22376d6b2102c5fa500865c57f92204a28326d126fa8eba13a0b43f860ba1eb0d4b44ce5c47c53aeffffffff";
        BitcoinTx.UTXO memory utxo2;
        utxo2.txHash = hex"de7a1f2a8a8a54357196fddb37c90d41cd48d48251b5517f3a454c21eb970cf0";
        utxo2.txOutputIndex = 2;
        utxo2.txOutputValue = 0;
        BitcoinTx.ensureTxInputSpendsUtxo(inputVector, utxo2);
    }

    // Not use Assert
    function test_EnsureTxInputSpendsUtxoReadOverrun() public {
        bytes memory inputVector = hex"ff";
        BitcoinTx.UTXO memory utxo;
        // vm.expectRevert("Read overrun during VarInt parsing");
        BitcoinTx.ensureTxInputSpendsUtxo(inputVector, utxo);
    }

    function test_EnsureTxInputSpendsUtxoEmptyBytes() public {
        bytes memory inputVector = new bytes(0);
        BitcoinTx.UTXO memory utxo;
        (bool success,) = address(this).call(
            abi.encodeWithSignature("ensureTxInputSpendsUtxo(bytes memory,BitcoinTx.UTXO memory)", inputVector, utxo)
        );
        // Panic: [FAIL. Reason: panic: array out-of-bounds access (0x32)]
        Assert.ok(success, "test_EnsureTxInputSpendsUtxoEmptyBytes fail");
    }

    function test_ProcessTxOutputs() public {
        // b1273a6c00eba20ee8837e445599d1362e005f6e1a8525802ba57bc515461a3a
        uint64 value = BitcoinTx.processTxOutputs(
            hex"02c67d16000000000016001493adab0a7a8cb7675db135c9c97e81942025c2c9aea79b4200000000160014f60834ef165253c571b11ce9fa74e46692fc5ec1",
            keccak256(hex"16001493adab0a7a8cb7675db135c9c97e81942025c2c9")
        ).value;
        Assert.equal(value, 1473990, "test_ProcessTxOutputs");
    }

    function test_ProcessTxOutputsSingleOutputTransaction() public {
        // tx api: https://btc-testnet.gobob.xyz/tx/b0fe4bd36b17be89f131c2e652578def3cc0c3d5aa9e7a3f972365a8dc46dba8
        uint64 value = BitcoinTx.processTxOutputs(
            hex"01ab9ab90800000000160014d127b24a7e2aad2ddf21d4d940f6202158aa507d",
            keccak256(hex"160014d127b24a7e2aad2ddf21d4d940f6202158aa507d")
        ).value;
        Assert.equal(value, 146381483, "test_ProcessTxOutputsSingleOutputTransaction fail");
    }

    function test_ProcessTxOutputsMaxTransactionValue() public {
        // tx api: https://api.blockcypher.com/v1/btc/main/txs/d486aeb0e59181fd1addb4aa69ce04d638188fc1125c424899267e8ed6a8af24?limit=50&includeHex=true/
        uint64 value = BitcoinTx.processTxOutputs(
            hex"0260536280ed03000017a9148e097444bb754122652208bf00f71a87b177b700874b5a115e2704000017a914ed498d84acb4532656fcf6947d0ceab6c77188bc87",
            keccak256(hex"17a914ed498d84acb4532656fcf6947d0ceab6c77188bc87")
        ).value;
        Assert.equal(value, 4567128431179, "test_ProcessTxOutputsMaxTransactionValue fail");
    }

    // Not use Assert
    function test_ProcessTxOutputsWithInvalidPubkey() public {
        // vm.expectRevert("No output found for scriptPubKey");
        BitcoinTx.processTxOutputs(
            hex"02c67d16000000000016001493adab0a7a8cb7675db135c9c97e81942025c2c9aea79b4200000000160014f60834ef165253c571b11ce9fa74e46692fc5ec1",
            keccak256(hex"000000000000000000000000000000000000000000000000")
        );
    }

    function test_ProcessTxOutputsEmptyBytes() public {
        bytes memory emptyBytes = new bytes(0);
        (bool success,) = address(this).call(
            abi.encodeWithSignature(
                "processTxOutputs(bytes memory,bytes32)",
                emptyBytes,
                keccak256(hex"16001493adab0a7a8cb7675db135c9c97e81942025c2c9")
            )
        );
        // Reason: panic: array out-of-bounds access (0x32)
        Assert.ok(success, "test_ProcessTxOutputsEmptyBytes fail");
    }

    function test_ProcessTxOutputsWithInvalidInput() public {
        (bool success,) = address(this).call(
            abi.encodeWithSignature(
                "processTxOutputs(bytes memory,bytes32)",
                hex"16001493adab0a7a8cb7675db135c9c97e81942025c2c9",
                keccak256(hex"16001493adab0a7a8cb7675db135c9c97e81942025c2c9")
            )
        );
        // [FAIL. Reason: EvmError: OutOfGas] (gas: 9223372036854754743)
        Assert.ok(success, "test_ProcessTxOutputsWithInvalidInput fail");
    }

    function test_ProcessTxOutputsWithOpReturn() public {
        BitcoinTx.TxOutputsInfo memory resultInfo = BitcoinTx.processTxOutputs(
            hex"02983a000000000000146142b39c0073672dc382b89a42b29e06368bcabd0000000000000000166a14675ca18a04027fd50c88ccd03939e0e5c97b795f",
            keccak256(hex"146142b39c0073672dc382b89a42b29e06368bcabd")
        );
        Assert.equal(resultInfo.value, 15000, "Value should be 15000");
        Assert.equal(resultInfo.evmAddress, 0x675Ca18A04027fd50C88CcD03939E0e5C97b795f, "Address shoud be 0x675...795f");
    }

    // function checkSuccess() public {
    //     // Use 'Assert' methods: https://remix-ide.readthedocs.io/en/latest/assert_library.html
    //     Assert.ok(2 == 2, 'should be true');
    //     Assert.greaterThan(uint(2), uint(1), "2 should be greater than to 1");
    //     Assert.lesserThan(uint(2), uint(3), "2 should be lesser than to 3");
    // }

    // function checkSuccess2() public pure returns (bool) {
    //     // Use the return value (true or false) to test the contract
    //     return true;
    // }
    
    // function checkFailure() public {
    //     Assert.notEqual(uint(1), uint(1), "1 should not be equal to 1");
    // }

    // /// Custom Transaction Context: https://remix-ide.readthedocs.io/en/latest/unittesting.html#customization
    // /// #sender: account-1
    // /// #value: 100
    // function checkSenderAndValue() public payable {
    //     // account index varies 0-9, value is in wei
    //     Assert.equal(msg.sender, TestsAccounts.getAccount(1), "Invalid sender");
    //     Assert.equal(msg.value, 100, "Invalid value");
    // }
}
    