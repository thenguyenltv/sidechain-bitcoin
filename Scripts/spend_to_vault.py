from bitcoin.wallet import CBitcoinSecret, P2PKHBitcoinAddress, P2SHBitcoinAddress
from bitcoin.core import CMutableTxOut, CMutableTxIn, COutPoint, lx, CMutableTransaction, Hash160
from bitcoin.core.script import OP_DUP, OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG, OP_RETURN
from bitcoin.core.script import CScript, SignatureHash, SIGHASH_ALL
from bitcoin.core.scripteval import VerifyScript, SCRIPT_VERIFY_P2SH
from bitcoin import SelectParams
import requests
import sys

VIRTUAL_SIZE = 280

def get_value(txid, output_index):
    url = f'https://mempool.space/testnet/api/tx/{txid}'
    response = requests.get(url)
    response_json = response.json()
    return response_json['vout'][output_index]['value']

def get_fee_rate():
    url = 'https://mempool.space/testnet/api/v1/fees/recommended'
    response = requests.get(url)
    response_json = response.json()
    return response_json['fastestFee']

def get_fee():
    return get_fee_rate() * VIRTUAL_SIZE

def get_unspent_txouts(address):
    url = f'https://mempool.space/testnet/api/address/{address}/utxo'
    response = requests.get(url)
    return response.json()

def select_utxos(utxos, amount_to_send, transaction_fee):
    # Sắp xếp UTXOs theo giá trị giảm dần
    sorted_utxos = sorted(utxos, key=lambda x: x['value'], reverse=True)

    selected_utxos = []
    total_value = 0
    for utxo in sorted_utxos:
        selected_utxos.append(utxo)
        total_value += utxo['value']
        # Kiểm tra xem tổng giá trị đã đủ chưa
        if total_value >= amount_to_send + transaction_fee:
            break

    # Tính số tiền thừa
    refund_amount = total_value - amount_to_send - transaction_fee

    return selected_utxos, refund_amount

def create_txins(utxos):
    txins = []
    for utxo in utxos:
        txid = utxo['txid']
        output_index = utxo['vout']
        txin = CMutableTxIn(COutPoint(lx(txid), output_index))
        txins.append(txin)
    return txins

def create_txout(amount, destination_address):
    destination_script = P2SHBitcoinAddress(destination_address).to_scriptPubKey()
    return CMutableTxOut(nValue=amount, scriptPubKey=destination_script)

def create_txout_refund(amount, destination_address):
    destination_script = P2PKHBitcoinAddress(destination_address).to_scriptPubKey()
    return CMutableTxOut(nValue=amount, scriptPubKey=destination_script)

def create_txout_opreturn(data):
    return CMutableTxOut(nValue=0, scriptPubKey=CScript([OP_RETURN, data]))

def create_signed_transaction(txins, txouts, private_key):
    tx = CMutableTransaction(txins, txouts)
    txin_scriptPubKey = CScript([OP_DUP, OP_HASH160, Hash160(private_key.pub), OP_EQUALVERIFY, OP_CHECKSIG])
    sighash = SignatureHash(txin_scriptPubKey, tx, 0, SIGHASH_ALL)
    signature = private_key.sign(sighash) + bytes([SIGHASH_ALL])
    txins[0].scriptSig = CScript([signature, private_key.pub])
    VerifyScript(txins[0].scriptSig, txin_scriptPubKey, tx, 0, (SCRIPT_VERIFY_P2SH,))
    return tx

def broadcast_tx(signed_tx):
    try:
        raw_transaction = signed_tx.serialize().hex()
        print("Raw Transaction: ", raw_transaction)
        url = 'https://mempool.space/testnet/api/tx'
        
        response = requests.post(url, data=raw_transaction)
        if response.status_code == 200:
            print('Transaction successfully broadcasted!')
            print("Transaction ID: ", response.text)
        else:
            print(f"Failed to broadcast transaction: {response.text}")
        if response.text:
            print(response.json())
    except Exception as e:
        print(f"Error broadcasting transaction: {e}")

def main():
    vault_address = "2MvLZyMwcAju7snmtEHHUqVmzK2GmMwKzs1"
    try:
        SelectParams('testnet')

        privatek = input("Enter your private key: ")
        amount_to_send = int(input("Enter the amount to send (in satoshis): "))
        opreturn_data = input("Enter your sidechain address: ")
        destination_address = vault_address

        private_key = CBitcoinSecret(privatek)
        address = P2PKHBitcoinAddress.from_pubkey(private_key.pub)

        # Get fee and unspent txouts
        fee = get_fee()
        utxos = get_unspent_txouts(address)
        selected_utxos, refund_amount = select_utxos(utxos, amount_to_send, fee)

        # Create transaction inputs
        txins = create_txins(selected_utxos)

        # Create transaction outputs
        txout = create_txout(amount_to_send, destination_address)
        change_txout = create_txout_refund(refund_amount, str(address))
        opreturn_txout = create_txout_opreturn(opreturn_data.encode('utf-8'))
        txouts = [txout, change_txout, opreturn_txout]
        
        # Print transaction details
        print('\nYour Address:', address)
        print(f"Amount to send: {amount_to_send} satoshis")
        print(f"Destination address: {destination_address}")
        print(f"Fee: {fee} satoshis")
        confirmation = input("Do you want to proceed with the transaction? (yes/no): ")

        if confirmation.lower() != 'yes':
            print("Transaction cancelled.")
        else:
            tx = create_signed_transaction(txins, txouts, private_key)
            broadcast_tx(tx)

    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
