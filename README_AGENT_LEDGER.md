# AgentActivityLedger (demo)

This small demo shows how to create an immutable, tamper-resistant agent activity ledger.

Run:

```bash
node demo_agent_ledger.js
```

It will generate an RSA keypair locally, register a `PersistentAgentIdentity`, append several activity entries (delegation, negotiation, economic, policy violation, sandbox proposal, cooperation), save the ledger to `agent_ledger.json`, and demonstrate tamper detection by modifying an entry and verifying the chain fails.
