import React, { useState } from 'react';
import {
  generateRSAKeyPair,
  encryptPrivateKey,
  decryptPrivateKey
} from '../cryptoHelper';

export default function Login({ onLoginSuccess, API_URL }) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [cryptoStatus, setCryptoStatus] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      // 1. Generate RSA Key Pair
      setCryptoStatus('🔑 Generating RSA-OAEP 2048-bit Keypair (In-Browser)...');
      const { publicKeyJWK, privateKeyJWK } = await generateRSAKeyPair();

      // 2. Encrypt Private Key with PBKDF2 Derived Key
      setCryptoStatus('🔒 Deriving PBKDF2 key & encrypting RSA Private Key locally...');
      const { encryptedPrivateKeyHex, saltHex, ivHex } = await encryptPrivateKey(
        privateKeyJWK,
        password
      );

      setCryptoStatus('📤 Registering tenant and storing encrypted keys on server...');
      
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password, // Passed for backend verification hash (bcrypt)
          rsaPublicKey: JSON.stringify(publicKeyJWK),
          encryptedPrivateKey: encryptedPrivateKeyHex,
          salt: saltHex,
          iv: ivHex
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');

      setCryptoStatus('✅ Registration Successful!');
      setTimeout(() => {
        setIsLoginTab(true);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setCryptoStatus('');
        setLoading(false);
      }, 1500);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed.');
      setCryptoStatus('');
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setCryptoStatus('🔐 Authenticating credentials with server...');

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      const { token, user } = data;

      // Zero-Knowledge: Decrypt the user's private RSA key using the user's password locally
      setCryptoStatus('🔓 Decrypting RSA Private Key locally in browser memory...');
      
      const privateKeyObj = await decryptPrivateKey(
        user.encryptedPrivateKey,
        password,
        user.salt,
        user.iv
      );

      setCryptoStatus('✅ Decryption successful. Session active!');
      
      setTimeout(() => {
        onLoginSuccess(token, {
          ...user,
          privateKeyObj // Saved strictly in memory, never leaves browser
        });
      }, 1000);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Login failed. Check your password.');
      setCryptoStatus('');
      setLoading(false);
    }
  };

  const triggerAutoDemo = async (demoUser) => {
    setError('');
    setLoading(true);
    const demoPassword = demoUser === 'alice' ? 'alice123' : 'bob123';
    
    try {
      setCryptoStatus(`🔐 Attempting quick sign-in for ${demoUser}...`);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: demoUser, password: demoPassword })
      });

      let data;
      if (response.ok) {
        data = await response.json();
      } else {
        setCryptoStatus(`🔑 ${demoUser} not found. Registering and generating keys client-side...`);
        const { publicKeyJWK, privateKeyJWK } = await generateRSAKeyPair();
        const { encryptedPrivateKeyHex, saltHex, ivHex } = await encryptPrivateKey(
          privateKeyJWK,
          demoPassword
        );
        
        const regResponse = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: demoUser,
            password: demoPassword,
            rsaPublicKey: JSON.stringify(publicKeyJWK),
            encryptedPrivateKey: encryptedPrivateKeyHex,
            salt: saltHex,
            iv: ivHex
          })
        });
        
        const regData = await regResponse.json();
        if (!regResponse.ok) throw new Error(regData.error || 'Failed to auto-register');
        
        setCryptoStatus(`🔐 Logging in as new tenant ${demoUser}...`);
        const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: demoUser, password: demoPassword })
        });
        data = await loginResponse.json();
        if (!loginResponse.ok) throw new Error(data.error || 'Failed to login after auto-registration');
      }

      setCryptoStatus(`🔓 Decrypting private RSA credentials for ${demoUser}...`);
      const { token, user } = data;
      const privateKeyObj = await decryptPrivateKey(
        user.encryptedPrivateKey,
        demoPassword,
        user.salt,
        user.iv
      );

      setCryptoStatus('✅ Auto-login complete!');
      setTimeout(() => {
        onLoginSuccess(token, { ...user, privateKeyObj });
      }, 1000);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Auto-demo failed');
      setCryptoStatus('');
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glowing-orb orb-purple"></div>
      <div className="glowing-orb orb-cyan"></div>
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <img src="/logo.png" className="auth-logo" alt="CloudVault Logo" />
          <h1>Cloud Vault</h1>
          <p>Zero-Knowledge Cloud Storage with Hybrid Cryptography</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${isLoginTab ? 'active' : ''}`}
            onClick={() => {
              setIsLoginTab(true);
              setError('');
            }}
            disabled={loading}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${!isLoginTab ? 'active' : ''}`}
            onClick={() => {
              setIsLoginTab(false);
              setError('');
            }}
            disabled={loading}
          >
            Register
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--color-error)', margin: '0.5rem 0 1rem', fontSize: '0.9rem', textAlign: 'left', background: 'rgba(255, 61, 0, 0.1)', padding: '0.6rem', borderRadius: '4px', border: '1px solid rgba(255, 61, 0, 0.2)' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={isLoginTab ? handleLogin : handleRegister}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={loading}
            />
          </div>

          {!isLoginTab && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                disabled={loading}
              />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processing...' : isLoginTab ? 'Login to Vault' : 'Generate Keys & Register'}
          </button>
        </form>

        <div style={{ marginTop: '1.8rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⚡ Showcase / Quick evaluation Demo
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.8rem', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#818cf8', fontWeight: 'bold' }}
              onClick={() => triggerAutoDemo('alice')}
              disabled={loading}
            >
              Demo: Alice
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.8rem', borderColor: 'rgba(6, 182, 212, 0.3)', color: 'var(--accent-cyan)', fontWeight: 'bold' }}
              onClick={() => triggerAutoDemo('bob')}
              disabled={loading}
            >
              Demo: Bob
            </button>
          </div>
        </div>

        {cryptoStatus && (
          <div className="crypto-loader" style={{ marginTop: '1.5rem' }}>
            <span>⚙️</span> {cryptoStatus}
          </div>
        )}
      </div>
    </div>
  );
}
