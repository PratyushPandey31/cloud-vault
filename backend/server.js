import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

import {
  initDatabase,
  run,
  get,
  all,
  logEvent,
  verifyAuditChain
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if not exists
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Copy demo PNG blueprint file to uploads folder as 'demo-financials'
const demoSrc = path.resolve(__dirname, 'secure_blueprint.png');
const demoDest = path.resolve(uploadsDir, 'demo-financials');
if (fs.existsSync(demoSrc)) {
  fs.copyFileSync(demoSrc, demoDest);
  console.log('Seeded physical demo-financials asset successfully.');
}

const app = express();
const PORT = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set. Create a backend/.env file.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// Configure Multer for local encrypted storage
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Initialize SQLite DB
await initDatabase();

// Middleware: Authenticate JWT Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Register Tenant
app.post('/api/auth/register', async (req, res) => {
  const { username, password, rsaPublicKey, encryptedPrivateKey, salt, iv } = req.body;

  if (!username || !password || !rsaPublicKey || !encryptedPrivateKey || !salt || !iv) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password for authentication
    const passwordHash = await bcrypt.hash(password, 10);

    // Save user
    const result = await run(
      `INSERT INTO users (username, password_hash, rsa_public_key, encrypted_private_key, private_key_salt, private_key_iv)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, passwordHash, rsaPublicKey, encryptedPrivateKey, salt, iv]
    );

    // Log registration
    await logEvent('USER_REGISTER', result.lastID, username, `Tenant registered successfully: ${username}`);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login Tenant
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Log login event
    await logEvent('USER_LOGIN', user.id, user.username, `Tenant logged in: ${user.username}`);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        rsaPublicKey: user.rsa_public_key,
        encryptedPrivateKey: user.encrypted_private_key,
        salt: user.private_key_salt,
        iv: user.private_key_iv
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get User Public Keys (for file sharing)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    // Return all users except the requester themselves
    const users = await all(
      'SELECT id, username, rsa_public_key, role FROM users WHERE id != ?',
      [req.user.id]
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to retrieve tenant directory' });
  }
});

// ==========================================
// FILE MANAGEMENT ENDPOINTS
// ==========================================

// Upload Encrypted File
app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
  const { filename, fileHash, mimeType, size, encryptedAesKey, iv } = req.body;

  if (!req.file || !filename || !fileHash || !mimeType || !size || !encryptedAesKey || !iv) {
    // Clean up file if uploaded
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Missing file data or metadata' });
  }

  try {
    const fileId = crypto.randomUUID();
    const storedPath = path.resolve(uploadsDir, fileId);

    // Rename file to its unique ID in uploads folder
    fs.renameSync(req.file.path, storedPath);

    // Insert into files table
    await run(
      `INSERT INTO files (id, owner_id, filename, file_hash, mime_type, size, iv)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fileId, req.user.id, filename, fileHash, mimeType, parseInt(size), iv]
    );

    // Insert original owner share (key wrapped using owner's RSA key)
    await run(
      `INSERT INTO file_shares (file_id, recipient_id, encrypted_aes_key, shared_by)
       VALUES (?, ?, ?, ?)`,
      [fileId, req.user.id, encryptedAesKey, req.user.id]
    );

    await logEvent(
      'FILE_UPLOAD',
      req.user.id,
      req.user.username,
      `Uploaded encrypted file: ${filename} (ID: ${fileId}, Hash: ${fileHash.substring(0, 10)}...)`
    );

    res.status(201).json({ message: 'File uploaded successfully', fileId });
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to store encrypted file' });
  }
});

