import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://secure.innovalley.in',
    'https://ivs-vault-v.vercel.app'
  ],
  credentials: true
}));

// Initialize Supabase using the environment keys pulled directly from Vercel settings
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const getSecretKeyBuffer = () => {
  const secret = process.env.MASTER_CRYPTO_PASS_KEY || 'default-fallback-super-secret-key-32';
  return crypto.createHash('sha256').update(String(secret).trim()).digest();
};

const encryptPassword = (text) => {
  if (!text) return null;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getSecretKeyBuffer(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    return null;
  }
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

// --- ROUTES ---
app.get('/api/projects', async (req, res) => {
  try {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { name, client_name, status, start_date, due_date, description, remarks, email, phone, comments } = req.body;
    const { data, error } = await supabase.from('projects').insert([{
      name, client_name, status, start_date, due_date, description, remarks, email, phone, comments, created_at: new Date()
    }]).select();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:projectId/credentials', async (req, res) => {
  try {
    const { data, error } = await supabase.from('credentials').select('*').eq('project_id', req.params.projectId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/credentials', async (req, res) => {
  try {
    const { project_id, title, category, login_url, auth_type, email, username, plain_password, remarks, client_visible, expiry_date } = req.body;
    const securedPassword = encryptPassword(plain_password);

    const { data, error } = await supabase.from('credentials').insert([{
      project_id, title, category, login_url, auth_type, email, username, encrypted_password: securedPassword, remarks, client_visible, expiry_date, created_at: new Date()
    }]).select();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/credentials/:id/decrypt', async (req, res) => {
  try {
    const { masterKey } = req.body;
    if (masterKey !== process.env.MASTER_CLEARANCE_TOKEN) {
      return res.status(403).json({ error: 'Invalid master passphrase clearance.' });
    }

    const { data, error } = await supabase.from('credentials').select('encrypted_password').eq('id', req.params.id).single();
    if (error || !data) return res.status(400).json({ error: 'Record location failed.' });

    const decrypted = decryptPassword(data.encrypted_password);
    res.json({ data: { password: decrypted } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.get('/api/projects/:projectId/shares', async (req, res) => {
  try {
    const { data, error } = await supabase.from('project_shares').select('*, profiles(full_name, role)').eq('project_id', req.params.projectId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/project-shares', async (req, res) => {
  try {
    const { project_id, profile_id, can_view, can_edit_credentials, can_edit_notes, can_edit_files } = req.body;
    const { data, error } = await supabase.from('project_shares').upsert({
      project_id, profile_id, can_view, can_edit_credentials, can_edit_notes, can_edit_files, updated_at: new Date()
    }, { onConflict: 'project_id,profile_id' }).select();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/renewals', async (req, res) => {
  try {
    const { data, error } = await supabase.from('reminders').select('*').order('expiry_date', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:projectId/reminders', async (req, res) => {
  try {
    const { data, error } = await supabase.from('reminders').select('*').eq('project_id', req.params.projectId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reminders', async (req, res) => {
  try {
    const { project_id, title, type, expiry_date, reminder_days } = req.body;
    const { data, error = null } = await supabase.from('reminders').insert([{
      project_id, title, type, expiry_date, reminder_days, created_at: new Date()
    }]).select();
    res.status(201).json({ data: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:projectId/files', async (req, res) => {
  try {
    const { data, error } = await supabase.from('files').select('*').eq('project_id', req.params.projectId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/files', async (req, res) => {
  try {
    const { project_id, name, file_type, client_visible, file_data } = req.body;
    const { data, error } = await supabase.from('files').insert([{
      project_id, name, file_type, client_visible, file_data, created_at: new Date()
    }]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:projectId/notes', async (req, res) => {
  try {
    const { data, error } = await supabase.from('notes').select('*').eq('project_id', req.params.projectId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { project_id, title, content, client_visible, tags } = req.body;
    const { data, error } = await supabase.from('notes').insert([{
      project_id, title, content, client_visible, tags, created_at: new Date()
    }]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profiles/:id', async (req, res) => {
  try {
    const { role, associated_project_id, full_name } = req.body;
    const { data, error } = await supabase.from('profiles').update({ role, associated_project_id, updated_at: new Date() }).eq('id', req.params.id).select();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;