
// File: @keep-network/bitcoin-spv-sol/contracts/BytesLib.sol

pragma solidity ^0.8.4;

/*

https://github.com/GNSPS/solidity-bytes-utils/

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <https://unlicense.org>
*/


/** @title BytesLib **/
/** @author https://github.com/GNSPS **/

library BytesLib {
    function concat(bytes memory _preBytes, bytes memory _postBytes) internal pure returns (bytes memory) {
        bytes memory tempBytes;

        assembly {
            // Get a location of some free memory and store it in tempBytes as
            // Solidity does for memory variables.
            tempBytes := mload(0x40)

            // Store the length of the first bytes array at the beginning of
            // the memory for tempBytes.
            let length := mload(_preBytes)
            mstore(tempBytes, length)

            // Maintain a memory counter for the current write location in the
            // temp bytes array by adding the 32 bytes for the array length to
            // the starting location.
            let mc := add(tempBytes, 0x20)
            // Stop copying when the memory counter reaches the length of the
            // first bytes array.
            let end := add(mc, length)

            for {
                // Initialize a copy counter to the start of the _preBytes data,
                // 32 bytes into its memory.
                let cc := add(_preBytes, 0x20)
            } lt(mc, end) {
                // Increase both counters by 32 bytes each iteration.
                mc := add(mc, 0x20)
                cc := add(cc, 0x20)
            } {
                // Write the _preBytes data into the tempBytes memory 32 bytes
                // at a time.
                mstore(mc, mload(cc))
            }

            // Add the length of _postBytes to the current length of tempBytes
            // and store it as the new length in the first 32 bytes of the
            // tempBytes memory.
            length := mload(_postBytes)
            mstore(tempBytes, add(length, mload(tempBytes)))

            // Move the memory counter back from a multiple of 0x20 to the
            // actual end of the _preBytes data.
            mc := end
            // Stop copying when the memory counter reaches the new combined
            // length of the arrays.
            end := add(mc, length)

            for {
                let cc := add(_postBytes, 0x20)
            } lt(mc, end) {
                mc := add(mc, 0x20)
                cc := add(cc, 0x20)
            } {
                mstore(mc, mload(cc))
            }

            // Update the free-memory pointer by padding our last write location
            // to 32 bytes: add 31 bytes to the end of tempBytes to move to the
            // next 32 byte block, then round down to the nearest multiple of
            // 32. If the sum of the length of the two arrays is zero then add
            // one before rounding down to leave a blank 32 bytes (the length block with 0).
            mstore(0x40, and(
                add(add(end, iszero(add(length, mload(_preBytes)))), 31),
                not(31) // Round down to the nearest 32 bytes.
            ))
        }

        return tempBytes;
    }

    function concatStorage(bytes storage _preBytes, bytes memory _postBytes) internal {
        assembly {
            // Read the first 32 bytes of _preBytes storage, which is the length
            // of the array. (We don't need to use the offset into the slot
            // because arrays use the entire slot.)
            let fslot := sload(_preBytes.slot)
            // Arrays of 31 bytes or less have an even value in their slot,
            // while longer arrays have an odd value. The actual length is
            // the slot divided by two for odd values, and the lowest order
            // byte divided by two for even values.
            // If the slot is even, bitwise and the slot with 255 and divide by
            // two to get the length. If the slot is odd, bitwise and the slot
            // with -1 and divide by two.
            let slength := div(and(fslot, sub(mul(0x100, iszero(and(fslot, 1))), 1)), 2)
            let mlength := mload(_postBytes)
            let newlength := add(slength, mlength)
            // slength can contain both the length and contents of the array
            // if length < 32 bytes so let's prepare for that
            // v. http://solidity.readthedocs.io/en/latest/miscellaneous.html#layout-of-state-variables-in-storage
            switch add(lt(slength, 32), lt(newlength, 32))
            case 2 {
                // Since the new array still fits in the slot, we just need to
                // update the contents of the slot.
                // uint256(bytes_storage) = uint256(bytes_storage) + uint256(bytes_memory) + new_length
                sstore(
                    _preBytes.slot,
                    // all the modifications to the slot are inside this
                    // next block
                    add(
                        // we can just add to the slot contents because the
                        // bytes we want to change are the LSBs
                        fslot,
                        add(
                            mul(
                                div(
                                    // load the bytes from memory
                                    mload(add(_postBytes, 0x20)),
                                    // zero all bytes to the right
                                    exp(0x100, sub(32, mlength))
                        ),
                        // and now shift left the number of bytes to
                        // leave space for the length in the slot
                        exp(0x100, sub(32, newlength))
                        ),
                        // increase length by the double of the memory
                        // bytes length
                        mul(mlength, 2)
                        )
                    )
                )
            }
            case 1 {
                // The stored value fits in the slot, but the combined value
                // will exceed it.
                // get the keccak hash to get the contents of the array
                mstore(0x0, _preBytes.slot)
                let sc := add(keccak256(0x0, 0x20), div(slength, 32))

                // save new length
                sstore(_preBytes.slot, add(mul(newlength, 2), 1))

                // The contents of the _postBytes array start 32 bytes into
                // the structure. Our first read should obtain the `submod`
                // bytes that can fit into the unused space in the last word
                // of the stored array. To get this, we read 32 bytes starting
                // from `submod`, so the data we read overlaps with the array
                // contents by `submod` bytes. Masking the lowest-order
                // `submod` bytes allows us to add that value directly to the
                // stored value.

                let submod := sub(32, slength)
                let mc := add(_postBytes, submod)
                let end := add(_postBytes, mlength)
                let mask := sub(exp(0x100, submod), 1)

                sstore(
                    sc,
                    add(
                        and(
                            fslot,
                            0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00
                    ),
                    and(mload(mc), mask)
                    )
                )

                for {
                    mc := add(mc, 0x20)
                    sc := add(sc, 1)
                } lt(mc, end) {
                    sc := add(sc, 1)
                    mc := add(mc, 0x20)
                } {
                    sstore(sc, mload(mc))
                }

                mask := exp(0x100, sub(mc, end))

                sstore(sc, mul(div(mload(mc), mask), mask))
            }
            default {
                // get the keccak hash to get the contents of the array
                mstore(0x0, _preBytes.slot)
                // Start copying to the last used word of the stored array.
                let sc := add(keccak256(0x0, 0x20), div(slength, 32))

                // save new length
                sstore(_preBytes.slot, add(mul(newlength, 2), 1))

                // Copy over the first `submod` bytes of the new data as in
                // case 1 above.
                let slengthmod := mod(slength, 32)
                let mlengthmod := mod(mlength, 32)
                let submod := sub(32, slengthmod)
                let mc := add(_postBytes, submod)
                let end := add(_postBytes, mlength)
                let mask := sub(exp(0x100, submod), 1)

                sstore(sc, add(sload(sc), and(mload(mc), mask)))

                for {
                    sc := add(sc, 1)
                    mc := add(mc, 0x20)
                } lt(mc, end) {
                    sc := add(sc, 1)
                    mc := add(mc, 0x20)
                } {
                    sstore(sc, mload(mc))
                }

                mask := exp(0x100, sub(mc, end))

                sstore(sc, mul(div(mload(mc), mask), mask))
            }
        }
    }

    function slice(bytes memory _bytes, uint _start, uint _length) internal  pure returns (bytes memory res) {
        if (_length == 0) {
            return hex"";
        }
        uint _end = _start + _length;
        require(_end > _start && _bytes.length >= _end, "Slice out of bounds");

        assembly {
            // Alloc bytes array with additional 32 bytes afterspace and assign it's size
            res := mload(0x40)
            mstore(0x40, add(add(res, 64), _length))
            mstore(res, _length)

            // Compute distance between source and destination pointers
            let diff := sub(res, add(_bytes, _start))

            for {
                let src := add(add(_bytes, 32), _start)
                let end := add(src, _length)
            } lt(src, end) {
                src := add(src, 32)
            } {
                mstore(add(src, diff), mload(src))
            }
        }
    }

    /// @notice Take a slice of the byte array, overwriting the destination.
    /// The length of the slice will equal the length of the destination array.
    /// @dev Make sure the destination array has afterspace if required.
    /// @param _bytes The source array
    /// @param _dest The destination array.
    /// @param _start The location to start in the source array.
    function sliceInPlace(
        bytes memory _bytes,
        bytes memory _dest,
        uint _start
    ) internal pure {
        uint _length = _dest.length;
        uint _end = _start + _length;
        require(_end > _start && _bytes.length >= _end, "Slice out of bounds");

        assembly {
            for {
                let src := add(add(_bytes, 32), _start)
                let res := add(_dest, 32)
                let end := add(src, _length)
            } lt(src, end) {
                src := add(src, 32)
                res := add(res, 32)
            } {
                mstore(res, mload(src))
            }
        }
    }

    // Static slice functions, no bounds checking
    /// @notice take a 32-byte slice from the specified position
    function slice32(bytes memory _bytes, uint _start) internal pure returns (bytes32 res) {
        assembly {
            res := mload(add(add(_bytes, 32), _start))
        }
    }

    /// @notice take a 20-byte slice from the specified position
    function slice20(bytes memory _bytes, uint _start) internal pure returns (bytes20) {
        return bytes20(slice32(_bytes, _start));
    }

    /// @notice take a 8-byte slice from the specified position
    function slice8(bytes memory _bytes, uint _start) internal pure returns (bytes8) {
        return bytes8(slice32(_bytes, _start));
    }

    /// @notice take a 4-byte slice from the specified position
    function slice4(bytes memory _bytes, uint _start) internal pure returns (bytes4) {
        return bytes4(slice32(_bytes, _start));
    }

    /// @notice take a 3-byte slice from the specified position
    function slice3(bytes memory _bytes, uint _start) internal pure returns (bytes3) {
        return bytes3(slice32(_bytes, _start));
    }

    /// @notice take a 2-byte slice from the specified position
    function slice2(bytes memory _bytes, uint _start) internal pure returns (bytes2) {
        return bytes2(slice32(_bytes, _start));
    }

    function toAddress(bytes memory _bytes, uint _start) internal  pure returns (address) {
        uint _totalLen = _start + 20;
        require(_totalLen > _start && _bytes.length >= _totalLen, "Address conversion out of bounds.");
        address tempAddress;

        assembly {
            tempAddress := div(mload(add(add(_bytes, 0x20), _start)), 0x1000000000000000000000000)
        }

        return tempAddress;
    }

    function toUint(bytes memory _bytes, uint _start) internal  pure returns (uint256) {
        uint _totalLen = _start + 32;
        require(_totalLen > _start && _bytes.length >= _totalLen, "Uint conversion out of bounds.");
        uint256 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x20), _start))
        }

        return tempUint;
    }

    function equal(bytes memory _preBytes, bytes memory _postBytes) internal pure returns (bool) {
        bool success = true;

        assembly {
            let length := mload(_preBytes)

            // if lengths don't match the arrays are not equal
            switch eq(length, mload(_postBytes))
            case 1 {
                // cb is a circuit breaker in the for loop since there's
                //  no said feature for inline assembly loops
                // cb = 1 - don't breaker
                // cb = 0 - break
                let cb := 1

                let mc := add(_preBytes, 0x20)
                let end := add(mc, length)

                for {
                    let cc := add(_postBytes, 0x20)
                    // the next line is the loop condition:
                    // while(uint(mc < end) + cb == 2)
                } eq(add(lt(mc, end), cb), 2) {
                    mc := add(mc, 0x20)
                    cc := add(cc, 0x20)
                } {
                    // if any of these checks fails then arrays are not equal
                    if iszero(eq(mload(mc), mload(cc))) {
                        // unsuccess:
                        success := 0
                        cb := 0
                    }
                }
            }
            default {
                // unsuccess:
                success := 0
            }
        }

        return success;
    }

    function equalStorage(bytes storage _preBytes, bytes memory _postBytes) internal view returns (bool) {
        bool success = true;

        assembly {
            // we know _preBytes_offset is 0
            let fslot := sload(_preBytes.slot)
            // Decode the length of the stored array like in concatStorage().
            let slength := div(and(fslot, sub(mul(0x100, iszero(and(fslot, 1))), 1)), 2)
            let mlength := mload(_postBytes)

            // if lengths don't match the arrays are not equal
            switch eq(slength, mlength)
            case 1 {
                // slength can contain both the length and contents of the array
                // if length < 32 bytes so let's prepare for that
                // v. http://solidity.readthedocs.io/en/latest/miscellaneous.html#layout-of-state-variables-in-storage
                if iszero(iszero(slength)) {
                    switch lt(slength, 32)
                    case 1 {
                        // blank the last byte which is the length
                        fslot := mul(div(fslot, 0x100), 0x100)

                        if iszero(eq(fslot, mload(add(_postBytes, 0x20)))) {
                            // unsuccess:
                            success := 0
                        }
                    }
                    default {
                        // cb is a circuit breaker in the for loop since there's
                        //  no said feature for inline assembly loops
                        // cb = 1 - don't breaker
                        // cb = 0 - break
                        let cb := 1

                        // get the keccak hash to get the contents of the array
                        mstore(0x0, _preBytes.slot)
                        let sc := keccak256(0x0, 0x20)

                        let mc := add(_postBytes, 0x20)
                        let end := add(mc, mlength)

                        // the next line is the loop condition:
                        // while(uint(mc < end) + cb == 2)
                        for {} eq(add(lt(mc, end), cb), 2) {
                            sc := add(sc, 1)
                            mc := add(mc, 0x20)
                        } {
                            if iszero(eq(sload(sc), mload(mc))) {
                                // unsuccess:
                                success := 0
                                cb := 0
                            }
                        }
                    }
                }
            }
            default {
                // unsuccess:
                success := 0
            }
        }

        return success;
    }

    function toBytes32(bytes memory _source) pure internal returns (bytes32 result) {
        if (_source.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(_source, 32))
        }
    }

    function keccak256Slice(bytes memory _bytes, uint _start, uint _length) pure internal returns (bytes32 result) {
        uint _end = _start + _length;
        require(_end > _start && _bytes.length >= _end, "Slice out of bounds");

        assembly {
            result := keccak256(add(add(_bytes, 32), _start), _length)
        }
    }
}

