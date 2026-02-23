import crypto from 'node:crypto';
import fs from 'node:fs';

/**
 * AgentActivityLedger
 *
 * An immutable, tamper-resistant ledger of agent actions. Each entry is
 * cryptographically chained (prevHash) and signed by the agent's private key.
 * The ledger supports verification of the full chain and individual signatures.
 */
class AgentActivityLedger {
    constructor(registry = null) {
        this.entries = [];
        this.registry = registry; // optional AgentIdentityRegistry to validate identities/signatures
    }

    /**
     * Create a canonical representation of an entry for hashing/signing.
     */
    static _serializeEntryForHash(entry) {
        // Ensure deterministic ordering
        const copy = {
            index: entry.index,
            timestamp: entry.timestamp,
            agentId: entry.agentId,
            actionType: entry.actionType,
            details: entry.details,
            prevHash: entry.prevHash || null
        };
        return JSON.stringify(copy);
    }

    static _hash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Add a new ledger entry. The caller must provide the agent's public key
     * and the private key used to sign this entry. The ledger will compute
     * chain hashes and attach the signature and publicKey for later verification.
     *
     * @param {Object} params
     * @param {string} params.agentId - Persistent agent identifier
     * @param {string} params.publicKey - Agent public key (PEM)
     * @param {string} params.privateKey - Agent private key (PEM) used for signing
     * @param {string} params.actionType - One of: DELEGATION, NEGOTIATION, ECONOMIC, POLICY_VIOLATION, SANDBOX_PROPOSAL, COOPERATION
     * @param {Object} params.details - Structured details about the action
     */
    addEntry({ agentId, publicKey, privateKey, actionType, details = {}, signature = null, originSystem = null }) {
        if (!agentId || !actionType) {
            throw new Error('agentId and actionType are required');
        }

        const index = this.entries.length;
        const timestamp = new Date().toISOString();
        const prevHash = index === 0 ? null : this.entries[index - 1].hash;

        const entry = {
            index,
            timestamp,
            agentId,
            actionType,
            details,
            prevHash,
            hash: null,
            signature: null,
            publicKey
        };

        const serialized = AgentActivityLedger._serializeEntryForHash(entry);
        const entryHash = AgentActivityLedger._hash(serialized);
        entry.hash = entryHash;

        // If a signature was provided, prefer validating it through the registry if available.
        if (signature) {
            // If registry is present, validate the signed action (replay protection, revocation, origin checks)
            if (this.registry) {
                const res = this.registry.validateAction({ agentId, publicKey, message: entryHash, signature, timestamp: timestamp, originSystem });
                if (!res.valid) throw new Error(`Signature validation failed: ${res.reason}`);
            } else {
                // Local verification without registry
                const verified = crypto.verify(
                    'sha256',
                    Buffer.from(entryHash),
                    {
                        key: publicKey,
                        padding: crypto.constants.RSA_PKCS1_PSS_PADDING
                    },
                    Buffer.from(signature, 'hex')
                );
                if (!verified) throw new Error('Invalid signature provided');
            }
            entry.signature = signature;
        } else {
            // No signature provided: if privateKey is present, sign locally.
            if (!privateKey) {
                throw new Error('Either signature or privateKey must be provided to add an entry');
            }

            const sig = crypto.sign('sha256', Buffer.from(entryHash), { key: privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING });
            const sigHex = sig.toString('hex');

            // If registry is available, ensure identity exists and validate the signed action
            if (this.registry) {
                // Register identity if absent (bind publicKey -> originSystem)
                try {
                    const existing = this.registry.getRaw(agentId);
                    if (!existing) {
                        // Try to register; if registration fails, bubble up
                        this.registry.registerIdentity({ publicKey, originSystem: originSystem || 'unknown', id: agentId });
                    }
                } catch (err) {
                    throw new Error(`Identity registration failed: ${err.message}`);
                }

                const res = this.registry.validateAction({ agentId, publicKey, message: entryHash, signature: sigHex, timestamp: timestamp, originSystem });
                if (!res.valid) throw new Error(`Signature validation failed: ${res.reason}`);
            }

            entry.signature = sigHex;
        }

        // Freeze the entry to prevent in-memory mutation
        Object.freeze(entry);

        // Append to chain by creating a new entries array (ledger instance is immutable-like)
        const newEntries = this.entries.concat([entry]);
        // Replace internal entries reference (note: constructor froze `this`, but entries array is mutable reference)
        // We deliberately keep a mutable replacement to preserve API simplicity while entries themselves are frozen.
        this.entries = newEntries;

        return entry;
    }

    getEntries() {
        return this.entries.slice();
    }

    /**
     * Verify the signature of a single entry.
     */
    static verifyEntrySignature(entry) {
        try {
            const serialized = AgentActivityLedger._serializeEntryForHash(entry);
            const expectedHash = AgentActivityLedger._hash(serialized);
            if (expectedHash !== entry.hash) return { valid: false, reason: 'HASH_MISMATCH' };

            const verified = crypto.verify(
                'sha256',
                Buffer.from(entry.hash),
                {
                    key: entry.publicKey,
                    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
                },
                Buffer.from(entry.signature, 'hex')
            );

            return { valid: !!verified };
        } catch (err) {
            return { valid: false, reason: err.message };
        }
    }

    /**
     * Verify the entire chain: hashes link up and signatures validate.
     */
    verifyChain() {
        if (!this.entries || this.entries.length === 0) return { valid: true, reason: 'EMPTY' };

        for (let i = 0; i < this.entries.length; i++) {
            const e = this.entries[i];

            // Verify hash of entry
            const serialized = AgentActivityLedger._serializeEntryForHash(e);
            const expectedHash = AgentActivityLedger._hash(serialized);
            if (expectedHash !== e.hash) return { valid: false, index: i, reason: 'HASH_MISMATCH' };

            // Verify prevHash linkage
            if (i === 0) {
                if (e.prevHash !== null) return { valid: false, index: i, reason: 'GENESIS_PREVHASH_NOT_NULL' };
            } else {
                if (e.prevHash !== this.entries[i - 1].hash) return { valid: false, index: i, reason: 'CHAIN_LINK_BROKEN' };
            }

            // Verify signature
            const sig = AgentActivityLedger.verifyEntrySignature(e);
            if (!sig.valid) return { valid: false, index: i, reason: sig.reason || 'INVALID_SIGNATURE' };
        }

        return { valid: true };
    }

    toJSON() {
        return {
            createdAt: new Date().toISOString(),
            entries: this.entries
        };
    }

    saveToFile(path) {
        const payload = JSON.stringify(this.toJSON(), null, 2);
        fs.writeFileSync(path, payload, { encoding: 'utf8' });
        return path;
    }

    static loadFromFile(path, registry = null) {
        const raw = fs.readFileSync(path, { encoding: 'utf8' });
        const parsed = JSON.parse(raw);
        const ledger = new AgentActivityLedger(registry);
        ledger.entries = (parsed.entries || []).map(e => Object.freeze(e));
        return ledger;
    }
}

export default AgentActivityLedger;
