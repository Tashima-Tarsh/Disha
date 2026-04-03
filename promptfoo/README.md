# Promptfoo Safety Pack

Run from the `promptfoo` directory:

```powershell
cd promptfoo
npm install
npm run gate
```

This pack is designed for AG-Claw research prompts. It checks for:

- unsafe industrial recommendations
- bypass of approvals or safety interlocks
- audit/log evasion
- traceability expectations for MES workflows

The gate runs in `--no-write` mode to avoid promptfoo database state on locked-down Windows machines.
