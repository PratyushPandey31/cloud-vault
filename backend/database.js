import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'vault.db');
const db = new sqlite3.Database(dbPath);

// Helper to run queries as promises
export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize database tables
export const initDatabase = async () => {
  // Enforce foreign key constraints
  await run('PRAGMA foreign_keys = ON');

  // Users Table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rsa_public_key TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      private_key_salt TEXT NOT NULL,
      private_key_iv TEXT NOT NULL,
      role TEXT DEFAULT 'Tenant'
    )
  `);

  // Files Table
  await run(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      owner_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      iv TEXT NOT NULL,
      upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id)
    )
  `);

  // File Shares Table
  await run(`
    CREATE TABLE IF NOT EXISTS file_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id TEXT NOT NULL,
      recipient_id INTEGER NOT NULL,
      encrypted_aes_key TEXT NOT NULL,
      shared_by INTEGER NOT NULL,
      permission TEXT DEFAULT 'full',
      FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY(recipient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(shared_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Audit Logs Table
  await run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      event_type TEXT NOT NULL,
      user_id INTEGER,
      username TEXT,
      details TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      log_hash TEXT NOT NULL
    )
  `);

  console.log('SQLite Database Initialized.');
  await seedDemoData();
};

// Seed initial system logs dynamically to verify chain integrity on first start
const seedDemoData = async () => {
  try {
    const hasLogs = await get('SELECT id FROM audit_logs LIMIT 1');
    if (hasLogs) return;

    console.log('Seeding Cryptographic Audit Ledger...');
    
    const demoLogs = [
      {
        timestamp: '2026-06-27T10:00:00.000Z',
        event_type: 'SYSTEM_INIT',
        user_id: null,
        username: 'SYSTEM',
        details: 'Cloud Vault Virtualization Hypervisor Initialized. Core encryption algorithms loaded.'
      },
      {
        timestamp: '2026-06-27T10:05:00.000Z',
        event_type: 'POLICY_APPLY',
        user_id: null,
        username: 'SYSTEM',
        details: 'eBPF Cilium Micro-segmentation policy [deny-all-ingress] applied to vault-db namespace.'
      },
      {
        timestamp: '2026-06-27T10:10:00.000Z',
        event_type: 'USER_REGISTER',
        user_id: 1,
        username: 'alice',
        details: 'Tenant registered successfully: alice (RSA-2048 identity generated).'
      },
      {
        timestamp: '2026-06-27T10:12:00.000Z',
        event_type: 'USER_REGISTER',
        user_id: 2,
        username: 'bob',
        details: 'Tenant registered successfully: bob (RSA-2048 identity generated).'
      },
      {
        timestamp: '2026-06-27T10:20:00.000Z',
        event_type: 'FILE_UPLOAD',
        user_id: 1,
        username: 'alice',
        details: 'Uploaded encrypted file: financial_report_q2.txt (ID: demo-financials)'
      },
      {
        timestamp: '2026-06-27T10:25:00.000Z',
        event_type: 'FILE_SHARE',
        user_id: 1,
        username: 'alice',
        details: 'Shared file financial_report_q2.txt with bob (Permission: read)'
      }
    ];

    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const log of demoLogs) {
      const hashInput = `${log.timestamp}|${log.event_type}|${log.user_id || 'SYSTEM'}|${log.username || 'SYSTEM'}|${log.details}|${prevHash}`;
      const logHash = crypto.createHash('sha256').update(hashInput).digest('hex');
      
      await run(
        `INSERT INTO audit_logs (timestamp, event_type, user_id, username, details, prev_hash, log_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [log.timestamp, log.event_type, log.user_id, log.username, log.details, prevHash, logHash]
      );
      prevHash = logHash;
    }
    console.log('Seeded 6 cryptographic logs.');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

// Cryptographically chained audit logger
export const logEvent = async (eventType, userId, username, details) => {
  try {
    // Get the latest log entry to find the previous hash
    const lastLog = await get('SELECT log_hash FROM audit_logs ORDER BY id DESC LIMIT 1');
    const prevHash = lastLog ? lastLog.log_hash : '0000000000000000000000000000000000000000000000000000000000000000';
    
    const timestamp = new Date().toISOString();
    
    // Create hash: SHA256(timestamp + eventType + userId + username + details + prevHash)
    const hashInput = `${timestamp}|${eventType}|${userId || 'SYSTEM'}|${username || 'SYSTEM'}|${details}|${prevHash}`;
    const logHash = crypto.createHash('sha256').update(hashInput).digest('hex');
    
    await run(
      `INSERT INTO audit_logs (timestamp, event_type, user_id, username, details, prev_hash, log_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [timestamp, eventType, userId, username, details, prevHash, logHash]
    );
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
};

// Verify the integrity of the audit logs chain
export const verifyAuditChain = async () => {
  try {
    const logs = await all('SELECT * FROM audit_logs ORDER BY id ASC');
    let currentPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const report = [];
    let isChainValid = true;

    for (const log of logs) {
      // Recompute the hash
      const hashInput = `${log.timestamp}|${log.event_type}|${log.user_id || 'SYSTEM'}|${log.username || 'SYSTEM'}|${log.details}|${log.prev_hash}`;
      const calculatedHash = crypto.createHash('sha256').update(hashInput).digest('hex');
      
      const isPrevHashMatch = log.prev_hash === currentPrevHash;
      const isHashMatch = log.log_hash === calculatedHash;
      const isValid = isPrevHashMatch && isHashMatch;

      if (!isValid) {
        isChainValid = false;
      }

      report.push({
        id: log.id,
        timestamp: log.timestamp,
        event_type: log.event_type,
        username: log.username,
        details: log.details,
        stored_hash: log.log_hash,
        calculated_hash: calculatedHash,
        prev_hash: log.prev_hash,
        expected_prev_hash: currentPrevHash,
        is_valid: isValid
      });

      // Move forward
      currentPrevHash = log.log_hash;
    }

    return { isChainValid, report };
  } catch (error) {
    console.error('Audit Verification Error:', error);
    throw error;
  }
};
