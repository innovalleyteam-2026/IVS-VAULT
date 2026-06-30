import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Middleware Configuration
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://secure.innovalley.in',
    'https://ivs-vault-v.vercel.app',
    'https://ivs-vault-2le55qscg-innovalleyteam-6905s-projects.vercel.app'
  ],
  credentials: true
}));

// ==========================================
// SUPABASE DATABASE INITIALIZATION
// ==========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Global safety check middleware to prevent crashes if keys are uninitialized
app.use('/api', (req, res, next) => {
  if (!supabase) {
    return res.status(500).json({ 
      error: "Database client failed to initialize configuration parameters.",
      diagnostics: { 
        supabaseUrlPresent: !!supabaseUrl, 
        supabaseServiceKeyPresent: !!supabaseServiceKey
      }
    });
  }
  next();
});

// ==========================================
// CRYPTOGRAPHY VAULT ENGINE (AES-256-CBC)
// ==========================================
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

const getSecretKeyBuffer = () => {
  const secret = process.env.MASTER_CRYPTO_PASS_KEY || 'default-fallback-super-secret-key-32';
  return crypto.createHash('sha256').update(String(secret).trim()).digest();
};

const decryptPassword = (encryptedText) => {
  if (!encryptedText) return null;
  try {
    const [ivHex, encryptedData] = encryptedText.split(':');
    if (!ivHex || !encryptedData) return null;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, getSecretKeyBuffer(), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return '[Decryption Failure]';
  }
};

// ==========================================
// ROUTE ENDPOINTS
// ==========================================

// --- PROJECTS PIPELINES ROUTING ---
app.get('/api/projects', async (req, res) => {
  try {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- STAFF EMPLOYEE & MANAGEMENT CHANNELS ---
app.get('/api/employees', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('*').neq('role', 'Client');
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clients', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('*, projects(name)').eq('role', 'Client');
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export the app using standard ES module syntax
export default app;