# 🛡️ CloudVault: Zero-Knowledge Multi-Tenant Vault & Container Isolation Security

[![React](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green?style=for-the-badge&logo=node.js)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%203-lightgrey?style=for-the-badge&logo=sqlite)](https://www.sqlite.org/)
[![Web Crypto API](https://img.shields.io/badge/Security-Web%20Crypto%20API-orange?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
[![Zero-Trust](https://img.shields.io/badge/Network-eBPF%20Cilium%20Sim-blueviolet?style=for-the-badge)](https://cilium.io/)

A state-of-the-art **Zero-Knowledge Multi-Tenant Storage Vault & Kubernetes Container Security Isolation Framework**. Built to address core challenges in Virtualization Security, Cryptographic Access Management, and Cloud Forensics.

---

## 🌟 Core Features

### 1. 🔒 Zero-Knowledge Browser-Bound Cryptography
*   **Password-to-Key PBKDF2**: Client-side key derivation using PBKDF2 (100,000 iterations of HMAC-SHA256 with salt) to lock/unlock user credentials.
*   **Asymmetric Key Pairs**: RSA-OAEP 2048-bit key generation in browser memory. Private key remains encrypted on local storage and is *never* transmitted to the server.
*   **Symmetric Payload Encryption**: Files are encrypted locally using AES-GCM 256-bit before upload. The AES key is wrapped with the recipient's RSA public key for secure cross-tenant sharing.
*   **Decryption Preview**: Dynamic visual in-app restoration displays decrypted images/documents directly inside the visualizer console.

### 2. 🌐 Zero-Trust eBPF Kubernetes Micro-Segmentation
*   **Tenant Segregation Map**: Dynamic, interactive cluster connectivity graph reflecting current tenant states (Alice-Client/Bob-Client vs hostile Pod namespaces).
*   **eBPF Ingress Policies**: Simulate Cilium-style container policies (Deny-All-Ingress vs Open routes) to block sidechannel access attempts.
*   **Vulnerability Scanning Terminal**: Live execution logs of Kubescape/Trivy container security audit policies.

### 3. ⛓️ Tamper-Proof Cryptographic Auditing Ledger
*   **Blockchain Hash Chaining**: Every cloud storage transaction is cryptographically linked using SHA-256 block hashing (previous hash + current transaction metadata = current hash).
*   **Forensic Verification Scanner**: Validates the ledger integrity block-by-block.
*   **Tamper Simulation**: Simulates host-level database intrusion by modifying records directly in SQLite, proving that the verification scanner halts and highlights the compromised block ID.

### 4. 📊 Glassmorphic Live Analytics
*   Frosted glass portal with floating backdrop light overlays.
*   Live storage metrics (Docs, Credentials, Config segment bar charts).
*   Hypervisor firewall block indicators and real-time cryptographic engine speed visualizers.

---

## 📁 Project Directory Structure
```text
VCS MINI/
├── backend/
│   ├── uploads/            # Encrypted ciphertext storage
│   ├── database.js         # SQLite database schema & ledger algorithms
│   ├── server.js           # API controllers & auth middlewares
│   └── package.json
├── frontend/
│   ├── public/             # AI-generated assets
│   ├── src/
│   │   ├── components/     # Vault, KeyManager, AuditLedger, NetworkIsolation
│   │   ├── App.jsx         # Root layout & state controllers
│   │   └── App.css         # Styling system & animations
│   └── package.json
├── start-all.bat           # Windows startup orchestration script
├── README.md               # User documentation
└── PROJECT_REPORT.md       # Full academic project report
```

---

## 🚀 Quick Setup & Installation

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Git](https://git-scm.com/)

### Step 1: Clone the Repository
```bash
git clone https://github.com/PratyushPandey31/cloud-vault.git
cd cloud-vault
```

### Step 2: Install Dependencies
Open your terminal in the project root:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 3: Run the Application
For Windows, simply double-click the **`start-all.bat`** file in the root directory. 

Or run them manually in separate terminal windows:
```bash
# Terminal 1: Start Backend (Port 5000)
cd backend
npm run dev

# Terminal 2: Start Frontend (Port 5173)
cd frontend
npm run dev
```

---

## 🎓 Showcase Guide: How to Present the Project

1.  **Sign-in**: Use the **⚡ Showcase / Quick evaluation Demo** panel at the bottom of the card. Click **Demo: Alice** or **Demo: Bob** to automatically generate keys, register, and log in.
2.  **Vault Verification**: Select the seeded `secure_blueprint.png` image and click **🔓 Decrypt & Download**. You will see the cryptographic visualizer run step-by-step and show a real-time image preview of the secure asset!
3.  **Zero-Trust Isolation**: Open the **Zero-Trust Cluster Network** tab. Disable micro-segmentation and click "Simulate Sidechannel Access" to see a breach alert. Enable micro-segmentation to trigger network policies dropping the packets.
4.  **Forensics Ledger**: Navigate to the **Immutable Audit Logs** tab. Click "Verify Ledger" to show a intact state. Click "Simulate Database Tampering" to write directly to SQLite, then run "Verify" again to watch the integrity chain break and flag the tampered blocks.
5.  **Compliance Logs**: Click the **📥 Export Report** buttons in all 4 tabs to download detailed SOC-2/HIPAA compliance sheets.
