import structlog
from pydantic import BaseModel

logger = structlog.get_logger("tenant_manager")


class Tenant(BaseModel):
    id: str
    name: str
    tier: str = "free"  # free, pro, enterprise
    quota_ai_tokens: int = 100000
    used_ai_tokens: int = 0
    is_active: bool = True


class TenantManager:
    """Manages multi-tenancy and resource quotas for DISHA OS."""

    def __init__(self):
        self.tenants: dict[str, Tenant] = {}

    def create_tenant(self, tenant_id: str, name: str, tier: str = "free"):
        tenant = Tenant(id=tenant_id, name=name, tier=tier)
        self.tenants[tenant_id] = tenant
        logger.info("tenant_created", id=tenant_id, name=name, tier=tier)
        return tenant

    def get_tenant(self, tenant_id: str) -> Tenant | None:
        return self.tenants.get(tenant_id)

    def record_usage(self, tenant_id: str, tokens: int):
        """Records token usage and checks for quota violations (Cost Optimization)."""
        tenant = self.get_tenant(tenant_id)
        if tenant:
            tenant.used_ai_tokens += tokens
            if tenant.used_ai_tokens > tenant.quota_ai_tokens:
                logger.warning(
                    "quota_exceeded", tenant=tenant_id, used=tenant.used_ai_tokens
                )
                return False
            logger.info(
                "usage_recorded",
                tenant=tenant_id,
                tokens=tokens,
                total=tenant.used_ai_tokens,
            )
            return True
        return False

    def check_feature_access(self, tenant_id: str, feature_id: str) -> bool:
        """Enforces tier-based access to elite features (Monetization)."""
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return False

        # Elite features reserved for Pro/Enterprise
        elite_features = ["agent_collaboration", "cross_repo_rag", "audit_logs"]

        if feature_id in elite_features and tenant.tier == "free":
            logger.warning(
                "access_denied_feature_locked", tenant=tenant_id, feature=feature_id
            )
            return False

        logger.info("feature_access_granted", tenant=tenant_id, feature=feature_id)
        return True