// List Files Available to User (Owned or Shared)
app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    let files = await all(
      `SELECT DISTINCT f.id, f.filename, f.file_hash, f.mime_type, f.size, f.upload_time, f.iv,
             u.username as owner_name, fs.encrypted_aes_key, fs.shared_by, fs.permission,
             fs.recipient_id = f.owner_id as is_owner
      FROM files f
      JOIN file_shares fs ON f.id = fs.file_id
      JOIN users u ON f.owner_id = u.id
      WHERE fs.recipient_id = ?
      ORDER BY f.upload_time DESC`,
      [req.user.id]
    );

    // Auto-seed demo files if new session vault is empty
    if (files.length === 0) {
      const demoFiles = [
        {
          id: 'demo-financials-' + req.user.id,
          filename: 'secure_blueprint.png',
          file_hash: 'd2a12ff3e4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
          mime_type: 'image/png',
          size: 15420,
          iv: '000000000000000000000000',
          is_owner: 1,
          owner_name: req.user.username,
          encrypted_aes_key: 'DEMO_KEY_ENCRYPTED_ALICE',
          permission: 'full'
        },
        {
          id: 'demo-keys-' + req.user.id,
          filename: 'security_audit_log_2026.json',
          file_hash: 'e3b21aa3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1',
          mime_type: 'application/json',
          size: 8704,
          iv: '111111111111111111111111',
          is_owner: 0,
          owner_name: 'SystemAdmin',
          encrypted_aes_key: 'DEMO_KEY_ENCRYPTED_BOB',
          permission: 'read'
        }
      ];

      for (const df of demoFiles) {
        // Insert file if not already exists
        const exists = await get('SELECT id FROM files WHERE id = ?', [df.id]);
        let ownerId = req.user.id;
        
        if (!exists) {
          if (df.is_owner === 0) {
            const sys = await get('SELECT id FROM users WHERE username = ?', ['SystemAdmin']);
            if (sys) ownerId = sys.id;
            else {
              const result = await run(
                `INSERT INTO users (username, password_hash, rsa_public_key, encrypted_private_key, private_key_salt, private_key_iv, role)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['SystemAdmin', 'mock_hash', 'mock_key', 'mock_priv', 'salt', 'iv', 'Admin']
              );
              ownerId = result.lastID;
            }
          }

          await run(
            `INSERT OR IGNORE INTO files (id, owner_id, filename, file_hash, mime_type, size, iv)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [df.id, ownerId, df.filename, df.file_hash, df.mime_type, df.size, df.iv]
          );
        }

        // Insert share entry
        await run(
          `INSERT OR IGNORE INTO file_shares (file_id, recipient_id, encrypted_aes_key, shared_by, permission)
           VALUES (?, ?, ?, ?, ?)`,
          [df.id, req.user.id, df.encrypted_aes_key, ownerId, df.permission]
        );
      }

      // Re-fetch files list
      files = await all(
        `SELECT DISTINCT f.id, f.filename, f.file_hash, f.mime_type, f.size, f.upload_time, f.iv,
               u.username as owner_name, fs.encrypted_aes_key, fs.shared_by, fs.permission,
               fs.recipient_id = f.owner_id as is_owner
        FROM files f
        JOIN file_shares fs ON f.id = fs.file_id
        JOIN users u ON f.owner_id = u.id
        WHERE fs.recipient_id = ?
        ORDER BY f.upload_time DESC`,
        [req.user.id]
      );
    }

    res.json(files);
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to retrieve files' });
  }
});

