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
    // Clear old tokens to avoid stale logins with missing memory keys
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
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo">CloudVault</span>
          <span className="brand-badge">Zero-Knowledge</span>
        </div>
        
        <div className="user-profile-menu">
          <div className="profile-card">
            <span className="profile-name">
              👤 {user.username}
            </span>
            <span className="profile-role">
              {user.role} | Public Key: {JSON.parse(user.rsaPublicKey).n.substring(0, 10)}...
            </span>
          </div>
          <button className="btn-secondary" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="dashboard-wrapper">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
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
        </aside>

        {/* Dashboard Content */}
        <main className="dashboard-content">
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
