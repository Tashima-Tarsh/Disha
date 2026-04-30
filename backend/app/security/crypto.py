from passlib.context import CryptContext  # type: ignore
from Crypto.Cipher import AES  # type: ignore
from Crypto.Util import Counter  # type: ignore
import os
import base64

# Password Hashing using Argon2id
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


class CryptoEngine:
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def encrypt_data(data: str, secret_key: str) -> str:
        """AES-256 CTR mode encryption"""
        key = secret_key.encode('utf-8')[:32].ljust(32, b'\0')
        nonce = os.urandom(8)
        ctr = Counter.new(64, prefix=nonce)
        cipher = AES.new(key, AES.MODE_CTR, counter=ctr)
        encrypted_bytes = cipher.encrypt(data.encode('utf-8'))
        return base64.b64encode(nonce + encrypted_bytes).decode('utf-8')

    @staticmethod
    def decrypt_data(encrypted_data: str, secret_key: str) -> str:
        """AES-256 CTR mode decryption"""
        key = secret_key.encode('utf-8')[:32].ljust(32, b'\0')
        raw_data = base64.b64decode(encrypted_data)
        nonce = raw_data[:8]
        encrypted_bytes = raw_data[8:]
        ctr = Counter.new(64, prefix=nonce)
        cipher = AES.new(key, AES.MODE_CTR, counter=ctr)
        return cipher.decrypt(encrypted_bytes).decode('utf-8')
