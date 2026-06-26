from __future__ import annotations

import json

from .ledger import AuditLedger


def export_ledger_json(ledger: AuditLedger) -> str:
    return json.dumps(ledger.export(), indent=2, sort_keys=True)

