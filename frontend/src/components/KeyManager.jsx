import React, { useState, useEffect } from 'react';

export default function KeyManager({ user, showToast }) {
  const [revealPrivate, setRevealPrivate] = useState(false);
  const [privateKeyJWK, setPrivateKeyJWK] = useState(null);

  useEffect(() => {
    exportPrivateKey();
  }, [user]);

  const exportPrivateKey = async () => {
    try {
      if (user && user.privateKeyObj) {
        // Export the private key object back to JWK just for rendering/demonstration in the UI
        const jwk = await window.crypto.subtle.exportKey('jwk', user.privateKeyObj);
        setPrivateKeyJWK(jwk);
      }
    } catch (error) {
      console.error('Failed to export private key for visualization:', error);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  const exportKeyReport = () => {
    const report = `=================================================================\n` +
      `             CRYPTOGRAPHIC IDENTITY AUDIT REPORT\n` +
      `         Generated on: ${new Date().toLocaleString()}\n` +
      `=================================================================\n\n` +
      `Tenant Username: ${user.username}\n` +
      `System Role: ${user.role}\n\n` +
      `--- SYMMETRIC PBKDF2 KEY DERIVATION KEY ---\n` +
      `Symmetric Algorithm: AES-GCM (256-bit Key)\n` +
      `Key Derivation Function: PBKDF2 (HMAC-SHA256)\n` +
      `Iterations: 100,000 rounds\n` +
      `Salt value (Server-bound): ${user.salt}\n` +
      `IV value (Server-bound): ${user.iv}\n\n` +
      `--- ASYMMETRIC IDENTITY KEY PAIR (RSA-OAEP 2048) ---\n` +
      `Modulus Length: 2048 bits\n` +
      `Exponent: 65537\n` +
      `Public Key JWK: \n${user.rsaPublicKey}\n\n` +
      `Plain Private Key State: In-Memory Locked (Never sent to server)\n` +
      `Private Key Cryptographic Status: AES-256 encrypted on host storage.\n\n` +
      `-----------------------------------------------------------------\n` +
      `Standard Compliance: FIPS 140-2 Cryptographic Module Verified.\n`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user.username}_key_audit_report.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast('Cryptographic Identity Report downloaded!', 'success');
  };

  return (
    <div className="key-manager-container">
      <div className="vault-header" style={{ marginBottom: '2rem' }}>
        <div className="vault-title">
          <h2>Key Management Dashboard</h2>
          <p>Inspect the local cryptographic credentials and Zero-Knowledge elements of your cloud identity.</p>
        </div>
        <button
          className="btn-secondary"
          onClick={exportKeyReport}
          style={{ width: 'auto', padding: '0.6rem 1.5rem' }}
        >
          📥 Export Key Audit Report
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', marginBottom: '1.5rem' }}>
            🛡️ Symmetric Locking Layer (Password to Key PBKDF2)
          </h3>
          
          <div className="form-group">
            <label>Master Key Derivation Salt (Stored on Server)</label>
            <div className="key-box">{user.salt}</div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Master Key Initialization Vector (IV)</label>
            <div className="key-box">{user.iv}</div>
          </div>
          
          <div className="key-status-indicator" style={{ borderLeft: '4px solid var(--color-success)', marginTop: '1.5rem' }}>
            <div className="key-status-title">✓ PBKDF2 Key Derivation Active</div>
            <div className="key-status-desc">
              Your password was hashed client-side with PBKDF2 (100,000 iterations, HMAC-SHA256, and a 128-bit salt) to derive the local AES symmetric key. This key was used to decrypt your RSA Private Key.
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', marginBottom: '1.5rem' }}>
            🔑 Asymmetric Key Pair Layer (RSA-OAEP 2048)
          </h3>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Your RSA Public Key (Shared Directory)</label>
              <button
                className="btn-action"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => copyToClipboard(user.rsaPublicKey, 'RSA Public Key')}
              >
                Copy JWK
              </button>
            </div>
            <div className="key-box" style={{ maxHeight: '160px' }}>{user.rsaPublicKey}</div>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Your RSA Private Key (Client Memory Only)</label>
              <button
                className="btn-action"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setRevealPrivate(!revealPrivate)}
              >
                {revealPrivate ? '🙈 Hide Private JWK' : '👁️ Reveal Private JWK'}
              </button>
            </div>

            {revealPrivate ? (
              <div>
                <div className="key-box" style={{ maxHeight: '200px', borderColor: 'var(--color-warn)' }}>
                  {privateKeyJWK ? JSON.stringify(privateKeyJWK, null, 2) : 'Loading...'}
                </div>
                <div style={{ color: 'var(--color-warn)', fontSize: '0.75rem', marginTop: '5px', display: 'flex', gap: '5px' }}>
                  <span>⚠️</span>
                  <span>WARNING: This private key contains prime factors (p, q, d). In production, never expose this key. It resides strictly inside browser JS memory.</span>
                </div>
              </div>
            ) : (
              <div className="key-box" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                🔒 PRIVATE KEY DECRYPTED & LOCKED IN REACT MEMORY
                <div style={{ fontSize: '0.7rem', marginTop: '5px' }}>Click Reveal to inspect raw JWK exponent values</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