// File: @keep-network/bitcoin-spv-sol/contracts/SafeMath.sol

pragma solidity ^0.8.4;

/*
The MIT License (MIT)

Copyright (c) 2016 Smart Contract Solutions, Inc.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {

    /**
     * @dev Multiplies two numbers, throws on overflow.
     */
    function mul(uint256 _a, uint256 _b) internal pure returns (uint256 c) {
        // Gas optimization: this is cheaper than asserting 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
        if (_a == 0) {
            return 0;
        }

        c = _a * _b;
        require(c / _a == _b, "Overflow during multiplication.");
        return c;
    }

    /**
     * @dev Integer division of two numbers, truncating the quotient.
     */
    function div(uint256 _a, uint256 _b) internal pure returns (uint256) {
        // assert(_b > 0); // Solidity automatically throws when dividing by 0
        // uint256 c = _a / _b;
        // assert(_a == _b * c + _a % _b); // There is no case in which this doesn't hold
        return _a / _b;
    }

    /**
     * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
     */
    function sub(uint256 _a, uint256 _b) internal pure returns (uint256) {
        require(_b <= _a, "Underflow during subtraction.");
        return _a - _b;
    }

    /**
     * @dev Adds two numbers, throws on overflow.
     */
    function add(uint256 _a, uint256 _b) internal pure returns (uint256 c) {
        c = _a + _b;
        require(c >= _a, "Overflow during addition.");
        return c;
    }
}

// File: @keep-network/bitcoin-spv-sol/contracts/BTCUtils.sol

pragma solidity ^0.8.4;

/** @title BitcoinSPV */
/** @author Summa (https://summa.one) */



