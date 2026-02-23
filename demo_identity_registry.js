import crypto from 'node:crypto';
import AgentIdentityRegistry from './src/identity/AgentIdentityRegistry.js';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const registry = new AgentIdentityRegistry({ storePath: './test_agent_identities.json' });

console.log('Registering identity...');
const identity = registry.registerIdentity({ publicKey, originSystem: 'demo-environment' });
console.log('Registered id:', identity.id);

const message = JSON.stringify({ action: 'allocate', amount: 100, timestamp: new Date().toISOString() });
const signature = crypto.sign('sha256', Buffer.from(message), { key: privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING }).toString('hex');

console.log('\nValidating action (should pass):');
console.log(registry.validateAction({ agentId: identity.id, message, signature, timestamp: JSON.parse(message).timestamp, originSystem: 'demo-environment' }));

console.log('\nValidating same action again (replay should be detected):');
console.log(registry.validateAction({ agentId: identity.id, message, signature, timestamp: JSON.parse(message).timestamp, originSystem: 'demo-environment' }));

console.log('\nRevoking identity and validating (should fail):');
registry.revokeIdentity(identity.id, 'DEMO_REVOCATION');
console.log(registry.validateAction({ agentId: identity.id, message, signature, timestamp: new Date().toISOString(), originSystem: 'demo-environment' }));

console.log('\nDemonstrating schema migration (no-op migration that bumps version):');
const migrated = registry.migrateIdentity(identity.id, raw => {
    const now = new Date().toISOString();
    raw.metadata = raw.metadata || {};
    raw.metadata.identityVersion = (raw.metadata.identityVersion || '1.0.0').split('.').map((p,i)=> i===2 ? String(Number(p)+1) : p).join('.');
    raw.metadata.versionHistory = (raw.metadata.versionHistory || []).concat([{ version: raw.metadata.identityVersion, timestamp: now, action: 'MIGRATED', details: 'Demo migration' }]);
    return raw;
});
console.log('Migrated version:', migrated.metadata.identityVersion);

console.log('\nDemo complete — store written to ./test_agent_identities.json');
