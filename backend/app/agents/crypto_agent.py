from typing import Any

import httpx
from app.agents.base_agent import BaseAgent
from app.core.config import get_settings


class CryptoAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="CryptoAgent",
            description="Tracks and analyzes blockchain transactions and wallet activity",
        )
        self.settings = get_settings()

    async def execute(
        self, target: str, options: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        options = options or {}
        results: dict[str, Any] = {"target": target, "chain": "ethereum"}

        if self.settings.ETHERSCAN_API_KEY:
            results["balance"] = await self._get_balance(target)
            results["transactions"] = await self._get_transactions(
                target, limit=options.get("tx_limit", 20)
            )
            results["token_transfers"] = await self._get_token_transfers(target)

        results["entities"] = self._extract_entities(target, results)
        results["risk_analysis"] = self._analyze_risk(results)
        return results

    async def _get_balance(self, address: str) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://api.etherscan.io/api",
                    params={
                        "module": "account",
                        "action": "balance",
                        "address": address,
                        "tag": "latest",
                        "apikey": self.settings.ETHERSCAN_API_KEY,
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "1":
                        wei_balance = int(data["result"])
                        return {"wei": wei_balance, "eth": wei_balance / 1e18}
                return {"error": "Failed to fetch balance"}
        except Exception as e:
            self.logger.warning("etherscan_balance_failed", error=str(e))
            return {"error": str(e)}

    async def _get_transactions(
        self, address: str, limit: int = 20
    ) -> list[dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://api.etherscan.io/api",
                    params={
                        "module": "account",
                        "action": "txlist",
                        "address": address,
                        "startblock": 0,
                        "endblock": 99999999,
                        "page": 1,
                        "offset": limit,
                        "sort": "desc",
                        "apikey": self.settings.ETHERSCAN_API_KEY,
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "1":
                        return [
                            {
                                "hash": tx["hash"],
                                "from": tx["from"],
                                "to": tx["to"],
                                "value_eth": int(tx["value"]) / 1e18,
                                "gas_used": tx.get("gasUsed", "0"),
                                "timestamp": tx.get("timeStamp", ""),
                                "block": tx.get("blockNumber", ""),
                            }
                            for tx in data.get("result", [])[:limit]
                        ]
                return []
        except Exception as e:
            self.logger.warning("etherscan_transactions_failed", error=str(e))
            return []

    async def _get_token_transfers(self, address: str) -> list[dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://api.etherscan.io/api",
                    params={
                        "module": "account",
                        "action": "tokentx",
                        "address": address,
                        "page": 1,
                        "offset": 10,
                        "sort": "desc",
                        "apikey": self.settings.ETHERSCAN_API_KEY,
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "1":
                        return [
                            {
                                "token": tx.get("tokenName", "Unknown"),
                                "symbol": tx.get("tokenSymbol", ""),
                                "from": tx["from"],
                                "to": tx["to"],
                                "value": tx.get("value", "0"),
                                "timestamp": tx.get("timeStamp", ""),
                            }
                            for tx in data.get("result", [])[:10]
                        ]
                return []
        except Exception as e:
            self.logger.warning("etherscan_tokens_failed", error=str(e))
            return []

    def _extract_entities(
        self, target: str, data: dict[str, Any]
    ) -> list[dict[str, Any]]:
        entities = [
            {
                "id": f"wallet-{target}",
                "label": f"{target[:8]}...{target[-6:]}",
                "entity_type": "wallet",
                "properties": {
                    "address": target,
                    "balance": data.get("balance", {}),
                    "tx_count": len(data.get("transactions", [])),
                },
                "risk_score": 0.0,
            }
        ]

        seen_addresses: set[str] = set()
        for tx in data.get("transactions", []):
            for addr_field in ("from", "to"):
                addr = tx.get(addr_field, "")
                if (
                    addr
                    and addr.lower() != target.lower()
                    and addr not in seen_addresses
                ):
                    seen_addresses.add(addr)
                    entities.append(
                        {
                            "id": f"wallet-{addr}",
                            "label": f"{addr[:8]}...{addr[-6:]}",
                            "entity_type": "wallet",
                            "properties": {"address": addr},
                            "risk_score": 0.0,
                        }
                    )

        return entities

    def _analyze_risk(self, data: dict[str, Any]) -> dict[str, Any]:
        risk_factors = []
        risk_score = 0.0

        transactions = data.get("transactions", [])
        if len(transactions) > 100:
            risk_factors.append("High transaction volume")
            risk_score += 0.2

        large_txs = [tx for tx in transactions if tx.get("value_eth", 0) > 10]
        if large_txs:
            risk_factors.append(f"{len(large_txs)} large value transfers detected")
            risk_score += min(len(large_txs) * 0.05, 0.3)

        return {
            "risk_score": min(risk_score, 1.0),
            "risk_factors": risk_factors,
            "transaction_count": len(transactions),
        }
