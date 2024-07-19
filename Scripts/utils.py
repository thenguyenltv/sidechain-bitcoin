import binascii
import hashlib
import json

import struct

from flask import Flask, request, jsonify # type: ignore

# Chuỗi hex ban đầu
original_hex = "de7a1f2a8a8a54357196fddb37c90d41cd48d48251b5517f3a454c21eb970cf0"

# Raw transaction bitcoin
RAW_TX = "0100000001448264ebfc64ae753673b6e379e9d0f5173aa06b9a104212638aed380060670b00000000fd5f02004730440220441f0892393bd822b8419083a8a3f745f6446b50d6c1f2afbbd931f91539298c02200dd963b87536a65af64b5eeedd2528c7e5755328f67292b2eaf558326743304d01483045022100f9b1e81648c973c066c08ac3fe3db01f414287c03903e038c746d602dda6aa2802205d8a7ae6dd988c4e345c60164a055f63c54bbcb6aa42ee9b839d97fffbac4d3901483045022100f339b819c367810387a65fcd093ebb7387bdd846cf921dd7d4e04b63ab72463802204192ed69bd21fa9b8973a2a35de668eca4212337eed0e16624886cdd877d804c01483045022100ddc63b9cc944bda1ad8438d3d40bbd4c572c2f46cabbf703250cf4d8890bee4a022026db27da05cb8701b8105663a52fd678d6fbbd32ca4cf106732f5537d8e875c30147304402204e32943ce981f4080b4e9b420a9e90065982c99632513828c357495d231cbd26022017c7fd1e27e89d9278b51564c010f673d44ac9e340821111b3efaba4032904e3014cf155210362b19ea469a6f90f6a46589a59e0cf03b92cca9ad675a33263bf5b892b984b5b2102ce4c40ab57996aa18bb354c42e2633b98900144bda8df367f356bbed2cd4090b2102bd1ae55b1ac4af987e2570a9ce59900ab290cdfa4f990d5a55dbeb1d5df61cc521025c3e6463307ae607265dbea84935665a90c3fde706512ef04070247ab1772b8121026bdc22a8f2cc6a2a6a2efb48979b9606275358d5c02ebfd8e7f883630cd178372103f73d194d3507abf7eeee0433dcb529cdedd57d089c25a7f0a7c6e4c663d13eae21020fc50638dda38ea7dd759754eb0a603d06134ee6607e72d4340b038f21ba7d6657aeffffffff02e8030000000000001976a91439b404ffe8f8bed76116d2e5200753d4f600b2c288ac6c1d00000000000017a91421eb2398b15b72b1b863d22c6c5fb9c75e94e9278700000000"
RAW_TX_TMP = "01000000000101d8cb7e580e4a231c7117448c4767dfaba2a77f88b1b987eb58be091ae15bb01f0200000000ffffffff0220a107000000000022512098f28de4e9b396f1fd92bab4297b074de934dba4ca53e92691268e7c08b20056cf7470200000000016001471c1c386a4772bbc7f39dc7c7e75a17ff5d1e924024830450221008d8d471f8b9711adf10ff4ca7d293c407a9d5f98d4bc53cb0c02f9c0e3466b4e02200a2f566a1d2d27f56ddd4b5c2ce8bfa4a9385ee1fb4590e1b6b91ea6061d8da3012103bbcd5914f15887ed609c6278c077241cd95f80dc199989f89f968ff007fe8c0000000000"


app = Flask(__name__)

def reverse_hex_endianness(hex_string):
    """
    Đảo ngược endianness của một chuỗi hex.

    Args:
    hex_string (str): Chuỗi hex cần đảo ngược endianness.

    Returns:
    str: Chuỗi hex sau khi đã đảo ngược endianness.
    """
    # Chuyển đổi chuỗi hex thành bytes
    original_bytes = binascii.unhexlify(hex_string)
    # Đảo ngược endianness
    reversed_bytes = original_bytes[::-1]
    # Chuyển đổi lại thành chuỗi hex và trả về
    return binascii.hexlify(reversed_bytes).decode()

print(reverse_hex_endianness(original_hex))  # Output: "04030201"

