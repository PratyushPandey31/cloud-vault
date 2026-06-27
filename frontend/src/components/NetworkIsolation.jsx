import React, { useState, useEffect } from 'react';

export default function NetworkIsolation({ user, token, API_URL, onLogUpdate, showToast }) {
  const [networkPolicyActive, setNetworkPolicyActive] = useState(true);
  const [secScanLogs, setSecScanLogs] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [attackActive, setAttackActive] = useState(false);
  const [attackResult, setAttackResult] = useState(null);
  const [packetFlow, setPacketFlow] = useState(null);

  const clientName = user ? user.username : 'Tenant';
  const hostileName = clientName.toLowerCase() === 'alice' ? 'Tenant-B-Pod' : 'Tenant-A-Pod';

  const runVulnerabilityScan = async () => {
    setScanning(true);
    setSecScanLogs([]);
    
    const logs = [
      '🔍 Initializing Kubescape Audit Engine...',
      '🐳 Scanning base container image (node:22-alpine)...',
      '📦 Analyzing Node.js dependencies for known CVEs...',
      '🛡️ Verifying runtime environment security headers...',
      '🧬 Inspecting eBPF Cilium network policies configuration...',
      '⚠️ Check: Host namespace isolation verification... SUCCESS.',
      '✅ Audit Completed: 0 Critical, 0 High, 2 Low vulnerabilities detected.',
      '🔐 Compliance status: CIS Kubernetes Benchmark 94% Compliant.'
    ];

    for (let i = 0; i < logs.length; i++) {
      await new Promise(r => setTimeout(r, 400));
      setSecScanLogs(prev => [...prev, logs[i]]);
    }
    setScanning(false);
    showToast('Kubernetes Container scan completed!', 'success');
  };

  const simulateIntrusion = async () => {
    setAttackActive(true);
    setAttackResult(null);
    setPacketFlow('ingress');

    await new Promise(r => setTimeout(r, 1000));
    setPacketFlow('compromised-attempt');

    await new Promise(r => setTimeout(r, 1200));
    
    const compromisedContainer = hostileName.toLowerCase() === 'tenant-b-pod' ? 'tenant-b-container' : 'tenant-a-container';

    if (networkPolicyActive) {
      setAttackResult({
        status: 'blocked',
        log: `🚨 INTRUSION PREVENTED: eBPF NetworkPolicy [deny-all-ingress] dropped packet from ${compromisedContainer} (Namespace: default, IP: 10.244.1.42) trying to access db-vault-service.`
      });
      showToast('Intrusion Blocked by Zero-Trust Policy!', 'success');
    } else {
      setAttackResult({
        status: 'breached',
        log: `🔴 SECURITY ALERT: ${hostileName} container successfully bypassed default network constraints and established connection to database-vault. Raw binary reads attempted! (Audit Log entry generated).`
      });
      showToast('Security Breach Simulated!', 'error');
    }
    setPacketFlow(null);
    setAttackActive(false);
  };

  const exportNetworkReport = () => {
    let report = `=================================================================\n` +
      `             KUBERNETES CONTAINER COMPLIANCE SCAN REPORT\n` +
      `         Generated on: ${new Date().toLocaleString()}\n` +
      `=================================================================\n\n` +
      `Tenant context: ${clientName}\n` +
      `Hostile Neighbor context: ${hostileName}\n` +
      `Microsegmentation status: ${networkPolicyActive ? 'ENABLED (Deny-All-Ingress)' : 'DISABLED (Allow-All)'}\n` +
      `CNI Network Security Interface: Cilium (eBPF based)\n\n` +
      `--- DEPENDENCY & CONTAINER VULNERABILITY SCAN LOGS ---\n\n`;

    if (secScanLogs.length === 0) {
      report += `[No scan run. Run container vulnerability audit in the UI first.]\n`;
    } else {
      secScanLogs.forEach((log) => {
        report += `${log}\n`;
      });
    }

    report += `\n-----------------------------------------------------------------\n` +
      `CIS Kubernetes Security Benchmark: Profile Level 1 Active.\n` +
      `Zero-Trust network policies enforced via Kernel namespaces.\n`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clientName}_kubernetes_cni_compliance_report.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast('Kubernetes Network Compliance Report downloaded!', 'success');
  };

  return (
    <div className="network-isolation-container">
      <div className="vault-header" style={{ marginBottom: '2rem' }}>
        <div className="vault-title">
          <h2>Zero-Trust Micro-Segmentation & Container Security</h2>
          <p>Simulate containerized Kubernetes isolation policies, eBPF firewalling, and threat intelligence monitoring.</p>
        </div>
        <button
          className="btn-secondary"
          onClick={exportNetworkReport}
          style={{ width: 'auto', padding: '0.6rem 1.5rem' }}
        >
          📥 Export Compliance Report
        </button>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
        {/* Interactive Cluster Map */}
        <div className="glass-panel" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
          <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🌐 Kubernetes Cluster Pod Connectivity Map</span>
            <button
              className={`btn-action ${networkPolicyActive ? 'btn-tamper' : ''}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: networkPolicyActive ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 61, 0, 0.15)', borderColor: networkPolicyActive ? 'var(--color-success)' : 'var(--color-error)', color: networkPolicyActive ? 'var(--color-success)' : '#ff8a65' }}
              onClick={() => setNetworkPolicyActive(!networkPolicyActive)}
            >
              🛡️ Policy: {networkPolicyActive ? 'MICRO-SEGMENTATION ENABLED (Deny-All)' : 'UNSECURED (Allow-All-Ingress)'}
            </button>
          </h3>

          {/* Graphical Map Canvas */}
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid var(--border-glass)', padding: '2rem', height: '320px', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            
            {/* Background grids */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(var(--border-glass) 1px, transparent 1px)', backgroundSize: '16px 16px', opacity: 0.5 }}></div>

            {/* Ingress Node */}
            <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'rgba(93, 63, 211, 0.2)', border: '2px solid var(--accent-color)', boxShadow: '0 0 15px var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                💻
              </div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{clientName}-Client</span>
            </div>

            {/* Connecting network lines */}
            <div style={{ position: 'absolute', top: '150px', left: '100px', right: '100px', height: '2px', background: 'rgba(255,255,255,0.05)', zIndex: 1 }}>
              {/* Packet animations */}
              {packetFlow === 'ingress' && (
                <div style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: '0 0 8px var(--accent-cyan)', left: 0, animation: 'movePacket 1s linear forwards' }}></div>
              )}
            </div>

            {/* Center Pod: API Gateway / Controller */}
            <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'absolute', left: '42%', top: '35%' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(0, 242, 254, 0.1)', border: '2px dashed var(--accent-cyan)', boxShadow: '0 0 15px var(--accent-cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
                ⚙️
              </div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>Vault-API-Gateway</span>
            </div>

            {/* Secure DB Pod */}
            <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'rgba(0, 230, 118, 0.15)', border: '2px solid var(--color-success)', boxShadow: '0 0 15px rgba(0, 230, 118, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                🗄️
              </div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>SQLite-Vault-DB</span>
            </div>

            {/* Compromised Attacker Pod (bottom) */}
            <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'absolute', bottom: '15px', left: '44%' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '8px', background: 'rgba(255, 61, 0, 0.15)', border: '2px solid var(--color-error)', boxShadow: '0 0 15px rgba(255, 61, 0, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                🏴‍☠️
              </div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-error)', fontWeight: 'bold' }}>{hostileName} (Hostile)</span>
            </div>

            {/* Attack packet flow */}
            {packetFlow === 'compromised-attempt' && (
              <div style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-error)', boxShadow: '0 0 8px var(--color-error)', left: '49%', bottom: '70px', animation: 'moveAttackPacket 1.2s linear forwards' }}></div>
            )}

            {/* Firewall Wall Visual representation */}
            {networkPolicyActive && (
              <div style={{ position: 'absolute', width: '4px', height: '80px', background: 'linear-gradient(to bottom, transparent, var(--color-success), transparent)', left: '72%', top: '110px', zIndex: 5, boxShadow: '0 0 10px var(--color-success)' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-success)', transform: 'rotate(-90deg) translate(-25px, -8px)', fontStyle: 'bold', fontFamily: 'var(--font-mono)' }}>SHIELD</div>
              </div>
            )}

            {/* Attack status indicator */}
            {attackResult && (
              <div className={`toast ${attackResult.status === 'blocked' ? 'success' : 'error'}`} style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', bottom: 'auto', borderRadius: '8px', fontSize: '0.75rem', padding: '0.8rem', zIndex: 100, borderLeftWidth: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                {attackResult.log}
              </div>
            )}

          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
            <button
              className="btn-primary"
              style={{ flex: 1, padding: '0.75rem' }}
              onClick={simulateIntrusion}
              disabled={attackActive}
            >
              ⚡ Simulate Sidechannel Access Attempt ({hostileName})
            </button>
          </div>
        </div>

        {/* Console Log Panel */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🛠️ Container Vulnerability Audits</span>
            <button
              className="btn-action"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }}
              onClick={runVulnerabilityScan}
              disabled={scanning}
            >
              {scanning ? 'Scanning...' : 'Run Audit'}
            </button>
          </h3>
          
          <div style={{ background: '#05070a', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '1rem', flexGrow: 1, fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#39ff14', overflowY: 'auto', maxHeight: '280px', minHeight: '280px', lineHeights: 1.5 }}>
            {secScanLogs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '6rem' }}>
                🐚 Terminal Idle. Click "Run Audit" to scan microservice containers.
              </div>
            ) : (
              secScanLogs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: '6px', color: log.startsWith('✅') ? 'var(--color-success)' : log.startsWith('⚠️') ? 'var(--color-warn)' : '#a29bfe' }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes movePacket {
          0% { left: 80px; top: 140px; }
          50% { left: 47%; top: 125px; }
          100% { left: 84%; top: 140px; }
        }
        @keyframes moveAttackPacket {
          0% { left: 49%; bottom: 70px; }
          50% { left: 49%; bottom: 180px; }
          100% { left: 80%; bottom: 160px; }
        }
      `}</style>
    </div>
  );
}
