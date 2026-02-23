import AgentIdentityRegistry from './src/identity/AgentIdentityRegistry.js';
import { CURRENT_IDENTITY_SCHEMA_VERSION } from './src/identity/models/IdentitySchemaVersion.js';
import fs from 'node:fs';
import path from 'node:path';

const testStorePath = './migration_test_store.json';

// Create a v1 store manually
const v1Store = {
    identities: {
        "did:agent:old": {
            id: "did:agent:old",
            publicKey: "pubkey-v1",
            originSystem: "old-sys",
            metadata: { identityVersion: "1.0.0", creationTimestamp: "2025-01-01T00:00:00Z" }
            // Missing schemaVersion and performance in v1 (hypothetically)
        }
    },
    meta: { schemaVersion: 1 },
    lastActionTimestamps: {}
};

fs.writeFileSync(testStorePath, JSON.stringify(v1Store, null, 2));

console.log("--- Testing Automated Migration ---");
const registry = new AgentIdentityRegistry({
    storePath: testStorePath,
    migrations: {
        2: (store) => {
            console.log("  Running Migration to V2...");
            // Example: Add default performance object if missing
            Object.values(store.identities).forEach(id => {
                if (!id.performance) {
                    id.performance = { trustScore: 0.5 };
                }
            });
            return store;
        }
    }
});

console.log("Registry Schema Version after load:", registry.store.meta.schemaVersion);
const entry = registry.getRaw("did:agent:old");
console.log("Migrated Entry Schema Version:", entry.schemaVersion);
console.log("Migrated Entry Performance:", entry.performance);

fs.unlinkSync(testStorePath);
process.exit(0);