def parse_varint(data, offset):
    value = data[offset]
    offset += 1
    if value < 0xfd:
        return value, offset
    elif value == 0xfd:
        return struct.unpack_from('<H', data, offset)[0], offset + 2
    elif value == 0xfe:
        return struct.unpack_from('<I', data, offset)[0], offset + 4
    else:
        return struct.unpack_from('<Q', data, offset)[0], offset + 8

def parse_input(data, offset):
    txid = binascii.hexlify(data[offset:offset + 32][::-1]).decode('utf-8')
    offset += 32
    vout = struct.unpack_from('<I', data, offset)[0]
    offset += 4
    script_len, offset = parse_varint(data, offset)
    script_sig = binascii.hexlify(data[offset:offset + script_len]).decode('utf-8')
    offset += script_len
    sequence = struct.unpack_from('<I', data, offset)[0]
    offset += 4
    return {
        'txid': txid,
        'vout': vout,
        'scriptSig': script_sig,
        'sequence': sequence
    }, offset

def parse_output(data, offset):
    value = struct.unpack_from('<Q', data, offset)[0] / 1e8
    offset += 8
    script_len, offset = parse_varint(data, offset)
    script_pubkey = binascii.hexlify(data[offset:offset + script_len]).decode('utf-8')
    offset += script_len
    return {
        'value': value,
        'scriptPubKey': script_pubkey
    }, offset

def parse_raw_transaction(raw_tx):
    data = binascii.unhexlify(raw_tx)
    offset = 0

    # Version
    version = struct.unpack_from('<I', data, offset)[0]
    offset += 4

    # Input count
    input_count, offset = parse_varint(data, offset)

    # Inputs
    inputs = []
    for _ in range(input_count):
        tx_input, offset = parse_input(data, offset)
        inputs.append(tx_input)

    # Output count
    output_count, offset = parse_varint(data, offset)

    # Outputs
    outputs = []
    for _ in range(output_count):
        tx_output, offset = parse_output(data, offset)
        outputs.append(tx_output)

    # Locktime
    locktime = struct.unpack_from('<I', data, offset)[0]
    offset += 4

    return {
        'version': version,
        'inputs': inputs,
        'outputs': outputs,
        'locktime': locktime
    }


def parse_input_hex(data, offset):
    start = offset
    offset += 32  # txid
    offset += 4   # vout
    script_len, offset = parse_varint(data, offset)
    offset += script_len  # scriptSig
    offset += 4   # sequence
    return binascii.hexlify(data[start:offset]).decode('utf-8'), offset

def parse_output_hex(data, offset):
    start = offset
    offset += 8  # value
    script_len, offset = parse_varint(data, offset)
    offset += script_len  # scriptPubKey
    return binascii.hexlify(data[start:offset]).decode('utf-8'), offset

def get_vin_vout_hex(raw_tx):
    data = binascii.unhexlify(raw_tx)
    offset = 0

    # Version
    offset += 4

    # Input count
    input_count, offset = parse_varint(data, offset)

    # Inputs hex
    vin_hex = []
    for _ in range(input_count):
        tx_input_hex, offset = parse_input_hex(data, offset)
        vin_hex.append(tx_input_hex)

    # Output count
    output_count, offset = parse_varint(data, offset)

    # Outputs hex
    vout_hex = []
    for _ in range(output_count):
        tx_output_hex, offset = parse_output_hex(data, offset)
        vout_hex.append(tx_output_hex)

    return {
        'vin_hex': vin_hex,
        'vout_hex': vout_hex
    }

def ensure_bytes(data):
  if not isinstance(data, bytes):
    return data.encode()  # Encode to bytes if not already
  else:
    return data

def double_sha256(data):
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def merkle_tree(transactions):
    if len(transactions) == 0:
        return []
    tree = [bytes.fromhex(tx) for tx in transactions]
    while len(tree) > 1:
        if len(tree) % 2 == 1:
            tree.append(tree[-1])  # duplicate the last element if odd number of elements
        tree = [double_sha256(tree[i] + tree[i + 1]) for i in range(0, len(tree), 2)]
    return tree[0].hex()

