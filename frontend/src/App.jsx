import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import FileVault from './components/FileVault';
import KeyManager from './components/KeyManager';
import AuditLedger from './components/AuditLedger';
import NetworkIsolation from './components/NetworkIsolation';

const API_URL = 'http://localhost:5000';

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('vault');
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({ totalFiles: 0, storageUsed: 0 });

  // Autologin check (won't restore privateKeyObj, so we force relogin on refresh for Zero-Knowledge security)
  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLoginSuccess = (token, userData) => {
    setToken(token);
    setUser(userData);
    showToast(`Welcome back, ${userData.username}!`, 'success');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    showToast('Logged out successfully', 'success');
  };

  const fetchStats = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/files`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        const total = data.length;
        const storage = data.reduce((acc, curr) => acc + curr.size, 0);
        setStats({ totalFiles: total, storageUsed: storage });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token, currentTab]);

  if (!token || !user) {
    return (
      <div className="app-container">
        <Login onLoginSuccess={handleLoginSuccess} API_URL={API_URL} />
        {toast && (
          <div className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Main Layout */}
      <div className="dashboard-wrapper" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flexGrow: 1, minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside className="dashboard-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
          <div className="brand" style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingBottom: '1.8rem', borderBottom: '1px solid var(--border-glass)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/logo.png" style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1.5px solid rgba(6,182,212,0.3)', boxShadow: '0 0 15px rgba(6,182,212,0.25)' }} alt="Logo" />
              <span className="brand-logo" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>CloudVault</span>
            </div>
            <span className="brand-badge" style={{ fontSize: '0.68rem', width: 'fit-content', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6,182,212,0.2)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold', marginTop: '6px' }}>Zero-Knowledge Vault</span>
          </div>

          <button
            className={`sidebar-btn ${currentTab === 'vault' ? 'active' : ''}`}
            onClick={() => setCurrentTab('vault')}
          >
            <span>📂</span> Secure Vault
          </button>
          
          <button
            className={`sidebar-btn ${currentTab === 'keys' ? 'active' : ''}`}
            onClick={() => setCurrentTab('keys')}
          >
            <span>🔑</span> Keys Manager
          </button>
          
          <button
            className={`sidebar-btn ${currentTab === 'audit' ? 'active' : ''}`}
            onClick={() => setCurrentTab('audit')}
          >
            <span>📜</span> Immutable Audit Logs
          </button>
          
          <button
            className={`sidebar-btn ${currentTab === 'network' ? 'active' : ''}`}
            onClick={() => setCurrentTab('network')}
          >
            <span>🌐</span> Zero-Trust Cluster Network
          </button>

          {/* User Profile section at bottom of sidebar */}
          <div className="user-profile-menu" style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="profile-card" style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <span className="profile-name" style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.88rem', display: 'block' }}>
                👤 {user.username}
              </span>
              <span className="profile-role" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                {user.role}
              </span>
            </div>
            <button className="btn-secondary" style={{ width: '100%', padding: '0.65rem', fontWeight: 'bold' }} onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Dashboard Content */}
        <main className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', maxHeight: '100vh', overflowY: 'auto' }}>
          {/* Welcome Greeting Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.2rem' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Welcome Back, {user.username}!</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>Hypervisor-Level Tenant Segregation & Vault Cryptography Management.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span className="badge" style={{ background: 'rgba(0, 230, 118, 0.1)', border: '1px solid var(--color-success)', color: 'var(--color-success)', padding: '0.45rem 0.9rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.3px' }}>
                🟢 Node Tunnel Secure
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="vault-stats-row">
            <div className="glass-panel stat-card">
              <h3>Secure Cloud Storage Limit</h3>
              <div className="stat-value">
                {formatSize(stats.storageUsed)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ 100 MB</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${Math.min((stats.storageUsed / 104857600) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="stat-desc">Zero-knowledge physical space utilization</div>
            </div>

            <div className="glass-panel stat-card">
              <h3>Encrypted Files Count</h3>
              <div className="stat-value">{stats.totalFiles}</div>
              <div className="stat-desc" style={{ marginTop: '10px' }}>Active database files indexed</div>
            </div>

            <div className="glass-panel stat-card">
              <h3>Cryptographic Health</h3>
              <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '1.6rem' }}>🛡️</span> Optimal
              </div>
              <div className="stat-desc" style={{ marginTop: '12px' }}>
                RSA-2048 & AES-GCM-256 local entropy OK
              </div>
            </div>
          </div>

          {/* Active Tab Component */}
          {currentTab === 'vault' && (
            <FileVault
              user={user}
              token={token}
              API_URL={API_URL}
              onLogUpdate={fetchStats}
              showToast={showToast}
            />
          )}

          {currentTab === 'keys' && (
            <KeyManager
              user={user}
              showToast={showToast}
            />
          )}

          {currentTab === 'audit' && (
            <AuditLedger
              token={token}
              API_URL={API_URL}
              onLogUpdate={fetchStats}
              showToast={showToast}
            />
          )}

          {currentTab === 'network' && (
            <NetworkIsolation
              user={user}
              token={token}
              API_URL={API_URL}
              onLogUpdate={fetchStats}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
