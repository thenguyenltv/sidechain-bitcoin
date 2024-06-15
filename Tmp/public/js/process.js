$(document).ready(async function(){
    // ============================================
    // To interact with a smart contract deployed on a custom network

    // // Replace 'http://localhost:8545' with your custom network node URL
    // var provider = new Web3.providers.HttpProvider("http://localhost:8545");
    // var web3 = new Web3(provider);

    // // Use the contract ABI and the contract address to create a contract instance
    // var contract = new web3.eth.Contract(SM_ABI, "contract_address_on_your_custom_network");

    // // Now you can call contract methods
    // contract.methods.methodName().call((err, result) => { 
    //     console.log(result); 
    // });
    // ============================================

    var SM_ABI = [
        {
            "inputs": [],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                }
            ],
            "name": "append",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes[]",
                    "name": "dataList",
                    "type": "bytes[]"
                }
            ],
            "name": "appendList",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                }
            ],
            "name": "getChildren",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "left",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "right",
                    "type": "uint256"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                }
            ],
            "name": "getHash",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_width",
                    "type": "uint256"
                }
            ],
            "name": "getHashLeafIndexes",
            "outputs": [
                {
                    "internalType": "bytes32[]",
                    "name": "leafHashes",
                    "type": "bytes32[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "width",
                    "type": "uint256"
                }
            ],
            "name": "getLeafIndex",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                }
            ],
            "name": "getMerkleProof",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "root",
                    "type": "bytes32"
                },
                {
                    "internalType": "uint256",
                    "name": "width",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes32[]",
                    "name": "peakBagging",
                    "type": "bytes32[]"
                },
                {
                    "internalType": "bytes32[]",
                    "name": "siblings",
                    "type": "bytes32[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                }
            ],
            "name": "getNode",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "width",
                    "type": "uint256"
                }
            ],
            "name": "getPeakIndexes",
            "outputs": [
                {
                    "internalType": "uint256[]",
                    "name": "peakIndexes",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getPeaks",
            "outputs": [
                {
                    "internalType": "bytes32[]",
                    "name": "peaks",
                    "type": "bytes32[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getRoot",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "width",
                    "type": "uint256"
                }
            ],
            "name": "getSize",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getSize",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getWidth",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                },
                {
                    "internalType": "bytes32[]",
                    "name": "leafs",
                    "type": "bytes32[]"
                }
            ],
            "name": "hasLeaf",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes32",
                    "name": "left",
                    "type": "bytes32"
                },
                {
                    "internalType": "bytes32",
                    "name": "right",
                    "type": "bytes32"
                }
            ],
            "name": "hashBranch",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes32",
                    "name": "dataHash",
                    "type": "bytes32"
                }
            ],
            "name": "hashLeaf",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                }
            ],
            "name": "heightAt",
            "outputs": [
                {
                    "internalType": "uint8",
                    "name": "height",
                    "type": "uint8"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes32",
                    "name": "root",
                    "type": "bytes32"
                },
                {
                    "internalType": "uint256",
                    "name": "width",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes",
                    "name": "value",
                    "type": "bytes"
                },
                {
                    "internalType": "bytes32[]",
                    "name": "peaks",
                    "type": "bytes32[]"
                },
                {
                    "internalType": "bytes32[]",
                    "name": "siblings",
                    "type": "bytes32[]"
                }
            ],
            "name": "inclusionProof",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                }
            ],
            "name": "isLeaf",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "size",
                    "type": "uint256"
                }
            ],
            "name": "mountainHeight",
            "outputs": [
                {
                    "internalType": "uint8",
                    "name": "",
                    "type": "uint8"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "width",
                    "type": "uint256"
                }
            ],
            "name": "numOfPeaks",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "num",
                    "type": "uint256"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "width",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes32[]",
                    "name": "peaks",
                    "type": "bytes32[]"
                }
            ],
            "name": "peakBagging",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "width",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes32[255]",
                    "name": "peakMap",
                    "type": "bytes32[255]"
                }
            ],
            "name": "peakMapToPeaks",
            "outputs": [
                {
                    "internalType": "bytes32[]",
                    "name": "peaks",
                    "type": "bytes32[]"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "width",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes32[255]",
                    "name": "prevPeakMap",
                    "type": "bytes32[255]"
                },
                {
                    "internalType": "bytes32",
                    "name": "itemHash",
                    "type": "bytes32"
                }
            ],
            "name": "peakUpdate",
            "outputs": [
                {
                    "internalType": "bytes32[255]",
                    "name": "nextPeakMap",
                    "type": "bytes32[255]"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "width",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes32[]",
                    "name": "peaks",
                    "type": "bytes32[]"
                }
            ],
            "name": "peaksToPeakMap",
            "outputs": [
                {
                    "internalType": "bytes32[255]",
                    "name": "peakMap",
                    "type": "bytes32[255]"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes32",
                    "name": "root",
                    "type": "bytes32"
                },
                {
                    "internalType": "uint256",
                    "name": "width",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes32[]",
                    "name": "peaks",
                    "type": "bytes32[]"
                },
                {
                    "internalType": "bytes32[]",
                    "name": "itemHashes",
                    "type": "bytes32[]"
                }
            ],
            "name": "rollUp",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "newRoot",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "tree",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "root",
                    "type": "bytes32"
                },
                {
                    "internalType": "uint256",
                    "name": "size",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "width",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]

    var SM_Address = "0xb10fbda6bab9f78f03e239638f02da27a3cca43b";
    var currentAccount = null;

    check_MetaMask();

    // contract MM
    const web3 = new Web3(window.ethereum);
    //window.ethereum.enable();
    // use eth_requestAccounts instead of enable
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    var contract_MM = new web3.eth.Contract(SM_ABI, SM_Address);

    // contract Infura
    var provider = new Web3.providers.WebsocketProvider("wss://sepolia.infura.io/ws/v3/04d32559be594f9ca9b116b2a61624e6");
    var web3_infura = new Web3(provider);
    var contract_Infura = new web3_infura.eth.Contract(SM_ABI, SM_Address);

    // // listen new data from http://localhost:8080/latest-block
    // var socket = io("http://localhost:8080");
    // var latestBlockData; // variable to store the latest block data

    // setInterval(function() {
    //     socket.on("/latest-block", function(data){
    //         latestBlockData = data; // assign the received data to the variable
    //         console.log(latestBlockData);
    //     });
    // }, 10000); // 10000 milliseconds = 10 seconds


    // fetch('../../test_blocks.json')
    // .then(response => response.json())
    // .then(data => {
    //     // Now you can use your data
    //     contract_MM.methods.initMMR(bytesData).send({from: ""})
    //     console.log(data);
    // })
    // .catch(error => console.error('Error:', error));

    function getSize(){
        return contract_MM.methods.getSize().call()
        .then((sizeMMR)=>{
            let size = sizeMMR.toNumber();
            return size;
        })
        .catch((err)=>{console.log(err)});
    }

    $("#btn_ConnectMM").click(function(){
        connect_MetaMask()
        .then((data)=>{
            currentAccount = data[0];
            $("#currentAddress").html(currentAccount);
            //console.log("Current account is: " + currentAccount);
        })
        .catch((err)=>{console.log(err)});
    });

    function isLeafExist(hashblock){
        return getSize().then((sizeMMR) => {
            console.log("Size:", sizeMMR);
            // Use sizeMMR here
            return contract_MM.methods.getHashLeafIndexes(sizeMMR).call()
            .then((leafHashes)=>{
                // console.log("Leaf Hashes: ", leafHashes);
                return contract_MM.methods.hasLeaf(hashblock, leafHashes).call()
                .then((res)=>{
                    // console.log("Result: ", res);
                    return res;
                })
                .catch((err)=>{console.log(err)});
            })
            .catch((err)=>{console.log(err)});
        });
    }

    // New flow:
    
    $("#btn_append").click(async function() {
        if (currentAccount != null) {
            var hashblock = $("#txt_hashblock").val();
    
            // check hashblock
            if (hashblock.length != 66) {
                alert("Hash block is invalid");
                return;
            }
    
            // check hashblock in MMR
            try {
                let result = await isLeafExist(hashblock);
                console.log("Hash block exist:", result);
                if (result) {
                    alert("Hash block is already in MMR");
                } else {
                    console.log("Append pending");
                    let data = await contract_MM.methods.append(hashblock).send({ from: currentAccount });
                    $("#notice").html("Append success");
                    console.log("Append success");
                }
            } catch (err) {
                $("#notice").html(err.message);
            }
        }
    });

    $("#btn_verify").click(function(){
        var hashblock = $("#txt_verifyhashblock").val();
        var id = $("#txt_verifyid").val();
        console.log("ID: " + id);
        console.log("Hash block: " + hashblock);
        
        // check hashblock
        if (hashblock.length != 66){
            alert("Hash block is invalid");
            return;
        }
    

        contract_MM.methods.getLeafIndex(id).call()
        .then((index)=>{
            contract_MM.methods.getMerkleProof(index).call()
            .then((proof)=>{
                contract_MM.methods.inclusionProof(proof.root, proof.width, 
                            index, hashblock, proof.peakBagging, proof.siblings).call()
                .then((data)=>{
                    console.log("Check Data: ", data);
                    if (data){
                        $("#notice_verify").html("Hash block is valid");    
                    }
                    else{
                        $("#notice_verify").html(err.message);
                    }
                })
                .catch((err)=>{
                    console.log("Data err: ", data);
                    $("#notice_verify").html(err.message);
                });
            })
            .catch((err)=>{
                $("#notice_verify").html(err.message);
            });
        })
        .catch((err)=>{
            console.log("Index: ", index);
            $("#notice_verify").html(err.message);
        });
    });


    window.ethereum.on('accountsChanged', function (accounts) {
        currentAccount = accounts[0];
        $("#currentAddress").html(currentAccount);
        console.log("Current account is: " + currentAccount);
    });

});

async function connect_MetaMask(){
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    return accounts;
}

function check_MetaMask(){
    $("#install").hide();
    $("#info").hide();

    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed');
        $("#info").fadeIn(600);
    } else {
        console.log('MetaMask is not installed');
        $("#install").fadeIn(800);
    }
}

