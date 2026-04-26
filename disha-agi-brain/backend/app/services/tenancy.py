import structlog
from typing import Dict, Any, Optional
from pydantic import BaseModel

logger = structlog.get_logger("tenant_manager")

class Tenant(BaseModel):
    id: str
    name: str
    tier: str = "free" # free, pro, enterprise
    quota_ai_tokens: int = 100000
    used_ai_tokens: int = 0
    is_active: bool = True

class TenantManager:
    """Manages multi-tenancy and resource quotas for DISHA OS."""
    
    def __init__(self):
        self.tenants: Dict[str, Tenant] = {}

    def create_tenant(self, tenant_id: str, name: str, tier: str = "free"):
        tenant = Tenant(id=tenant_id, name=name, tier=tier)
        self.tenants[tenant_id] = tenant
        logger.info("tenant_created", id=tenant_id, name=name, tier=tier)
        return tenant

    def get_tenant(self, tenant_id: str) -> Optional[Tenant]:
        return self.tenants.get(tenant_id)

    def record_usage(self, tenant_id: str, tokens: int):
        """Records token usage and checks for quota violations (Cost Optimization)."""
        tenant = self.get_tenant(tenant_id)
        if tenant:
            tenant.used_ai_tokens += tokens
            if tenant.used_ai_tokens > tenant.quota_ai_tokens:
                logger.warning("quota_exceeded", tenant=tenant_id, used=tenant.used_ai_tokens)
                return False
            logger.info("usage_recorded", tenant=tenant_id, tokens=tokens, total=tenant.used_ai_tokens)
            return True
        return False