library BTCUtils {
    using BytesLib for bytes;
    using SafeMath for uint256;

    // The target at minimum Difficulty. Also the target of the genesis block
    uint256 public constant DIFF1_TARGET = 0xffff0000000000000000000000000000000000000000000000000000;

    uint256 public constant RETARGET_PERIOD = 2 * 7 * 24 * 60 * 60;  // 2 weeks in seconds
    uint256 public constant RETARGET_PERIOD_BLOCKS = 2016;  // 2 weeks in blocks

    uint256 public constant ERR_BAD_ARG = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    /* ***** */
    /* UTILS */
    /* ***** */

    /// @notice         Determines the length of a VarInt in bytes
    /// @dev            A VarInt of >1 byte is prefixed with a flag indicating its length
    /// @param _flag    The first byte of a VarInt
    /// @return         The number of non-flag bytes in the VarInt
    function determineVarIntDataLength(bytes memory _flag) internal pure returns (uint8) {
        return determineVarIntDataLengthAt(_flag, 0);
    }

    /// @notice         Determines the length of a VarInt in bytes
    /// @dev            A VarInt of >1 byte is prefixed with a flag indicating its length
    /// @param _b       The byte array containing a VarInt
    /// @param _at      The position of the VarInt in the array
    /// @return         The number of non-flag bytes in the VarInt
    function determineVarIntDataLengthAt(bytes memory _b, uint256 _at) internal pure returns (uint8) {
        if (uint8(_b[_at]) == 0xff) {
            return 8;  // one-byte flag, 8 bytes data
        }
        if (uint8(_b[_at]) == 0xfe) {
            return 4;  // one-byte flag, 4 bytes data
        }
        if (uint8(_b[_at]) == 0xfd) {
            return 2;  // one-byte flag, 2 bytes data
        }

        return 0;  // flag is data
    }

    /// @notice     Parse a VarInt into its data length and the number it represents
    /// @dev        Useful for Parsing Vins and Vouts. Returns ERR_BAD_ARG if insufficient bytes.
    ///             Caller SHOULD explicitly handle this case (or bubble it up)
    /// @param _b   A byte-string starting with a VarInt
    /// @return     number of bytes in the encoding (not counting the tag), the encoded int
    function parseVarInt(bytes memory _b) internal pure returns (uint256, uint256) {
        return parseVarIntAt(_b, 0);
    }

    /// @notice     Parse a VarInt into its data length and the number it represents
    /// @dev        Useful for Parsing Vins and Vouts. Returns ERR_BAD_ARG if insufficient bytes.
    ///             Caller SHOULD explicitly handle this case (or bubble it up)
    /// @param _b   A byte-string containing a VarInt
    /// @param _at  The position of the VarInt
    /// @return     number of bytes in the encoding (not counting the tag), the encoded int
    function parseVarIntAt(bytes memory _b, uint256 _at) internal pure returns (uint256, uint256) {
        uint8 _dataLen = determineVarIntDataLengthAt(_b, _at);

        if (_dataLen == 0) {
            return (0, uint8(_b[_at]));
        }
        if (_b.length < 1 + _dataLen + _at) {
            return (ERR_BAD_ARG, 0);
        }
        uint256 _number;
        if (_dataLen == 2) {
            _number = reverseUint16(uint16(_b.slice2(1 + _at)));
        } else if (_dataLen == 4) {
            _number = reverseUint32(uint32(_b.slice4(1 + _at)));
        } else if (_dataLen == 8) {
            _number = reverseUint64(uint64(_b.slice8(1 + _at)));
        }
        return (_dataLen, _number);
    }

    /// @notice          Changes the endianness of a byte array
    /// @dev             Returns a new, backwards, bytes
    /// @param _b        The bytes to reverse
    /// @return          The reversed bytes
    function reverseEndianness(bytes memory _b) internal pure returns (bytes memory) {
        bytes memory _newValue = new bytes(_b.length);

        for (uint i = 0; i < _b.length; i++) {
            _newValue[_b.length - i - 1] = _b[i];
        }

        return _newValue;
    }

    /// @notice          Changes the endianness of a uint256
    /// @dev             https://graphics.stanford.edu/~seander/bithacks.html#ReverseParallel
    /// @param _b        The unsigned integer to reverse
    /// @return v        The reversed value
    function reverseUint256(uint256 _b) internal pure returns (uint256 v) {
        v = _b;

        // swap bytes
        v = ((v >> 8) & 0x00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF) |
            ((v & 0x00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF) << 8);
        // swap 2-byte long pairs
        v = ((v >> 16) & 0x0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF) |
            ((v & 0x0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF) << 16);
        // swap 4-byte long pairs
        v = ((v >> 32) & 0x00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF) |
            ((v & 0x00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF) << 32);
        // swap 8-byte long pairs
        v = ((v >> 64) & 0x0000000000000000FFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF) |
            ((v & 0x0000000000000000FFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF) << 64);
        // swap 16-byte long pairs
        v = (v >> 128) | (v << 128);
    }

    /// @notice          Changes the endianness of a uint64
    /// @param _b        The unsigned integer to reverse
    /// @return v        The reversed value
    function reverseUint64(uint64 _b) internal pure returns (uint64 v) {
        v = _b;

        // swap bytes
        v = ((v >> 8) & 0x00FF00FF00FF00FF) |
            ((v & 0x00FF00FF00FF00FF) << 8);
        // swap 2-byte long pairs
        v = ((v >> 16) & 0x0000FFFF0000FFFF) |
            ((v & 0x0000FFFF0000FFFF) << 16);
        // swap 4-byte long pairs
        v = (v >> 32) | (v << 32);
    }

    /// @notice          Changes the endianness of a uint32
    /// @param _b        The unsigned integer to reverse
    /// @return v        The reversed value
    function reverseUint32(uint32 _b) internal pure returns (uint32 v) {
        v = _b;

        // swap bytes
        v = ((v >> 8) & 0x00FF00FF) |
            ((v & 0x00FF00FF) << 8);
        // swap 2-byte long pairs
        v = (v >> 16) | (v << 16);
    }

    /// @notice          Changes the endianness of a uint24
    /// @param _b        The unsigned integer to reverse
    /// @return v        The reversed value
    function reverseUint24(uint24 _b) internal pure returns (uint24 v) {
        v =  (_b << 16) | (_b & 0x00FF00) | (_b >> 16);
    }

    /// @notice          Changes the endianness of a uint16
    /// @param _b        The unsigned integer to reverse
    /// @return v        The reversed value
    function reverseUint16(uint16 _b) internal pure returns (uint16 v) {
        v =  (_b << 8) | (_b >> 8);
    }


    /// @notice          Converts big-endian bytes to a uint
    /// @dev             Traverses the byte array and sums the bytes
    /// @param _b        The big-endian bytes-encoded integer
    /// @return          The integer representation
    function bytesToUint(bytes memory _b) internal pure returns (uint256) {
        uint256 _number;

        for (uint i = 0; i < _b.length; i++) {
            _number = _number + uint8(_b[i]) * (2 ** (8 * (_b.length - (i + 1))));
        }

        return _number;
    }

    /// @notice          Get the last _num bytes from a byte array
    /// @param _b        The byte array to slice
    /// @param _num      The number of bytes to extract from the end
    /// @return          The last _num bytes of _b
    function lastBytes(bytes memory _b, uint256 _num) internal pure returns (bytes memory) {
        uint256 _start = _b.length.sub(_num);

        return _b.slice(_start, _num);
    }

    /// @notice          Implements bitcoin's hash160 (rmd160(sha2()))
    /// @dev             abi.encodePacked changes the return to bytes instead of bytes32
    /// @param _b        The pre-image
    /// @return          The digest
    function hash160(bytes memory _b) internal pure returns (bytes memory) {
        return abi.encodePacked(ripemd160(abi.encodePacked(sha256(_b))));
    }

    /// @notice          Implements bitcoin's hash160 (sha2 + ripemd160)
    /// @dev             sha2 precompile at address(2), ripemd160 at address(3)
    /// @param _b        The pre-image
    /// @return res      The digest
    function hash160View(bytes memory _b) internal view returns (bytes20 res) {
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            pop(staticcall(gas(), 2, add(_b, 32), mload(_b), 0x00, 32))
            pop(staticcall(gas(), 3, 0x00, 32, 0x00, 32))
            // read from position 12 = 0c
            res := mload(0x0c)
        }
    }

    /// @notice          Implements bitcoin's hash256 (double sha2)
    /// @dev             abi.encodePacked changes the return to bytes instead of bytes32
    /// @param _b        The pre-image
    /// @return          The digest
    function hash256(bytes memory _b) internal pure returns (bytes32) {
        return sha256(abi.encodePacked(sha256(_b)));
    }

    /// @notice          Implements bitcoin's hash256 (double sha2)
    /// @dev             sha2 is precompiled smart contract located at address(2)
    /// @param _b        The pre-image
    /// @return res      The digest
    function hash256View(bytes memory _b) internal view returns (bytes32 res) {
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            pop(staticcall(gas(), 2, add(_b, 32), mload(_b), 0x00, 32))
            pop(staticcall(gas(), 2, 0x00, 32, 0x00, 32))
            res := mload(0x00)
        }
    }

    /// @notice          Implements bitcoin's hash256 on a pair of bytes32
    /// @dev             sha2 is precompiled smart contract located at address(2)
    /// @param _a        The first bytes32 of the pre-image
    /// @param _b        The second bytes32 of the pre-image
    /// @return res      The digest
    function hash256Pair(bytes32 _a, bytes32 _b) internal view returns (bytes32 res) {
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            mstore(0x00, _a)
            mstore(0x20, _b)
            pop(staticcall(gas(), 2, 0x00, 64, 0x00, 32))
            pop(staticcall(gas(), 2, 0x00, 32, 0x00, 32))
            res := mload(0x00)
        }
    }

    /// @notice          Implements bitcoin's hash256 (double sha2)
    /// @dev             sha2 is precompiled smart contract located at address(2)
    /// @param _b        The array containing the pre-image
    /// @param at        The start of the pre-image
    /// @param len       The length of the pre-image
    /// @return res      The digest
    function hash256Slice(
        bytes memory _b,
        uint256 at,
        uint256 len
    ) internal view returns (bytes32 res) {
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            pop(staticcall(gas(), 2, add(_b, add(32, at)), len, 0x00, 32))
            pop(staticcall(gas(), 2, 0x00, 32, 0x00, 32))
            res := mload(0x00)
        }
    }

    /* ************ */
    /* Legacy Input */
    /* ************ */

    /// @notice          Extracts the nth input from the vin (0-indexed)
    /// @dev             Iterates over the vin. If you need to extract several, write a custom function
    /// @param _vin      The vin as a tightly-packed byte array
    /// @param _index    The 0-indexed location of the input to extract
    /// @return          The input as a byte array
    function extractInputAtIndex(bytes memory _vin, uint256 _index) internal pure returns (bytes memory) {
        uint256 _varIntDataLen;
        uint256 _nIns;

        (_varIntDataLen, _nIns) = parseVarInt(_vin);
        require(_varIntDataLen != ERR_BAD_ARG, "Read overrun during VarInt parsing");
        require(_index < _nIns, "Vin read overrun");

        uint256 _len = 0;
        uint256 _offset = 1 + _varIntDataLen;

        for (uint256 _i = 0; _i < _index; _i ++) {
            _len = determineInputLengthAt(_vin, _offset);
            require(_len != ERR_BAD_ARG, "Bad VarInt in scriptSig");
            _offset = _offset + _len;
        }

        _len = determineInputLengthAt(_vin, _offset);
        require(_len != ERR_BAD_ARG, "Bad VarInt in scriptSig");
        return _vin.slice(_offset, _len);
    }

    /// @notice          Determines whether an input is legacy
    /// @dev             False if no scriptSig, otherwise True
    /// @param _input    The input
    /// @return          True for legacy, False for witness
    function isLegacyInput(bytes memory _input) internal pure returns (bool) {
        return _input[36] != hex"00";
    }

    /// @notice          Determines the length of a scriptSig in an input
    /// @dev             Will return 0 if passed a witness input.
    /// @param _input    The LEGACY input
    /// @return          The length of the script sig
    function extractScriptSigLen(bytes memory _input) internal pure returns (uint256, uint256) {
        return extractScriptSigLenAt(_input, 0);
    }

    /// @notice          Determines the length of a scriptSig in an input
    ///                  starting at the specified position
    /// @dev             Will return 0 if passed a witness input.
    /// @param _input    The byte array containing the LEGACY input
    /// @param _at       The position of the input in the array
    /// @return          The length of the script sig
    function extractScriptSigLenAt(bytes memory _input, uint256 _at) internal pure returns (uint256, uint256) {
        if (_input.length < 37 + _at) {
            return (ERR_BAD_ARG, 0);
        }

        uint256 _varIntDataLen;
        uint256 _scriptSigLen;
        (_varIntDataLen, _scriptSigLen) = parseVarIntAt(_input, _at + 36);

        return (_varIntDataLen, _scriptSigLen);
    }

    /// @notice          Determines the length of an input from its scriptSig
    /// @dev             36 for outpoint, 1 for scriptSig length, 4 for sequence
    /// @param _input    The input
    /// @return          The length of the input in bytes
    function determineInputLength(bytes memory _input) internal pure returns (uint256) {
        return determineInputLengthAt(_input, 0);
    }

    /// @notice          Determines the length of an input from its scriptSig,
    ///                  starting at the specified position
    /// @dev             36 for outpoint, 1 for scriptSig length, 4 for sequence
    /// @param _input    The byte array containing the input
    /// @param _at       The position of the input in the array
    /// @return          The length of the input in bytes
    function determineInputLengthAt(bytes memory _input, uint256 _at) internal pure returns (uint256) {
        uint256 _varIntDataLen;
        uint256 _scriptSigLen;
        (_varIntDataLen, _scriptSigLen) = extractScriptSigLenAt(_input, _at);
        if (_varIntDataLen == ERR_BAD_ARG) {
            return ERR_BAD_ARG;
        }

        return 36 + 1 + _varIntDataLen + _scriptSigLen + 4;
    }

    /// @notice          Extracts the LE sequence bytes from an input
    /// @dev             Sequence is used for relative time locks
    /// @param _input    The LEGACY input
    /// @return          The sequence bytes (LE uint)
    function extractSequenceLELegacy(bytes memory _input) internal pure returns (bytes4) {
        uint256 _varIntDataLen;
        uint256 _scriptSigLen;
        (_varIntDataLen, _scriptSigLen) = extractScriptSigLen(_input);
        require(_varIntDataLen != ERR_BAD_ARG, "Bad VarInt in scriptSig");
        return _input.slice4(36 + 1 + _varIntDataLen + _scriptSigLen);
    }

    /// @notice          Extracts the sequence from the input
    /// @dev             Sequence is a 4-byte little-endian number
    /// @param _input    The LEGACY input
    /// @return          The sequence number (big-endian uint)
    function extractSequenceLegacy(bytes memory _input) internal pure returns (uint32) {
        uint32 _leSeqence = uint32(extractSequenceLELegacy(_input));
        uint32 _beSequence = reverseUint32(_leSeqence);
        return _beSequence;
    }
    /// @notice          Extracts the VarInt-prepended scriptSig from the input in a tx
    /// @dev             Will return hex"00" if passed a witness input
    /// @param _input    The LEGACY input
    /// @return          The length-prepended scriptSig
    function extractScriptSig(bytes memory _input) internal pure returns (bytes memory) {
        uint256 _varIntDataLen;
        uint256 _scriptSigLen;
        (_varIntDataLen, _scriptSigLen) = extractScriptSigLen(_input);
        require(_varIntDataLen != ERR_BAD_ARG, "Bad VarInt in scriptSig");
        return _input.slice(36, 1 + _varIntDataLen + _scriptSigLen);
    }


    /* ************* */
    /* Witness Input */
    /* ************* */

    /// @notice          Extracts the LE sequence bytes from an input
    /// @dev             Sequence is used for relative time locks
    /// @param _input    The WITNESS input
    /// @return          The sequence bytes (LE uint)
    function extractSequenceLEWitness(bytes memory _input) internal pure returns (bytes4) {
        return _input.slice4(37);
    }

    /// @notice          Extracts the sequence from the input in a tx
    /// @dev             Sequence is a 4-byte little-endian number
    /// @param _input    The WITNESS input
    /// @return          The sequence number (big-endian uint)
    function extractSequenceWitness(bytes memory _input) internal pure returns (uint32) {
        uint32 _leSeqence = uint32(extractSequenceLEWitness(_input));
        uint32 _inputeSequence = reverseUint32(_leSeqence);
        return _inputeSequence;
    }

    /// @notice          Extracts the outpoint from the input in a tx
    /// @dev             32-byte tx id with 4-byte index
    /// @param _input    The input
    /// @return          The outpoint (LE bytes of prev tx hash + LE bytes of prev tx index)
    function extractOutpoint(bytes memory _input) internal pure returns (bytes memory) {
        return _input.slice(0, 36);
    }

    /// @notice          Extracts the outpoint tx id from an input
    /// @dev             32-byte tx id
    /// @param _input    The input
    /// @return          The tx id (little-endian bytes)
    function extractInputTxIdLE(bytes memory _input) internal pure returns (bytes32) {
        return _input.slice32(0);
    }

    /// @notice          Extracts the outpoint tx id from an input
    ///                  starting at the specified position
    /// @dev             32-byte tx id
    /// @param _input    The byte array containing the input
    /// @param _at       The position of the input
    /// @return          The tx id (little-endian bytes)
    function extractInputTxIdLeAt(bytes memory _input, uint256 _at) internal pure returns (bytes32) {
        return _input.slice32(_at);
    }

    /// @notice          Extracts the LE tx input index from the input in a tx
    /// @dev             4-byte tx index
    /// @param _input    The input
    /// @return          The tx index (little-endian bytes)
    function extractTxIndexLE(bytes memory _input) internal pure returns (bytes4) {
        return _input.slice4(32);
    }

    /// @notice          Extracts the LE tx input index from the input in a tx
    ///                  starting at the specified position
    /// @dev             4-byte tx index
    /// @param _input    The byte array containing the input
    /// @param _at       The position of the input
    /// @return          The tx index (little-endian bytes)
    function extractTxIndexLeAt(bytes memory _input, uint256 _at) internal pure returns (bytes4) {
        return _input.slice4(32 + _at);
    }

    /* ****** */
    /* Output */
    /* ****** */

    /// @notice          Determines the length of an output
    /// @dev             Works with any properly formatted output
    /// @param _output   The output
    /// @return          The length indicated by the prefix, error if invalid length
    function determineOutputLength(bytes memory _output) internal pure returns (uint256) {
        return determineOutputLengthAt(_output, 0);
    }

    /// @notice          Determines the length of an output
    ///                  starting at the specified position
    /// @dev             Works with any properly formatted output
    /// @param _output   The byte array containing the output
    /// @param _at       The position of the output
    /// @return          The length indicated by the prefix, error if invalid length
    function determineOutputLengthAt(bytes memory _output, uint256 _at) internal pure returns (uint256) {
        if (_output.length < 9 + _at) {
            return ERR_BAD_ARG;
        }
        uint256 _varIntDataLen;
        uint256 _scriptPubkeyLength;
        (_varIntDataLen, _scriptPubkeyLength) = parseVarIntAt(_output, 8 + _at);

        if (_varIntDataLen == ERR_BAD_ARG) {
            return ERR_BAD_ARG;
        }

        // 8-byte value, 1-byte for tag itself
        return 8 + 1 + _varIntDataLen + _scriptPubkeyLength;
    }

    /// @notice          Extracts the output at a given index in the TxOuts vector
    /// @dev             Iterates over the vout. If you need to extract multiple, write a custom function
    /// @param _vout     The _vout to extract from
    /// @param _index    The 0-indexed location of the output to extract
    /// @return          The specified output
    function extractOutputAtIndex(bytes memory _vout, uint256 _index) internal pure returns (bytes memory) {
        uint256 _varIntDataLen;
        uint256 _nOuts;

        (_varIntDataLen, _nOuts) = parseVarInt(_vout);
        require(_varIntDataLen != ERR_BAD_ARG, "Read overrun during VarInt parsing");
        require(_index < _nOuts, "Vout read overrun");

        uint256 _len = 0;
        uint256 _offset = 1 + _varIntDataLen;

        for (uint256 _i = 0; _i < _index; _i ++) {
            _len = determineOutputLengthAt(_vout, _offset);
            require(_len != ERR_BAD_ARG, "Bad VarInt in scriptPubkey");
            _offset += _len;
        }

        _len = determineOutputLengthAt(_vout, _offset);
        require(_len != ERR_BAD_ARG, "Bad VarInt in scriptPubkey");
        return _vout.slice(_offset, _len);
    }

    /// @notice          Extracts the value bytes from the output in a tx
    /// @dev             Value is an 8-byte little-endian number
    /// @param _output   The output
    /// @return          The output value as LE bytes
    function extractValueLE(bytes memory _output) internal pure returns (bytes8) {
        return _output.slice8(0);
    }

    /// @notice          Extracts the value from the output in a tx
    /// @dev             Value is an 8-byte little-endian number
    /// @param _output   The output
    /// @return          The output value
    function extractValue(bytes memory _output) internal pure returns (uint64) {
        uint64 _leValue = uint64(extractValueLE(_output));
        uint64 _beValue = reverseUint64(_leValue);
        return _beValue;
    }

    /// @notice          Extracts the value from the output in a tx
    /// @dev             Value is an 8-byte little-endian number
    /// @param _output   The byte array containing the output
    /// @param _at       The starting index of the output in the array
    /// @return          The output value
    function extractValueAt(bytes memory _output, uint256 _at) internal pure returns (uint64) {
        uint64 _leValue = uint64(_output.slice8(_at));
        uint64 _beValue = reverseUint64(_leValue);
        return _beValue;
    }

    /// @notice          Extracts the data from an op return output
    /// @dev             Returns hex"" if no data or not an op return
    /// @param _output   The output
    /// @return          Any data contained in the opreturn output, null if not an op return
    function extractOpReturnData(bytes memory _output) internal pure returns (bytes memory) {
        if (_output[9] != hex"6a") {
            return hex"";
        }
        bytes1 _dataLen = _output[10];
        return _output.slice(11, uint256(uint8(_dataLen)));
    }

    /// @notice          Extracts the hash from the output script
    /// @dev             Determines type by the length prefix and validates format
    /// @param _output   The output
    /// @return          The hash committed to by the pk_script, or null for errors
    function extractHash(bytes memory _output) internal pure returns (bytes memory) {
        return extractHashAt(_output, 8, _output.length - 8);
    }

    /// @notice          Extracts the hash from the output script
    /// @dev             Determines type by the length prefix and validates format
    /// @param _output   The byte array containing the output
    /// @param _at       The starting index of the output script in the array
    ///                  (output start + 8)
    /// @param _len      The length of the output script
    ///                  (output length - 8)
    /// @return          The hash committed to by the pk_script, or null for errors
    function extractHashAt(
        bytes memory _output,
        uint256 _at,
        uint256 _len
    ) internal pure returns (bytes memory) {
        uint8 _scriptLen = uint8(_output[_at]);

        // don't have to worry about overflow here.
        // if _scriptLen + 1 overflows, then output length would have to be < 1
        // for this check to pass. if it's < 1, then we errored when assigning
        // _scriptLen
        if (_scriptLen + 1 != _len) {
            return hex"";
        }

        if (uint8(_output[_at + 1]) == 0) {
            if (_scriptLen < 2) {
                return hex"";
            }
            uint256 _payloadLen = uint8(_output[_at + 2]);
            // Check for maliciously formatted witness outputs.
            // No need to worry about underflow as long b/c of the `< 2` check
            if (_payloadLen != _scriptLen - 2 || (_payloadLen != 0x20 && _payloadLen != 0x14)) {
                return hex"";
            }
            return _output.slice(_at + 3, _payloadLen);
        } else {
            bytes3 _tag = _output.slice3(_at);
            // p2pkh
            if (_tag == hex"1976a9") {
                // Check for maliciously formatted p2pkh
                // No need to worry about underflow, b/c of _scriptLen check
                if (uint8(_output[_at + 3]) != 0x14 ||
                    _output.slice2(_at + _len - 2) != hex"88ac") {
                    return hex"";
                }
                return _output.slice(_at + 4, 20);
            //p2sh
            } else if (_tag == hex"17a914") {
                // Check for maliciously formatted p2sh
                // No need to worry about underflow, b/c of _scriptLen check
                if (uint8(_output[_at + _len - 1]) != 0x87) {
                    return hex"";
                }
                return _output.slice(_at + 3, 20);
            }
        }
        return hex"";  /* NB: will trigger on OPRETURN and any non-standard that doesn't overrun */
    }

    /* ********** */
    /* Witness TX */
    /* ********** */


    /// @notice      Checks that the vin passed up is properly formatted
    /// @dev         Consider a vin with a valid vout in its scriptsig
    /// @param _vin  Raw bytes length-prefixed input vector
    /// @return      True if it represents a validly formatted vin
    function validateVin(bytes memory _vin) internal pure returns (bool) {
        uint256 _varIntDataLen;
        uint256 _nIns;

        (_varIntDataLen, _nIns) = parseVarInt(_vin);

        // Not valid if it says there are too many or no inputs
        if (_nIns == 0 || _varIntDataLen == ERR_BAD_ARG) {
            return false;
        }

        uint256 _offset = 1 + _varIntDataLen;

        for (uint256 i = 0; i < _nIns; i++) {
            // If we're at the end, but still expect more
            if (_offset >= _vin.length) {
                return false;
            }

            // Grab the next input and determine its length.
            uint256 _nextLen = determineInputLengthAt(_vin, _offset);
            if (_nextLen == ERR_BAD_ARG) {
                return false;
            }

            // Increase the offset by that much
            _offset += _nextLen;
        }

        // Returns false if we're not exactly at the end
        return _offset == _vin.length;
    }

    /// @notice      Checks that the vout passed up is properly formatted
    /// @dev         Consider a vout with a valid scriptpubkey
    /// @param _vout Raw bytes length-prefixed output vector
    /// @return      True if it represents a validly formatted vout
    function validateVout(bytes memory _vout) internal pure returns (bool) {
        uint256 _varIntDataLen;
        uint256 _nOuts;

        (_varIntDataLen, _nOuts) = parseVarInt(_vout);

        // Not valid if it says there are too many or no outputs
        if (_nOuts == 0 || _varIntDataLen == ERR_BAD_ARG) {
            return false;
        }

        uint256 _offset = 1 + _varIntDataLen;

        for (uint256 i = 0; i < _nOuts; i++) {
            // If we're at the end, but still expect more
            if (_offset >= _vout.length) {
                return false;
            }

            // Grab the next output and determine its length.
            // Increase the offset by that much
            uint256 _nextLen = determineOutputLengthAt(_vout, _offset);
            if (_nextLen == ERR_BAD_ARG) {
                return false;
            }

            _offset += _nextLen;
        }

        // Returns false if we're not exactly at the end
        return _offset == _vout.length;
    }



    /* ************ */
    /* Block Header */
    /* ************ */

    /// @notice          Extracts the transaction merkle root from a block header
    /// @dev             Use verifyHash256Merkle to verify proofs with this root
    /// @param _header   The header
    /// @return          The merkle root (little-endian)
    function extractMerkleRootLE(bytes memory _header) internal pure returns (bytes32) {
        return _header.slice32(36);
    }

    /// @notice          Extracts the target from a block header
    /// @dev             Target is a 256-bit number encoded as a 3-byte mantissa and 1-byte exponent
    /// @param _header   The header
    /// @return          The target threshold
    function extractTarget(bytes memory _header) internal pure returns (uint256) {
        return extractTargetAt(_header, 0);
    }

    /// @notice          Extracts the target from a block header
    /// @dev             Target is a 256-bit number encoded as a 3-byte mantissa and 1-byte exponent
    /// @param _header   The array containing the header
    /// @param at        The start of the header
    /// @return          The target threshold
    function extractTargetAt(bytes memory _header, uint256 at) internal pure returns (uint256) {
        uint24 _m = uint24(_header.slice3(72 + at));
        uint8 _e = uint8(_header[75 + at]);
        uint256 _mantissa = uint256(reverseUint24(_m));
        uint _exponent = _e - 3;

        return _mantissa * (256 ** _exponent);
    }

    /// @notice          Calculate difficulty from the difficulty 1 target and current target
    /// @dev             Difficulty 1 is 0x1d00ffff on mainnet and testnet
    /// @dev             Difficulty 1 is a 256-bit number encoded as a 3-byte mantissa and 1-byte exponent
    /// @param _target   The current target
    /// @return          The block difficulty (bdiff)
    function calculateDifficulty(uint256 _target) internal pure returns (uint256) {
        // Difficulty 1 calculated from 0x1d00ffff
        return DIFF1_TARGET.div(_target);
    }

    /// @notice          Extracts the previous block's hash from a block header
    /// @dev             Block headers do NOT include block number :(
    /// @param _header   The header
    /// @return          The previous block's hash (little-endian)
    function extractPrevBlockLE(bytes memory _header) internal pure returns (bytes32) {
        return _header.slice32(4);
    }

    /// @notice          Extracts the previous block's hash from a block header
    /// @dev             Block headers do NOT include block number :(
    /// @param _header   The array containing the header
    /// @param at        The start of the header
    /// @return          The previous block's hash (little-endian)
    function extractPrevBlockLEAt(
        bytes memory _header,
        uint256 at
    ) internal pure returns (bytes32) {
        return _header.slice32(4 + at);
    }

    /// @notice          Extracts the timestamp from a block header
    /// @dev             Time is not 100% reliable
    /// @param _header   The header
    /// @return          The timestamp (little-endian bytes)
    function extractTimestampLE(bytes memory _header) internal pure returns (bytes4) {
        return _header.slice4(68);
    }

    /// @notice          Extracts the timestamp from a block header
    /// @dev             Time is not 100% reliable
    /// @param _header   The header
    /// @return          The timestamp (uint)
    function extractTimestamp(bytes memory _header) internal pure returns (uint32) {
        return reverseUint32(uint32(extractTimestampLE(_header)));
    }

    /// @notice          Extracts the expected difficulty from a block header
    /// @dev             Does NOT verify the work
    /// @param _header   The header
    /// @return          The difficulty as an integer
    function extractDifficulty(bytes memory _header) internal pure returns (uint256) {
        return calculateDifficulty(extractTarget(_header));
    }

    /// @notice          Concatenates and hashes two inputs for merkle proving
    /// @param _a        The first hash
    /// @param _b        The second hash
    /// @return          The double-sha256 of the concatenated hashes
    function _hash256MerkleStep(bytes memory _a, bytes memory _b) internal view returns (bytes32) {
        return hash256View(abi.encodePacked(_a, _b));
    }

    /// @notice          Concatenates and hashes two inputs for merkle proving
    /// @param _a        The first hash
    /// @param _b        The second hash
    /// @return          The double-sha256 of the concatenated hashes
    function _hash256MerkleStep(bytes32 _a, bytes32 _b) internal view returns (bytes32) {
        return hash256Pair(_a, _b);
    }


    /// @notice          Verifies a Bitcoin-style merkle tree
    /// @dev             Leaves are 0-indexed. Inefficient version.
    /// @param _proof    The proof. Tightly packed LE sha256 hashes. The last hash is the root
    /// @param _index    The index of the leaf
    /// @return          true if the proof is valid, else false
    function verifyHash256Merkle(bytes memory _proof, uint _index) internal view returns (bool) {
        // Not an even number of hashes
        if (_proof.length % 32 != 0) {
            return false;
        }

        // Special case for coinbase-only blocks
        if (_proof.length == 32) {
            return true;
        }

        // Should never occur
        if (_proof.length == 64) {
            return false;
        }

        bytes32 _root = _proof.slice32(_proof.length - 32);
        bytes32 _current = _proof.slice32(0);
        bytes memory _tree = _proof.slice(32, _proof.length - 64);

        return verifyHash256Merkle(_current, _tree, _root, _index);
    }

    /// @notice          Verifies a Bitcoin-style merkle tree
    /// @dev             Leaves are 0-indexed. Efficient version.
    /// @param _leaf     The leaf of the proof. LE sha256 hash.
    /// @param _tree     The intermediate nodes in the proof.
    ///                  Tightly packed LE sha256 hashes.
    /// @param _root     The root of the proof. LE sha256 hash.
    /// @param _index    The index of the leaf
    /// @return          true if the proof is valid, else false
    function verifyHash256Merkle(
        bytes32 _leaf,
        bytes memory _tree,
        bytes32 _root,
        uint _index
    ) internal view returns (bool) {
        // Not an even number of hashes
        if (_tree.length % 32 != 0) {
            return false;
        }

        // Should never occur
        if (_tree.length == 0) {
            return false;
        }

        uint _idx = _index;
        bytes32 _current = _leaf;

        // i moves in increments of 32
        for (uint i = 0; i < _tree.length; i += 32) {
            if (_idx % 2 == 1) {
                _current = _hash256MerkleStep(_tree.slice32(i), _current);
            } else {
                _current = _hash256MerkleStep(_current, _tree.slice32(i));
            }
            _idx = _idx >> 1;
        }
        return _current == _root;
    }

    /*
    NB: https://github.com/bitcoin/bitcoin/blob/78dae8caccd82cfbfd76557f1fb7d7557c7b5edb/src/pow.cpp#L49-L72
    NB: We get a full-bitlength target from this. For comparison with
        header-encoded targets we need to mask it with the header target
        e.g. (full & truncated) == truncated
    */
    /// @notice                 performs the bitcoin difficulty retarget
    /// @dev                    implements the Bitcoin algorithm precisely
    /// @param _previousTarget  the target of the previous period
    /// @param _firstTimestamp  the timestamp of the first block in the difficulty period
    /// @param _secondTimestamp the timestamp of the last block in the difficulty period
    /// @return                 the new period's target threshold
    function retargetAlgorithm(
        uint256 _previousTarget,
        uint256 _firstTimestamp,
        uint256 _secondTimestamp
    ) internal pure returns (uint256) {
        uint256 _elapsedTime = _secondTimestamp.sub(_firstTimestamp);

        // Normalize ratio to factor of 4 if very long or very short
        if (_elapsedTime < RETARGET_PERIOD.div(4)) {
            _elapsedTime = RETARGET_PERIOD.div(4);
        }
        if (_elapsedTime > RETARGET_PERIOD.mul(4)) {
            _elapsedTime = RETARGET_PERIOD.mul(4);
        }

        /*
          NB: high targets e.g. ffff0020 can cause overflows here
              so we divide it by 256**2, then multiply by 256**2 later
              we know the target is evenly divisible by 256**2, so this isn't an issue
        */

        uint256 _adjusted = _previousTarget.div(65536).mul(_elapsedTime);
        return _adjusted.div(RETARGET_PERIOD).mul(65536);
    }
}

