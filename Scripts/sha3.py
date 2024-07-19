from Crypto.Hash import keccak 

# Convert hex string to bytes
hex_string = "a91421eb2398b15b72b1b863d22c6c5fb9c75e94e92787"
data = bytes.fromhex(hex_string)

k = keccak.new(digest_bits=256)
k.update(data)
print(k.hexdigest())