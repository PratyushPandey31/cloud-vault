# 🛡️ PROJECT REPORT
## ZERO-KNOWLEDGE MULTI-TENANT VAULT & CLOUD VIRTUALIZATION SECURITY FRAMEWORK

---

### 📋 ACADEMIC DETAILS
*   **Subject**: Cloud Computing & Virtualization Security
*   **Project Classification**: Capstone / Mini-Project
*   **Document Classification**: Forensic Compliance & Technical Synopsis Report
*   **Document Date**: June 2026

---

## 1. ABSTRACT / SYNOPSIS
Multi-tenant cloud architectures present significant security vulnerabilities due to shared physical hardware and orchestration layers. Standard cloud storage hosts possess full visibility of stored client payloads, leading to massive data leaks if the hypervisor or host server is compromised. Additionally, container escape techniques and sidechannel attacks allow malicious tenants to read memory boundaries of co-located nodes in container networks.

This project presents **CloudVault**, an enterprise-grade Zero-Knowledge Vault and CNI Micro-segmentation simulator. By leveraging client-side key derivation (PBKDF2) and hybrid end-to-end cryptography (AES-GCM-256 + RSA-OAEP-2048), user credentials and files remain fully encrypted *prior* to server ingestion. A built-in eBPF Cilium emulator demonstrates container-level network isolation inside virtualized clusters, while an immutable transaction auditing ledger chains every file activity with SHA-256 block hashing (blockchain model) to detect host-level database tampering.

---

## 2. SYSTEM ARCHITECTURE & DATA FLOW
The system is divided into three key layers:
1.  **Presentation & Crypto Layer (React Client)**: Performs all cryptographic key generations, file payload encryptions/decryptions, and network policy visual animations.
2.  **API Gateway Layer (Express Backend)**: Orchestrates JWT session validations, file transfers, and database insertions.
3.  **Persistence & Auditing Layer (SQLite Database)**: Stores encrypted payloads, public keys, and the linked-list cryptographic ledger blocks.

### System Data Flow diagram (Client-Server boundaries):
```text
  [ CLIENT BROWSER ]                                           [ BACKEND SERVER ]
User Password ──► PBKDF2 ──► AES-256 Symmetric Key             
                      │
            Decrypts Asymmetric Key
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
      RSA-2048 Public     RSA-2048 Private (Locked)
            │
            ▼
    [ Upload Phase ]
Raw File ──► AES-GCM (256-bit) ──► Ciphertext ───────────────► Stored in /uploads
                                        ▲
Local Random AES key ──► RSA Wrapped ───┘────────────────────► Stored in SQLite (file_shares)
```

---

## 3. CORE SECURITY MODULES & CONTROLS

### MODULE A: Zero-Knowledge Cryptography (FIPS 140-2 Standards)
*   **Key Derivation**: Passwords are processed using PBKDF2 with 100,000 iterations of HMAC-SHA256 and a 128-bit salt to derive the symmetric wrapping key.
*   **Asymmetric Bindings**: When registering, the Web Crypto API generates a cryptographically secure 2048-bit RSA-OAEP public/private key pair. The private key is encrypted client-side using the derived PBKDF2 key and uploaded, so only the user's password can decrypt it in-memory.
*   **Key Wrapping**: To share a file, the client pulls the recipient's RSA public key, wraps the file's individual AES key, and uploads the wrapped token. Only the recipient's private key can unwrap the AES key to decrypt the payload.

### MODULE B: Container Network Policies (Zero-Trust Isolation)
*   Container network interfaces (CNI) like Cilium enforce microsegmentation using eBPF rules loaded directly into the host operating system kernel.
*   The simulator loads namespace constraints (e.g. `tenant-a`, `tenant-b`, `vault-system`) and maps network pathways.
*   **Micro-segmentation Policy**:
    ```text
    apiVersion: "cilium.io/v2"
    kind: CiliumNetworkPolicy
    metadata:
      name: "deny-cross-tenant-traffic"
      namespace: "tenant-a"
    spec:
      endpointSelector:
        matchLabels:
          role: db-vault-service
      ingress:
      - fromEndpoints:
        - matchLabels:
            org: tenant-a-client
    ```
*   When active, sidechannel packets are dropped at the virtualized boundary, preventing inter-tenant memory reads or cluster gateway bypasses.

### MODULE C: Immutable Audit Ledger & Forensics
*   Traditional server log files can be modified by a root attacker. To prevent logs modification, a block-hashing ledger was built:
    $$\text{Block Hash} = \text{SHA-256}(\text{Timestamp} \mathbin{\Vert} \text{Event} \mathbin{\Vert} \text{Actor} \mathbin{\Vert} \text{Details} \mathbin{\Vert} \text{Previous Block Hash})$$
*   If a database hacker alters a log record directly in SQLite to hide an intrusion, the verification scanner detects that the current block's hash does not compute with the consecutive block's `prev_hash` pointer, immediately alerting the system administrator.

---

## 4. SCREENSHOTS & RESULT VERIFICATION
A fully working implementation was compiled and verified:
1.  **Authentication Portal**: Uses high-fidelity frosted glassmorphism overlays with rotating violet and cyan orbs. A pulsing shield vector logo serves as the primary visual branding.
2.  **Local Image Decryption**: The file `secure_blueprint.png` was successfully uploaded, encrypted, stored as raw ciphertext, downloaded, and decrypted back to the source image preview screen.
3.  **Vulnerability Auditing**: Runs container scanners showing compliance percentages under CIS standards.
4.  **Forensic Ledger Verification**: Successfully isolated tampered logs, highlighting database records altered via host-level intrusions.

---

## 5. CONCLUSION & RECOMMENDATIONS
This framework provides complete mitigation against standard cloud-level vulnerabilities:
*   **Host Compromise Mitigation**: Even if the cloud provider's host operating system is completely breached, the attacker only acquires encrypted raw binary payloads (ciphertexts) and wrapped keys. Without the client's master password, the private keys remain mathematically unbreakable.
*   **Micro-segmentation Enforcements**: Isolating microservice workloads via CNI policies limits sidechannel horizontal movement vectors.
*   **Compliance Compliance**: Exportable SOC-2 reports satisfy high-compliance auditing frameworks for HIPAA, PCI-DSS, and GDPR within cloud virtualization nodes.
