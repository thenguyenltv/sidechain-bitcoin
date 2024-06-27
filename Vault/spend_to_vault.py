from bitcoin.wallet import CBitcoinSecret, P2PKHBitcoinAddress, P2SHBitcoinAddress
from bitcoin.core import CMutableTxOut, CMutableTxIn, COutPoint, lx, CMutableTransaction, Hash160
from bitcoin.core.script import OP_DUP, OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG, OP_RETURN
from bitcoin.core.script import CScript, SignatureHash, SIGHASH_ALL
from bitcoin.core.scripteval import VerifyScript, SCRIPT_VERIFY_P2SH
from bitcoin import SelectParams
import requests
import sys

def get_value(txid, output_index):
    url = f'https://mempool.space/testnet/api/tx/{txid}'
    response = requests.get(url)
    response_json = response.json()
    return response_json['vout'][output_index]['value']

def create_txin(txid, output_index):
    return CMutableTxIn(COutPoint(lx(txid), output_index))

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
        url = 'https://blockstream.info/testnet/api/tx'
        
        response = requests.post(url, data=raw_transaction)
        if response.status_code == 200:
            print('Transaction successfully broadcasted!')
        else:
            print(f"Failed to broadcast transaction: {response.text}")
        print(response.json())
    except Exception as e:
        print(f"Error broadcasting transaction: {e}")

def main():
    vault_address = "2MvLZyMwcAju7snmtEHHUqVmzK2GmMwKzs1"
    try:
        SelectParams('testnet')

        privatek = input("Enter your private key: ")
        txid = input("Enter your txid of the UTXO: ")
        output_index = int(input("Enter your output index of the UTXO: "))
        amount_to_send = int(input("Enter the amount to send (in satoshis): "))
        opreturn_data = input("Enter the OP_RETURN data: ")
        destination_address = vault_address

        private_key = CBitcoinSecret(privatek)
        address = P2PKHBitcoinAddress.from_pubkey(private_key.pub)
        print('Sender Address:', address)

        txin = create_txin(txid, output_index)
        txout = create_txout(amount_to_send, destination_address)

        fee = 333
        change_amount = get_value(txid, output_index) - amount_to_send -fee
        change_address = str(address)
        change_txout = create_txout_refund(change_amount, change_address)


        opreturn_txout = create_txout_opreturn(opreturn_data.encode('utf-8'))

        tx = create_signed_transaction([txin], [txout, change_txout, opreturn_txout], private_key)

        broadcast_tx(tx)
    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
