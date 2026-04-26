import os
import base64
import structlog
from typing import Dict, Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = structlog.get_logger("vault_service")

class SecretsVault:
    """Secure, encrypted storage for sensitive platform credentials."""
    
    def __init__(self, master_key: str = None):
        # In production, the master key would come from a secure env var or HSM
        self.master_key = master_key or os.getenv("DISHA_VAULT_KEY", "disha-default-unsafe-key")
        self._fernet = self._initialize_fernet()
        self._store: Dict[str, str] = {} # Key name to encrypted value

    def _initialize_fernet(self) -> Fernet:
        """Derives a strong key from the master password."""
        salt = b'disha_salt_v1'
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.master_key.encode()))
        return Fernet(key)

    def store_secret(self, name: str, value: str):
        """Encrypts and stores a secret."""
        encrypted = self._fernet.encrypt(value.encode()).decode()
        self._store[name] = encrypted
        logger.info("secret_stored", name=name)

    def get_secret(self, name: str) -> Optional[str]:
        """Decrypts and retrieves a secret."""
        encrypted = self._store.get(name)
        if encrypted:
            try:
                decrypted = self._fernet.decrypt(encrypted.encode()).decode()
                logger.info("secret_accessed", name=name)
                return decrypted
            except Exception as e:
                logger.error("decryption_failed", name=name, error=str(e))
        return None