// File: @keep-network/bitcoin-spv-sol/contracts/ValidateSPV.sol

pragma solidity ^0.8.4;

/** @title ValidateSPV*/
/** @author Summa (https://summa.one) */





library ValidateSPV {

    using BTCUtils for bytes;
    using BTCUtils for uint256;
    using BytesLib for bytes;
    using SafeMath for uint256;

    enum InputTypes { NONE, LEGACY, COMPATIBILITY, WITNESS }
    enum OutputTypes { NONE, WPKH, WSH, OP_RETURN, PKH, SH, NONSTANDARD }

    uint256 constant ERR_BAD_LENGTH = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    uint256 constant ERR_INVALID_CHAIN = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe;
    uint256 constant ERR_LOW_WORK = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffd;

    function getErrBadLength() internal pure returns (uint256) {
        return ERR_BAD_LENGTH;
    }

    function getErrInvalidChain() internal pure returns (uint256) {
        return ERR_INVALID_CHAIN;
    }

    function getErrLowWork() internal pure returns (uint256) {
        return ERR_LOW_WORK;
    }

    /// @notice                     Validates a tx inclusion in the block
    /// @dev                        `index` is not a reliable indicator of location within a block
    /// @param _txid                The txid (LE)
    /// @param _merkleRoot          The merkle root (as in the block header)
    /// @param _intermediateNodes   The proof's intermediate nodes (digests between leaf and root)
    /// @param _index               The leaf's index in the tree (0-indexed)
    /// @return                     true if fully valid, false otherwise
    function prove(
        bytes32 _txid,
        bytes32 _merkleRoot,
        bytes memory _intermediateNodes,
        uint _index
    ) internal view returns (bool) {
        // Shortcut the empty-block case
        if (_txid == _merkleRoot && _index == 0 && _intermediateNodes.length == 0) {
            return true;
        }

        // If the Merkle proof failed, bubble up error
        return BTCUtils.verifyHash256Merkle(
            _txid,
            _intermediateNodes,
            _merkleRoot,
            _index
        );
    }

    /// @notice             Hashes transaction to get txid
    /// @dev                Supports Legacy and Witness
    /// @param _version     4-bytes version
    /// @param _vin         Raw bytes length-prefixed input vector
    /// @param _vout        Raw bytes length-prefixed output vector
    /// @param _locktime    4-byte tx locktime
    /// @return             32-byte transaction id, little endian
    function calculateTxId(
        bytes4 _version,
        bytes memory _vin,
        bytes memory _vout,
        bytes4 _locktime
    ) internal view returns (bytes32) {
        // Get transaction hash double-Sha256(version + nIns + inputs + nOuts + outputs + locktime)
        return abi.encodePacked(_version, _vin, _vout, _locktime).hash256View();
    }

    /// @notice                  Checks validity of header chain
    /// @notice                  Compares the hash of each header to the prevHash in the next header
    /// @param headers           Raw byte array of header chain
    /// @return totalDifficulty  The total accumulated difficulty of the header chain, or an error code
    function validateHeaderChain(
        bytes memory headers
    ) internal view returns (uint256 totalDifficulty) {

        // Check header chain length
        if (headers.length % 80 != 0) {return ERR_BAD_LENGTH;}

        // Initialize header start index
        bytes32 digest;

        totalDifficulty = 0;

        for (uint256 start = 0; start < headers.length; start += 80) {

            // After the first header, check that headers are in a chain
            if (start != 0) {
                if (!validateHeaderPrevHash(headers, start, digest)) {return ERR_INVALID_CHAIN;}
            }

            // ith header target
            uint256 target = headers.extractTargetAt(start);

            // Require that the header has sufficient work
            digest = headers.hash256Slice(start, 80);
            if(uint256(digest).reverseUint256() > target) {
                return ERR_LOW_WORK;
            }

            // Add ith header difficulty to difficulty sum
            totalDifficulty = totalDifficulty + target.calculateDifficulty();
        }
    }

    /// @notice             Checks validity of header work
    /// @param digest       Header digest
    /// @param target       The target threshold
    /// @return             true if header work is valid, false otherwise
    function validateHeaderWork(
        bytes32 digest,
        uint256 target
    ) internal pure returns (bool) {
        if (digest == bytes32(0)) {return false;}
        return (uint256(digest).reverseUint256() < target);
    }

    /// @notice                     Checks validity of header chain
    /// @dev                        Compares current header prevHash to previous header's digest
    /// @param headers              The raw bytes array containing the header
    /// @param at                   The position of the header
    /// @param prevHeaderDigest     The previous header's digest
    /// @return                     true if the connect is valid, false otherwise
    function validateHeaderPrevHash(
        bytes memory headers,
        uint256 at,
        bytes32 prevHeaderDigest
    ) internal pure returns (bool) {

        // Extract prevHash of current header
        bytes32 prevHash = headers.extractPrevBlockLEAt(at);

        // Compare prevHash of current header to previous header's digest
        if (prevHash != prevHeaderDigest) {return false;}

        return true;
    }
}