def merkle_path(transactions, target_txid):
    if target_txid not in transactions:
        return None, None
    path = []
    index = transactions.index(target_txid)
    tree = [bytes.fromhex(tx) for tx in transactions]
    while len(tree) > 1:
        new_tree = []
        for i in range(0, len(tree), 2):
            left = tree[i]
            right = tree[i + 1] if i + 1 < len(tree) else tree[i]
            new_tree.append(double_sha256(left + right))
            if i == index or i + 1 == index:
                sibling = right if i == index else left
                path.append(sibling.hex())
                index = len(new_tree) - 1
        tree = new_tree
    return path, tree[0].hex()

def get_merkle_proof(transactions, target_txid):
    '''
    Trả về Merkle Root và Merkle proof theo định dạng hex
    '''
    path, root = merkle_path(transactions, target_txid)
    # merkle_proof_hex = tổng hợp các phần tử trong path
    merkle_proof_hex = ''
    for item in path:
        merkle_proof_hex += item  # Chuyển item thành chuỗi nếu nó chưa phải là chuỗi

    return root, merkle_proof_hex

# Lấy danh sách transaction từ constant.json
def get_transactions_from_json(filename):
    with open(filename, 'r') as file:
        data = json.load(file)
    
    # Danh sách transaction được lưu trong key "transactions"
    transactions = data.get("transactions", [])
    
    return transactions


# parsed_tx = parse_raw_transaction(RAW_TX)
# print(parsed_tx)

# parsed_tx_hex = get_vin_vout_hex(RAW_TX)
# print(parsed_tx_hex)

# transactions = get_transactions_from_json("constant.json")
# converted_transactions = [reverse_hex_endianness(hex_str) for hex_str in transactions]
# target_txid = "4f3bc52aea597951609eaaf992e3d139f150a2492dbb1d2ab8a1439443a696f4"
# root, proof = get_merkle_proof(converted_transactions, target_txid)
# print("Merkle Root:", root) # 85687eb3dc2947f90d8154334be58243b3b07e6e37955aed15b58cfd076e912e
# print("Merkle Proof:", proof)

@app.route('/get-merkle-proof', methods=['POST'])
def post_merkle_proof():
    data = request.json
    transactions = data.get("transactions", [])
    target_txid = data.get("target_txid", "")

    converted_transactions = [reverse_hex_endianness(hex_str) for hex_str in transactions]
    root, proof = get_merkle_proof(converted_transactions, target_txid)

    return jsonify({
        "merkle_root": root,
        "merkle_proof": proof
    })

# How to use:
# curl -X POST http://localhost:5000/get-merkle-proof -H "Content-Type: application/json" -d '{"transactions": ["de7a1f2a8a8a54357196fddb37c90d41cd48d48251b5517f3a454c21eb970cf0", "de7a1f2a8a8a54357196fddb37c90d41cd48d48251b5517f3a454c21eb970cf0"], "target_txid": "de7a1f2a8a8a54357196fddb37c90d41cd48d48251b5517f3a454c21eb970cf0"}'
# or using Postman: POST http://localhost:5000/get-merkle-proof with JSON body {"transactions": ["de7a1f2a8a8a54357196fddb37c90d41cd48d48251b5517f3a454c21eb970cf0", "de7a1f2a8a8a54357196fddb37c90d41cd48d48251b5517f3a454c21eb970cf0"], "target_txid": "de7a1f2a8a8a54357196fddb37c90d41cd48d48251b5517f3a454c21eb970cf0"}
# or using JavaScript: fetch('http://localhost:5000/get-merkle-proof', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({"transactions": ["de7a1f2a8a8a54357196fddb37c90d41cd48d48251b5517f3a454c21eb970cf0", "de7a1f2a8a8a54357196fddb37c90d41cd48d48251b5517f3a454c21eb970cf0"], "target_txid": "de7a1f2a8a8a54357196fddb37c90d41cd48d48251b5517f3a454c21eb970cf0"}}).then(res => res.json()).then(console.log)

# Post to get_vin_vout_hex
@app.route('/get-vin-vout-hex', methods=['POST'])
def post_vin_vout_hex():
    data = request.json
    raw_tx = data.get("raw_tx", "")
    parsed_tx_hex = get_vin_vout_hex(raw_tx)

    return jsonify(parsed_tx_hex)


if __name__ == '__main__':
    app.run(debug=True)