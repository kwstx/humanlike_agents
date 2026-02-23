import fs from 'node:fs';
import path from 'node:path';
import PersistentAgentIdentity from './models/PersistentAgentIdentity.js';
import { CURRENT_IDENTITY_SCHEMA_VERSION } from './models/IdentitySchemaVersion.js';

class AgentIdentityRegistry {
    constructor(options = {}) {
        this.storePath = options.storePath || path.resolve(process.cwd(), 'agent_identities.json');
        this._loadStore();
    }

    _loadStore() {
        if (fs.existsSync(this.storePath)) {
            try {
                const raw = fs.readFileSync(this.storePath, 'utf8');
                this.store = JSON.parse(raw);
            } catch (e) {
                this.store = { identities: {}, meta: { schemaVersion: CURRENT_IDENTITY_SCHEMA_VERSION }, lastActionTimestamps: {} };
            }
        } else {
            this.store = { identities: {}, meta: { schemaVersion: CURRENT_IDENTITY_SCHEMA_VERSION }, lastActionTimestamps: {} };
        }
    }

    _saveStore() {
        fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), 'utf8');
    }

    listIdentityIds() {
        return Object.keys(this.store.identities);
    }

    hasPublicKey(publicKey) {
        return Object.values(this.store.identities).some(i => i.publicKey === publicKey);
    }

    registerIdentity({ publicKey, originSystem, id = null, metadata = null, performance = null, force = false }) {
        if (!publicKey || !originSystem) {
            throw new Error('publicKey and originSystem are required to register an identity.');
        }

        // Prevent reuse of same key in a different origin unless force is true
        const existing = Object.values(this.store.identities).find(i => i.publicKey === publicKey);
        if (existing && existing.originSystem !== originSystem && !force) {
            throw new Error(`Public key already registered on origin '${existing.originSystem}'. Use 'force' to override.`);
        }

        const identity = new PersistentAgentIdentity({ publicKey, originSystem, id, metadata, performance });

        this.store.identities[identity.id] = {
            id: identity.id,
            publicKey: identity.publicKey,
            originSystem: identity.originSystem,
            metadata: identity.metadata,
            performance: identity.performance,
            revoked: false,
            schemaVersion: CURRENT_IDENTITY_SCHEMA_VERSION
        };

        this._saveStore();
        return identity;
    }

    getRaw(id) {
        return this.store.identities[id] || null;
    }

    getIdentityById(id) {
        const raw = this.getRaw(id);
        if (!raw) return null;
        return new PersistentAgentIdentity({ publicKey: raw.publicKey, originSystem: raw.originSystem, id: raw.id, metadata: raw.metadata, performance: raw.performance });
    }

    getIdentityByPublicKey(publicKey) {
        const raw = Object.values(this.store.identities).find(i => i.publicKey === publicKey);
        if (!raw) return null;
        return this.getIdentityById(raw.id);
    }

    revokeIdentity(id, reason = 'REVOKED') {
        const raw = this.getRaw(id);
        if (!raw) throw new Error('Identity not found');
        raw.revoked = true;
        raw.revocationReason = reason;
        raw.revocationTimestamp = new Date().toISOString();
        this._saveStore();
        return true;
    }

    isRevoked(id) {
        const raw = this.getRaw(id);
        return raw ? !!raw.revoked : false;
    }

    /**
     * Validate a signed action. Options may include `timestamp` or `nonce` to enable replay protection.
     * - `agentId` or `publicKey` must identify the actor
     * - `message` and `signature` are required
     * - if `originSystem` provided, must match the identity's originSystem
     */
    validateAction({ agentId = null, publicKey = null, message, signature, timestamp = null, originSystem = null }) {
        if (!message || !signature) throw new Error('message and signature are required');

        const identity = agentId ? this.getIdentityById(agentId) : (publicKey ? this.getIdentityByPublicKey(publicKey) : null);
        if (!identity) return { valid: false, reason: 'IDENTITY_NOT_FOUND' };

        const raw = this.getRaw(identity.id);
        if (raw.revoked) return { valid: false, reason: 'IDENTITY_REVOKED' };

        if (originSystem && identity.originSystem !== originSystem) return { valid: false, reason: 'ORIGIN_MISMATCH' };

        // Optional replay prevention: require strictly increasing timestamp
        if (timestamp) {
            const prev = this.store.lastActionTimestamps[identity.id] || null;
            const ts = new Date(timestamp).getTime();
            if (isNaN(ts)) return { valid: false, reason: 'INVALID_TIMESTAMP' };
            if (prev && ts <= prev) return { valid: false, reason: 'REPLAY_DETECTED' };
            // will update after successful signature verification
        }

        const sigOk = identity.verifySignature(message, signature);
        if (!sigOk) return { valid: false, reason: 'INVALID_SIGNATURE' };

        if (timestamp) this.store.lastActionTimestamps[identity.id] = new Date(timestamp).getTime();
        this._saveStore();

        return { valid: true, identity: identity.toObject() };
    }

    /**
     * Migrate a stored identity object using a migration function that accepts and returns a plain object.
     * It will bump the identity's metadata.identityVersion and record the migration in versionHistory.
     */
    migrateIdentity(id, migrationFn, details = 'SCHEMA_MIGRATION') {
        const raw = this.getRaw(id);
        if (!raw) throw new Error('Identity not found');

        const before = JSON.parse(JSON.stringify(raw));
        const migrated = migrationFn(before);

        const newVersion = migrated.metadata && migrated.metadata.identityVersion ? migrated.metadata.identityVersion : (before.metadata.identityVersion || '1.0.0');

        // Create a new PersistentAgentIdentity to ensure invariants and version history update
        const identity = new PersistentAgentIdentity({ publicKey: migrated.publicKey || before.publicKey, originSystem: migrated.originSystem || before.originSystem, id: before.id, metadata: migrated.metadata || before.metadata, performance: migrated.performance || before.performance });

        // Overwrite stored record
        this.store.identities[id] = {
            id: identity.id,
            publicKey: identity.publicKey,
            originSystem: identity.originSystem,
            metadata: identity.metadata,
            performance: identity.performance,
            revoked: before.revoked || false,
            schemaVersion: CURRENT_IDENTITY_SCHEMA_VERSION
        };

        this._saveStore();
        return identity;
    }
}

export default AgentIdentityRegistry;
