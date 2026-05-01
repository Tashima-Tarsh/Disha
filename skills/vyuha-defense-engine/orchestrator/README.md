# Orchestrator

Responsible for:
- taking a selected formation and converting it into an executable **defensive plan**
- enforcing policy allowlists (No First Use + allowed defensive actions)
- executing actions via DISHA OS control surfaces (firewall/isolation/quarantine/revocation)
- emitting audit + evidence tasks with request IDs

Non-negotiable constraints:
- defensive-only actions
- explicit reasons
- timeouts for every action
- graceful fallback on failure

