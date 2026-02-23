import crypto from 'node:crypto';

/**
 * PersistentAgentIdentity
 * 
 * Represents a globally unique, cryptographically verifiable identifier for an autonomous agent.
 * Designed to be persistent across sessions, deployments, and orchestration layers.
 */
class PersistentAgentIdentity {
    /**
     * @param {Object} config
     * @param {string} config.publicKey - The agent's cryptographic public key (PEM or hex format).
     * @param {string} config.originSystem - The identifier of the system/platform where the identity was first created.
     * @param {string} [config.id] - Override ID (only for loading existing identities).
     * @param {Object} [config.metadata] - Optional existing metadata for reconstruction.
     */
    constructor({ publicKey, originSystem, id = null, metadata = null }) {
        if (!publicKey) {
            throw new Error("Cryptographic public key is mandatory for PersistentAgentIdentity.");
        }
        if (!originSystem) {
            throw new Error("Origin system must be specified for traceability.");
        }

        // Assign globally unique ID (using SHA-256 hash of the public key for cryptographic linkage)
        this.id = id || `did:agent:${this._generateKeyFingerprint(publicKey)}`;

        this.publicKey = publicKey;
        this.originSystem = originSystem;

        // Immutable Metadata
        if (metadata) {
            this.metadata = metadata;
        } else {
            const timestamp = new Date().toISOString();
            this.metadata = {
                creationTimestamp: timestamp,
                identityVersion: "1.0.0",
                versionHistory: [
                    {
                        version: "1.0.0",
                        timestamp: timestamp,
                        action: "IDENTITY_INITIALIZED",
                        details: `Identity created on ${originSystem}`
                    }
                ]
            };
        }

        // Freeze instances logic to enforce immutability of core identity properties
        Object.freeze(this.metadata);
        Object.freeze(this.metadata.versionHistory);
    }

    /**
     * Generates a unique fingerprint for the public key.
     * @param {string} publicKey 
     * @returns {string} hex hash
     * @private
     */
    _generateKeyFingerprint(publicKey) {
        return crypto.createHash('sha256').update(publicKey).digest('hex');
    }

    /**
     * Logs a version change (e.g., key rotation or system migration).
     * This returns a NEW instance to maintain immutability patterns if desired, 
     * or updates the internal history if used as a mutable record.
     * 
     * For this model, we'll implement a 'cloneWithUpdate' pattern.
     */
    upgrade(action, details, newVersion = null) {
        const nextVersion = newVersion || this._incrementVersion(this.metadata.identityVersion);
        const newHistory = [
            ...this.metadata.versionHistory,
            {
                version: nextVersion,
                timestamp: new Date().toISOString(),
                action: action,
                details: details
            }
        ];

        return new PersistentAgentIdentity({
            id: this.id,
            publicKey: this.publicKey,
            originSystem: this.originSystem,
            metadata: {
                ...this.metadata,
                identityVersion: nextVersion,
                versionHistory: newHistory
            }
        });
    }

    _incrementVersion(version) {
        const parts = version.split('.');
        parts[2] = parseInt(parts[2]) + 1;
        return parts.join('.');
    }

    /**
     * Export the identity to a plain object for persistence or transmission.
     */
    toObject() {
        return {
            id: this.id,
            publicKey: this.publicKey,
            originSystem: this.originSystem,
            metadata: this.metadata
        };
    }

    /**
     * Cryptographically verify if a message was signed by this identity's public key.
     * @param {Buffer|string} message 
     * @param {string} signature - hex or base64 signature
     * @returns {boolean}
     */
    verifySignature(message, signature) {
        try {
            return crypto.verify(
                "sha256",
                Buffer.from(message),
                {
                    key: this.publicKey,
                    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                },
                Buffer.from(signature, 'hex')
            );
        } catch (error) {
            console.error("Signature verification failed:", error.message);
            return false;
        }
    }
}

export default PersistentAgentIdentity;