// File: contracts/BitcoinTx.sol



// Forked from https://github.com/bob-collective/bob

pragma solidity ^0.8.17;




/// @title Bitcoin transaction
/// @notice Allows to reference Bitcoin raw transaction in Solidity.
/// @dev See https://developer.bitcoin.org/reference/transactions.html#raw-transaction-format
// Raw Bitcoin transaction data:
//      | Bytes  |     Name     |        BTC type        |        Description        |
//      |--------|--------------|------------------------|---------------------------|
//      | 4      | version      | int32_t (LE)           | TX version number         |
//      | varies | tx_in_count  | compactSize uint (LE)  | Number of TX inputs       |
//      | varies | tx_in        | txIn[]                 | TX inputs                 |
//      | varies | tx_out_count | compactSize uint (LE)  | Number of TX outputs      |
//      | varies | tx_out       | txOut[]                | TX outputs                |
//      | 4      | lock_time    | uint32_t (LE)          | Unix time or block number |
//
//      Non-coinbase transaction input (txIn):
//
//      | Bytes  |       Name       |        BTC type        |                 Description                 |
//      |--------|------------------|------------------------|---------------------------------------------|
//      | 36     | previous_output  | outpoint               | The previous outpoint being spent           |
//      | varies | script_bytes     | compactSize uint (LE)  | The number of bytes in the signature script |
//      | varies | signature_script | char[]                 | The signature script, empty for P2WSH       |
//      | 4      | sequence         | uint32_t (LE)          | Sequence number                             |
//
//
//      The reference to transaction being spent (outpoint):
//
//      | Bytes | Name  |   BTC type    |               Description                |
//      |-------|-------|---------------|------------------------------------------|
//      |    32 | hash  | char[32]      | Hash of the transaction to spend         |
//      |    4  | index | uint32_t (LE) | Index of the specific output from the TX |
//
//
//      Transaction output (txOut):
//
//      | Bytes  |      Name       |     BTC type          |             Description              |
//      |--------|-----------------|-----------------------|--------------------------------------|
//      | 8      | value           | int64_t (LE)          | Number of satoshis to spend          |
//      | 1+     | pk_script_bytes | compactSize uint (LE) | Number of bytes in the pubkey script |
//      | varies | pk_script       | char[]                | Pubkey script                        |
//
//      compactSize uint format:
//
//      |                  Value                  | Bytes |                    Format                    |
//      |-----------------------------------------|-------|----------------------------------------------|
//      | >= 0 && <= 252                          | 1     | uint8_t                                      |
//      | >= 253 && <= 0xffff                     | 3     | 0xfd followed by the number as uint16_t (LE) |
//      | >= 0x10000 && <= 0xffffffff             | 5     | 0xfe followed by the number as uint32_t (LE) |
//      | >= 0x100000000 && <= 0xffffffffffffffff | 9     | 0xff followed by the number as uint64_t (LE) |
//
//      (*) compactSize uint is often references as VarInt)
//
//      Coinbase transaction input (txIn):
//
//      | Bytes  |       Name       |        BTC type        |                 Description                 |
//      |--------|------------------|------------------------|---------------------------------------------|
//      | 32     | hash             | char[32]               | A 32-byte 0x0  null (no previous_outpoint)  |
//      | 4      | index            | uint32_t (LE)          | 0xffffffff (no previous_outpoint)           |
//      | varies | script_bytes     | compactSize uint (LE)  | The number of bytes in the coinbase script  |
//      | varies | height           | char[]                 | The block height of this block (BIP34) (*)  |
//      | varies | coinbase_script  | none                   |  Arbitrary data, max 100 bytes              |
//      | 4      | sequence         | uint32_t (LE)          | Sequence number
//
//      (*)  Uses script language: starts with a data-pushing opcode that indicates how many bytes to push to
//           the stack followed by the block height as a little-endian unsigned integer. This script must be as
//           short as possible, otherwise it may be rejected. The data-pushing opcode will be 0x03 and the total
//           size four bytes until block 16,777,216 about 300 years from now.

