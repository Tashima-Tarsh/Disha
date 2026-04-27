import enum
import structlog
from datetime import datetime
from typing import List, Dict, Any

logger = structlog.get_logger("security_service")

class UserRole(enum.Enum):
    ADMIN = "admin"
    ENGINEER = "engineer"
    SECURITY_OPERATOR = "security_operator"
    VIEWER = "viewer"

class Permission(enum.Enum):
    READ_CODE = "read_code"
    WRITE_CODE = "write_code"
    EXECUTE_AGENTS = "execute_agents"
    DEPLOY_SYSTEM = "deploy_system"
    MANAGE_SECRETS = "manage_secrets"

# Role-Permission Mapping
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [p for p in Permission],
    UserRole.ENGINEER: [Permission.READ_CODE, Permission.WRITE_CODE, Permission.EXECUTE_AGENTS],
    UserRole.SECURITY_OPERATOR: [Permission.READ_CODE, Permission.EXECUTE_AGENTS, Permission.MANAGE_SECRETS],
    UserRole.VIEWER: [Permission.READ_CODE]
}

class SecurityService:
    """Enterprise-grade security management for DISHA OS."""
    
    def __init__(self) -> None:
        self.audit_log: List[Dict[str, Any]] = []

    def log_event(self, user_id: str, action: str, resource: str, status: str) -> None:
        """Logs a security audit event."""
        event = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "action": action,
            "resource": resource,
            "status": status
        }
        self.audit_log.append(event)
        logger.info("audit_log_entry", **event)

    def authorize(self, user_role: UserRole, required_permission: Permission) -> bool:
        """Verifies if a role has the required permission."""
        permissions = ROLE_PERMISSIONS.get(user_role, [])
        is_authorized = required_permission in permissions
        
        status = "authorized" if is_authorized else "denied"
        logger.info("authorization_check", role=user_role.value, permission=required_permission.value, status=status)
        return is_authorized

    def mask_secret(self, secret: str) -> str:
        """Utility to mask sensitive data in logs."""
        if len(secret) <= 8:
            return "****"
        return f"{secret[:4]}****{secret[-4:]}"
