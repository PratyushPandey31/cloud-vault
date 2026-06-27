import React, { useState, useEffect } from 'react';

export default function AuditLedger({ token, API_URL, onLogUpdate, showToast }) {
  const [logs, setLogs] = useState([]);
  const [verificationReport, setVerificationReport] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifiedBlockIds, setVerifiedBlockIds] = useState([]);
  const [tamperedBlockId, setTamperedBlockId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/audit/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setLogs(data);
        // Reset verification states
        setVerificationReport(null);
        setVerifiedBlockIds([]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifiedBlockIds([]);
    setVerificationReport(null);
    
    try {
      const response = await fetch(`${API_URL}/api/audit/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification failed');

      // Sort logs in ascending order (genesis first) to animate verification
      const reportAsc = [...data.report].sort((a, b) => a.id - b.id);
      
      // Animate verification block-by-block
      for (let i = 0; i < reportAsc.length; i++) {
        await new Promise(r => setTimeout(r, 200));
        const block = reportAsc[i];
        
        if (!block.is_valid) {
          setTamperedBlockId(block.id);
          // Stop verifying further if compromised
          setVerificationReport(data);
          setVerifying(false);
          showToast(`Integrity compromised at Log ID #${block.id}!`, 'error');
          return;
        }
        
        setVerifiedBlockIds(prev => [...prev, block.id]);
      }

      setVerificationReport(data);
      setVerifying(false);
      showToast('All audit logs cryptographically verified!', 'success');
      
    } catch (error) {
      console.error(error);
      showToast('Ledger verification failed.', 'error');
      setVerifying(false);
    }
  };

  const handleTamperSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/audit/tamper`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Tampering failed');

      showToast('Database record modified directly without updating hash!', 'success');
      fetchLogs(); // Reload logs showing modified details
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Tamper simulation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportLedgerReport = () => {
    let report = `=================================================================\n` +
      `             IMMUTABLE AUDIT LOG FORENSIC REPORT\n` +
      `         Generated on: ${new Date().toLocaleString()}\n` +
      `=================================================================\n\n` +
      `Ledger Status: ${verificationReport ? (verificationReport.isChainValid ? 'SEALED & INTEGRAL' : 'COMPROMISED') : 'UNVERIFIED'}\n` +
      `Total Log Entries: ${logs.length}\n\n` +
      `--- AUDIT LEDGER ENTRIES ---\n\n`;

    logs.forEach((log) => {
      const reportItem = verificationReport?.report.find(r => r.id === log.id);
      report += `[Block ID #${log.id}] [${new Date(log.timestamp).toLocaleString()}]\n`;
      report += `Event Type: ${log.event_type}\n`;
      report += `Actor: ${log.username || 'SYSTEM'} (ID: ${log.user_id || 'N/A'})\n`;
      report += `Details: ${log.details}\n`;
      report += `Stored Block Hash: ${log.log_hash}\n`;
      report += `Previous Block Hash: ${log.prev_hash}\n`;
      if (reportItem) {
        report += `Recalculated Hash: ${reportItem.calculated_hash}\n`;
        report += `Block Verification: ${reportItem.is_valid ? 'PASS (Intact)' : 'FAIL (Tampered!)'}\n`;
      }
      report += `-------------------------------------------------\n\n`;
    });

    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_forensic_audit_report.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast('Forensic Ledger Report downloaded!', 'success');
  };

  return (
    <div className="audit-ledger-container">
      <div className="vault-header" style={{ marginBottom: '2rem' }}>
        <div className="vault-title">
          <h2>Centralized Immutable Audit Ledger</h2>
          <p>A tamper-proof ledger chaining every cloud transaction via SHA-256 (Block-chain hashing pattern).</p>
        </div>
        <button
          className="btn-secondary"
          onClick={exportLedgerReport}
          disabled={logs.length === 0}
          style={{ width: 'auto', padding: '0.6rem 1.5rem' }}
        >
          📥 Export Ledger Report
        </button>
      </div>

      <div className="audit-controls">
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '0.65rem 1.5rem' }}
            onClick={handleVerify}
            disabled={verifying || logs.length === 0}
          >
            {verifying ? 'Checking Cryptographic Chain...' : '🛡️ Verify Ledger Integrity'}
          </button>
          <button
            className="btn-secondary btn-tamper"
            onClick={handleTamperSimulation}
            disabled={verifying || loading || logs.length === 0}
          >
            💥 Simulate Database Tampering
          </button>
        </div>

        {verificationReport && (
          <div className={`audit-status ${verificationReport.isChainValid ? 'valid' : 'invalid'}`}>
            {verificationReport.isChainValid ? (
              <><span>✓</span> Ledger Status: Cryptographically Sealed & Valid</>
            ) : (
              <><span>⚠️</span> Ledger Status: COMPROMISED (Tampering Detected)</>
            )}
          </div>
        )}
      </div>

      {/* Blockchain Integrity Map visualization */}
      {logs.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔗 Hash-Pointer Blockchain Visualization Map</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '10px 0' }}>
            {logs.slice(0, 6).map((log, idx) => {
              const isVerified = verifiedBlockIds.includes(log.id);
              const isCompromised = verificationReport && !verificationReport.report.find(r => r.id === log.id)?.is_valid;
              
              let boxColor = 'rgba(255,255,255,0.02)';
              let borderCol = 'var(--border-glass)';
              let textColor = 'var(--text-secondary)';
              let statusText = 'PENDING';

              if (isVerified && !isCompromised) {
                boxColor = 'rgba(0, 230, 118, 0.05)';
                borderCol = 'rgba(0, 230, 118, 0.4)';
                textColor = 'var(--color-success)';
                statusText = 'SECURE';
              } else if (isCompromised) {
                boxColor = 'rgba(255, 23, 68, 0.08)';
                borderCol = 'var(--color-danger)';
                textColor = 'var(--color-danger)';
                statusText = 'TAMPERED';
              } else if (verifying) {
                boxColor = 'rgba(255, 196, 0, 0.05)';
                borderCol = 'rgba(255, 196, 0, 0.4)';
                textColor = '#ffc400';
                statusText = 'VERIFYING';
              }

              return (
                <React.Fragment key={log.id}>
                  {idx > 0 && (
                    <div style={{ fontSize: '1.2rem', color: isCompromised ? 'var(--color-danger)' : (isVerified ? 'var(--color-success)' : 'rgba(255,255,255,0.1)') }}>
                      {isCompromised ? '⚡' : '➔'}
                    </div>
                  )}
                  <div style={{ 
                    flex: '1 0 100px', 
                    background: boxColor, 
                    border: `1.5px solid ${borderCol}`, 
                    borderRadius: '8px', 
                    padding: '10px', 
                    textAlign: 'center', 
                    minWidth: '105px', 
                    boxShadow: isVerified && !isCompromised ? '0 0 10px rgba(0, 230, 118, 0.1)' : (isCompromised ? '0 0 15px rgba(255, 23, 68, 0.2)' : 'none')
                  }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>BLOCK #{log.id}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: textColor, margin: '4px 0' }}>{statusText}</div>
                    <div style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.log_hash.substring(0, 8)}...
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '3rem' }}>📜</span>
          <p style={{ marginTop: '1rem', fontWeight: 600 }}>Audit ledger is empty.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Perform file operations (upload, download, share) to populate the chain.</p>
        </div>
      ) : (
        <div className="ledger-chain">
          {logs.map((log) => {
            const isVerified = verifiedBlockIds.includes(log.id);
            const isCompromised = verificationReport && !verificationReport.report.find(r => r.id === log.id)?.is_valid;
            
            let blockClass = '';
            if (isVerified) blockClass = 'verified';
            if (isCompromised) blockClass = 'compromised';

            const logReport = verificationReport?.report.find(r => r.id === log.id);

            return (
              <div key={log.id} className={`ledger-block ${blockClass}`}>
                <div className="chain-link"></div>
                <div className="glass-panel block-body">
                  <div className="block-header">
                    <span className="brand-badge" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', borderColor: 'var(--border-glass)' }}>
                      Block ID #{log.id}
                    </span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  
                  <div style={{ margin: '8px 0' }}>
                    <span className="block-title">{log.event_type}</span>
                    <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>|</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Actor: <strong>{log.username || 'SYSTEM'}</strong> (ID: {log.user_id || 'N/A'})
                    </span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.8rem', borderRadius: '4px', borderLeft: '3px solid var(--accent-color)' }}>
                    {log.details}
                  </p>

                  <div className="block-hash-row">
                    <span className="block-hash-label">Stored Hash:</span>
                    <span className={`block-hash-val ${isCompromised ? 'alert-val' : isVerified ? 'success-val' : ''}`}>
                      {log.log_hash}
                    </span>
                    
                    <span className="block-hash-label">Prev Hash:</span>
                    <span className="block-hash-val">{log.prev_hash}</span>

                    {logReport && !logReport.is_valid && (
                      <>
                        <span className="block-hash-label" style={{ color: 'var(--color-error)' }}>Calculated Hash:</span>
                        <span className="block-hash-val alert-val" style={{ fontWeight: 'bold' }}>
                          {logReport.calculated_hash}
                        </span>
                        <span className="block-hash-label" style={{ color: 'var(--color-error)' }}>Chain Status:</span>
                        <span className="block-hash-val alert-val" style={{ fontWeight: 'bold' }}>
                          ❌ INVALID HASH LINK (Db data tampered!)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
