// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.17;

import {BTCUtils} from "@keep-network/bitcoin-spv-sol/contracts/BTCUtils.sol";
import {BytesLib} from "@keep-network/bitcoin-spv-sol/contracts/BytesLib.sol";
import {ValidateSPV} from "@keep-network/bitcoin-spv-sol/contracts/ValidateSPV.sol";
import {BitcoinTx} from "./BitcoinTx.sol";

contract BitcoinProofVerifier {
    using BTCUtils for bytes;
    using BTCUtils for uint256;
    using BytesLib for bytes;
    using ValidateSPV for bytes;
    using ValidateSPV for bytes32;

    /// @notice Verifies the provided Bitcoin transaction proof and extracts the EVM address if present in OP_RETURN.
    /// @param txInfo Bitcoin transaction data.
    /// @param proof Bitcoin proof data.
    /// @param scriptPubKeyHash Expected Bitcoin scriptPubKey keccak256 hash.
    /// @return txHash Proven 32-byte transaction hash.
    /// @return evmAddress Extracted EVM address from OP_RETURN.
    function verifyMerkleProofAndExtractAddress(
        BitcoinTx.Info memory txInfo,
        BitcoinTx.Proof memory proof,
        bytes32 scriptPubKeyHash
    ) public view returns (bytes32 txHash, address evmAddress) {
        // Validate the Bitcoin transaction proof
        txHash = BitcoinTx.validateProof(txInfo, proof);

        // Process the transaction outputs to extract EVM address from OP_RETURN
        BitcoinTx.TxOutputsInfo memory txOutputsInfo = BitcoinTx.processTxOutputs(txInfo.outputVector, scriptPubKeyHash);
        
        // Retrieve the EVM address if available
        evmAddress = txOutputsInfo.evmAddress;
    }

    function GetTxHash(
        bytes memory version,
        bytes memory inputVector,
        bytes memory outputVector,
        bytes memory locktime
    ) public view returns (bytes32) {
        return abi.encodePacked(version, inputVector, outputVector, locktime).hash256View();
    }

    function ProveTx(
        bytes32 txId,
        bytes32 merkleRoot,
        bytes memory merkleProof,
        uint256 txIndexInBlock
    ) public view returns (bool) {
        return txId.prove(merkleRoot, merkleProof, txIndexInBlock);
    }

    function ProcessTxOutputs(
        bytes memory outputVector,
        bytes32 scriptPubKeyHash
    ) public pure returns (BitcoinTx.TxOutputsInfo memory) {
        return BitcoinTx.processTxOutputs(outputVector, scriptPubKeyHash);
    }
}
