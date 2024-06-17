module.exports = {
    INFURA_PROJECT_ID: 'dec608097e254baeaa74abcc2356c604',
    ADDRESS_FROM: '0xAcAD66DB2bc974B86F3b7A6238da70Fb89267795',
    PRIVATE_KEY: '0x85171e109298b0b45b030b8e14b2a389516577ac9ca2d04e20b14c8b64d80a4f',
    CONTRACT_ADDRESS: '0x470b43a617B36eDF967aaC9236566b064c0B4dFc',
    CONTRACT_ABI: [
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
            "name": "initMMR",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "money",
                    "type": "uint256"
                }
            ],
            "name": "Master_InitMMR",
            "type": "event"
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
    ], // ABI của hợp đồng
    CHAIN_ID: '0xaa36a7'
};