library BitcoinTx {
    using BTCUtils for bytes;
    using BTCUtils for uint256;
    using BytesLib for bytes;
    using ValidateSPV for bytes;
    using ValidateSPV for bytes32;

    /// @notice Represents Bitcoin transaction data.
    struct Info {
        /// @notice Bitcoin transaction version.
        /// @dev `version` from raw Bitcoin transaction data.
        ///      Encoded as 4-bytes signed integer, little endian.
        bytes4 version;
        /// @notice All Bitcoin transaction inputs, prepended by the number of
        ///         transaction inputs.
        /// @dev `tx_in_count | tx_in` from raw Bitcoin transaction data.
        ///
        ///      The number of transaction inputs encoded as compactSize
        ///      unsigned integer, little-endian.
        ///
        ///      Note that some popular block explorers reverse the order of
        ///      bytes from `outpoint`'s `hash` and display it as big-endian.
        ///      Solidity code expects hashes in little-endian, just like
        ///      they are represented in a raw Bitcoin transaction.
        bytes inputVector;
        /// @notice All Bitcoin transaction outputs prepended by the number of
        ///         transaction outputs.
        /// @dev `tx_out_count | tx_out` from raw Bitcoin transaction data.
        ///
        ///       The number of transaction outputs encoded as a compactSize
        ///       unsigned integer, little-endian.
        bytes outputVector;
        /// @notice Bitcoin transaction locktime.
        ///
        /// @dev `lock_time` from raw Bitcoin transaction data.
        ///      Encoded as 4-bytes unsigned integer, little endian.
        bytes4 locktime;
    }

    /// @notice Represents data needed to perform a Bitcoin SPV proof.
    struct Proof {
        /// @notice The merkle proof of transaction inclusion in a block.
        bytes merkleProof;
        /// @notice Transaction index in the block (0-indexed).
        uint256 txIndexInBlock;
        /// @notice Single byte-string of 80-byte bitcoin headers,
        ///         lowest height first.
        bytes bitcoinHeaders;
    }

    /// @notice Represents info about an unspent transaction output.
    struct UTXO {
        /// @notice Hash of the transaction the output belongs to.
        /// @dev Byte order corresponds to the Bitcoin internal byte order.
        bytes32 txHash;
        /// @notice Index of the transaction output (0-indexed).
        uint32 txOutputIndex;
        /// @notice Value of the transaction output.
        uint64 txOutputValue;
    }

    /// @notice Validates the SPV proof of the Bitcoin transaction.
    ///         Reverts in case the validation or proof verification fail.
    /// @param txInfo Bitcoin transaction data.
    /// @param proof Bitcoin proof data.
    /// @return txHash Proven 32-byte transaction hash.
    function validateProof(Info memory txInfo, Proof memory proof)
        internal
        view
        returns (bytes32 txHash)
    {
        require(txInfo.inputVector.validateVin(), "Invalid input vector provided");
        require(txInfo.outputVector.validateVout(), "Invalid output vector provided");

        txHash =
            abi.encodePacked(txInfo.version, txInfo.inputVector, txInfo.outputVector, txInfo.locktime).hash256View();

        require(
            txHash.prove(proof.bitcoinHeaders.extractMerkleRootLE(), proof.merkleProof, proof.txIndexInBlock),
            "Tx merkle proof is not valid for provided header and tx hash"
        );

        return txHash;
    }

    /// @notice Represents temporary information needed during the processing of
    ///         the Bitcoin transaction outputs. This structure is an internal one
    ///         and should not be exported outside of the transaction processing code.
    /// @dev Allows to mitigate "stack too deep" errors on EVM.
    struct TxOutputsProcessingInfo {
        // The first output starting index in the transaction.
        uint256 outputStartingIndex;
        // The number of outputs in the transaction.
        uint256 outputsCount;
    }

    /// @notice Represents an outcome of the Bitcoin transaction
    ///         outputs processing.
    struct TxOutputsInfo {
        // Sum of all outputs values spending to the output.
        uint64 value;
        // Optional EVM address specified in OP_RETURN.
        address evmAddress;
    }

    /// @notice Processes the Bitcoin transaction output vector.
    /// @param txOutputVector Bitcoin transaction output vector.
    ///        This function assumes vector's structure is valid so it
    ///        must be validated using e.g. `BTCUtils.validateVout` function
    ///        before it is passed here.
    /// @param scriptPubKeyHash Expected Bitcoin scriptPubKey keccak256 hash.
    /// @return resultInfo Outcomes of the processing.
    function processTxOutputs(bytes memory txOutputVector, bytes32 scriptPubKeyHash)
        internal
        pure
        returns (TxOutputsInfo memory resultInfo)
    {
        // Determining the total number of transaction outputs in the same way as
        // for number of inputs. See `BitcoinTx.outputVector` docs for more details.
        (uint256 outputsCompactSizeUintLength, uint256 outputsCount) = txOutputVector.parseVarInt();

        // To determine the first output starting index, we must jump over
        // the compactSize uint which prepends the output vector. One byte
        // must be added because `BtcUtils.parseVarInt` does not include
        // compactSize uint tag in the returned length.
        //
        // For >= 0 && <= 252, `BTCUtils.determineVarIntDataLengthAt`
        // returns `0`, so we jump over one byte of compactSize uint.
        //
        // For >= 253 && <= 0xffff there is `0xfd` tag,
        // `BTCUtils.determineVarIntDataLengthAt` returns `2` (no
        // tag byte included) so we need to jump over 1+2 bytes of
        // compactSize uint.
        //
        // Please refer `BTCUtils` library and compactSize uint
        // docs in `BitcoinTx` library for more details.
        uint256 outputStartingIndex = 1 + outputsCompactSizeUintLength;

        return processTxOutputs(
            txOutputVector, scriptPubKeyHash, TxOutputsProcessingInfo(outputStartingIndex, outputsCount)
        );
    }

    /// @notice Processes all outputs from the transaction.
    /// @param txOutputVector Bitcoin transaction output vector. This function
    ///        assumes vector's structure is valid so it must be validated using
    ///        e.g. `BTCUtils.validateVout` function before it is passed here.
    /// @param scriptPubKeyHash Expected Bitcoin scriptPubKey keccak256 hash.
    /// @param processInfo TxOutputsProcessingInfo identifying output
    ///        starting index and the number of outputs.
    function processTxOutputs(
        bytes memory txOutputVector,
        bytes32 scriptPubKeyHash,
        TxOutputsProcessingInfo memory processInfo
    ) internal pure returns (TxOutputsInfo memory resultInfo) {
        // Helper flag indicating whether there was at least one
        // output present
        bool outputPresent = false;

        // Outputs processing loop.
        for (uint256 i = 0; i < processInfo.outputsCount; i++) {
            uint256 outputLength = txOutputVector.determineOutputLengthAt(processInfo.outputStartingIndex);

            // Extract the value from given output.
            uint64 outputValue = txOutputVector.extractValueAt(processInfo.outputStartingIndex);

            // The output consists of an 8-byte value and a variable length
            // script. To hash that script we slice the output starting from
            // 9th byte until the end.
            uint256 scriptLength = outputLength - 8;
            uint256 outputScriptStart = processInfo.outputStartingIndex + 8;

            bytes32 outputScriptHash;
            /* solhint-disable-next-line no-inline-assembly */
            assembly {
                // The first argument to assembly keccak256 is the pointer.
                // We point to `txOutputVector` but at the position indicated
                // by `outputScriptStart`. To load that position, we
                // need to call `add(outputScriptStart, 32)` because
                // `outputScriptStart` has 32 bytes.
                outputScriptHash := keccak256(add(txOutputVector, add(outputScriptStart, 32)), scriptLength)
            }

            if (scriptPubKeyHash == outputScriptHash) {
                outputPresent = true;
                // Accumulate the total in case there are multiple
                // payments to the same output
                resultInfo.value += outputValue;
            } else {
                address outputEvmAddress = extractEvmAddressFromOutput(txOutputVector, processInfo.outputStartingIndex);
                if (outputEvmAddress != address(0)) {
                    // NOTE: this will overwrite if there are multiple OP_RETURN outputs
                    resultInfo.evmAddress = outputEvmAddress;
                }
            }

            // Make the `outputStartingIndex` pointing to the next output by
            // increasing it by current output's length.
            processInfo.outputStartingIndex += outputLength;
        }

        require(outputPresent, "No output found for scriptPubKey");
    }

    function extractEvmAddressFromOutput(bytes memory _output, uint256 _at)
        internal
        pure
        returns (address evmAddress)
    {
        // OP_RETURN
        if (_output[_at + 9] != hex"6a") {
            return address(0);
        }
        bytes1 _dataLen = _output[_at + 10];
        if (uint256(uint8(_dataLen)) == 20) {
            uint256 opReturnStart = _at + 11;
            assembly {
                evmAddress := mload(add(_output, add(opReturnStart, 20)))
            }
        }
    }

    function reverseEndianness(bytes32 b) internal pure returns (bytes32 txHash) {
        bytes memory newValue = new bytes(b.length);
        for (uint256 i = 0; i < b.length; i++) {
            newValue[b.length - i - 1] = b[i];
        }
        assembly {
            txHash := mload(add(newValue, 32))
        }
    }

    function ensureTxInputSpendsUtxo(bytes memory _vin, BitcoinTx.UTXO memory utxo) internal pure {
        uint256 _varIntDataLen;
        uint256 _nIns;

        (_varIntDataLen, _nIns) = BTCUtils.parseVarInt(_vin);
        require(_varIntDataLen != BTCUtils.ERR_BAD_ARG, "Read overrun during VarInt parsing");

        uint256 _len = 0;
        uint256 _offset = 1 + _varIntDataLen;

        bytes32 expectedTxHash = reverseEndianness(utxo.txHash);

        for (uint256 _i = 0; _i < _nIns; _i++) {
            bytes32 outpointTxHash = _vin.extractInputTxIdLeAt(_offset);
            uint32 outpointIndex = BTCUtils.reverseUint32(uint32(_vin.extractTxIndexLeAt(_offset)));

            // check if it matches tx
            if (expectedTxHash == outpointTxHash && utxo.txOutputIndex == outpointIndex) {
                return;
            }

            _len = BTCUtils.determineInputLengthAt(_vin, _offset);
            require(_len != BTCUtils.ERR_BAD_ARG, "Bad VarInt in scriptSig");
            _offset = _offset + _len;
        }

        revert("Transaction does not spend the required utxo");
    }
}