// Download Encrypted File
app.get('/api/files/download/:id', authenticateToken, async (req, res) => {
  const fileId = req.params.id;

  try {
    // Check if current user has access to download this file
    const share = await get(
      'SELECT id, permission FROM file_shares WHERE file_id = ? AND recipient_id = ?',
      [fileId, req.user.id]
    );

    if (!share) {
      return res.status(403).json({ error: 'Access denied: File not shared with you' });
    }

    if (share.permission === 'read') {
      return res.status(403).json({ error: 'Access denied: Read-only permissions restrict file download.' });
    }

    const fileMeta = await get('SELECT filename FROM files WHERE id = ?', [fileId]);
    let diskFileId = fileId;
    if (fileId.startsWith('demo-financials-')) {
      diskFileId = 'demo-financials';
    } else if (fileId.startsWith('demo-keys-')) {
      diskFileId = 'demo-keys';
    }
    const filePath = path.resolve(uploadsDir, diskFileId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Encrypted file not found on disk' });
    }

    await logEvent(
      'FILE_DOWNLOAD',
      req.user.id,
      req.user.username,
      `Downloaded encrypted file: ${fileMeta.filename} (ID: ${fileId})`
    );

    // Send the encrypted file as a download
    res.download(filePath, `${fileMeta.filename}.enc`);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Share File with Another Tenant
app.post('/api/files/share', authenticateToken, async (req, res) => {
  const { fileId, recipientId, encryptedAesKey, permission } = req.body;

  if (!fileId || !recipientId || !encryptedAesKey) {
    return res.status(400).json({ error: 'Missing sharing parameters' });
  }

  const sharePermission = permission || 'full';

  try {
    // 1. Verify current user has access to share this file
    const callerShare = await get(
      'SELECT id FROM file_shares WHERE file_id = ? AND recipient_id = ?',
      [fileId, req.user.id]
    );

    if (!callerShare) {
      return res.status(403).json({ error: 'Access denied: You do not have permissions to share this file' });
    }

    // 2. Check if recipient exists
    const recipient = await get('SELECT id, username FROM users WHERE id = ?', [recipientId]);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient tenant not found' });
    }

    // 3. Check if file is already shared with recipient
    const existingShare = await get(
      'SELECT id FROM file_shares WHERE file_id = ? AND recipient_id = ?',
      [fileId, recipientId]
    );
    if (existingShare) {
      return res.status(400).json({ error: 'File is already shared with this tenant' });
    }

    // 4. Insert share entry with wrapped AES key
    await run(
      `INSERT INTO file_shares (file_id, recipient_id, encrypted_aes_key, shared_by, permission)
       VALUES (?, ?, ?, ?, ?)`,
      [fileId, recipientId, encryptedAesKey, req.user.id, sharePermission]
    );

    const fileMeta = await get('SELECT filename FROM files WHERE id = ?', [fileId]);
    await logEvent(
      'FILE_SHARE',
      req.user.id,
      req.user.username,
      `Shared file ${fileMeta.filename} with ${recipient.username} (Permission: ${sharePermission})`
    );

    res.status(201).json({ message: `File shared with ${recipient.username} successfully` });
  } catch (error) {
    console.error('Sharing error:', error);
    res.status(500).json({ error: 'Internal error during share action' });
  }
});

// ==========================================
// FORENSICS & AUDIT LOGS ENDPOINTS
// ==========================================

// Get Audit Logs
app.get('/api/audit/logs', authenticateToken, async (req, res) => {
  try {
    // Only allow Admin or Auditor role to read logs, but for demo let's allow all users to read
    const logs = await all('SELECT * FROM audit_logs ORDER BY id DESC');
    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve audit log ledger' });
  }
});

// Verify Audit Logs Chain
app.get('/api/audit/verify', authenticateToken, async (req, res) => {
  try {
    const report = await verifyAuditChain();
    res.json(report);
  } catch (error) {
    console.error('Verify ledger error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// SIMULATE DB TAMPERING (Demonstration Tool for Presentation)
app.post('/api/audit/tamper', authenticateToken, async (req, res) => {
  try {
    // Fetch a random log entry to alter details
    const randomLog = await get('SELECT id, details FROM audit_logs ORDER BY id DESC LIMIT 1');
    if (!randomLog) {
      return res.status(400).json({ error: 'No logs available to tamper' });
    }

    const tamperedDetails = randomLog.details + ' [MODIFIED BY UNPAID BAD ACTOR]';
    
    // Bypass constraints and directly edit log content in database without updating hash
    await run(
      'UPDATE audit_logs SET details = ? WHERE id = ?',
      [tamperedDetails, randomLog.id]
    );

    res.json({
      message: `Successfully tampered with Log ID: ${randomLog.id}. Try verifying the ledger now!`,
      tamperedLogId: randomLog.id
    });
  } catch (error) {
    console.error('Tampering simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate tampering' });
  }
});

app.listen(PORT, () => {
  console.log(`Cloud Vault Backend running on port ${PORT}`);
});
