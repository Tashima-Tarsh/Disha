from __future__ import annotations

from models.schemas import Plan


class Planner:
    def refine(self, plan: Plan) -> Plan:
        return plan
