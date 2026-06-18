import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from backend/.env
dotenv.config();

const app = express();

// Set high weight processing thresholds to prevent 413 attachment crashes
app.use(cors({ origin: 'http://localhost:5173' }));
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

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Cryptography Engine Helpers (AES-256-CBC)
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const getSecretKeyBuffer = () => {
  const secret = process.env.VAULT_ENCRYPTION_SECRET;
  return crypto.createHash('sha256').update(secret || 'fallback-secret-key').digest();
};

const encrypt = (plainText) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getSecretKeyBuffer(), iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    throw new Error("System encryption malfunction: " + err.message);
  }
};

const decrypt = (cipherText) => {
  try {
    const [ivHex, encryptedHex] = cipherText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, getSecretKeyBuffer(), iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return "**********";
  }
};

// ==========================================
// 1. PROJECTS ENDPOINTS
// ==========================================

app.get('/api/projects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { name, client_name, status, start_date, due_date, description, remarks } = req.body;
    if (!name || !client_name) {
      return res.status(400).json({ error: 'Project Name and Client Name are required.' });
    }

    const projectPayload = {
      name: name.trim(),
      client_name: client_name.trim(),
      status: status || 'Active',
      start_date: start_date && start_date !== "" ? start_date : null,
      due_date: due_date && due_date !== "" ? due_date : null,
      description: description && description !== "" ? description : null,
      remarks: remarks && remarks !== "" ? remarks : null
    };

    const { data, error } = await supabase
      .from('projects')
      .insert([projectPayload])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. CREDENTIALS ENDPOINTS (WITH CLIENT VISIBILITY)
// ==========================================

app.get('/api/projects/:projectId/credentials', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('credentials')
      .select('id, project_id, title, category, login_url, auth_type, email, username, remarks, expiry_date, client_visible')
      .eq('project_id', req.params.projectId);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/credentials', async (req, res) => {
  try {
    const { project_id, title, category, login_url, auth_type, email, username, plain_password, remarks, expiry_date, client_visible } = req.body;
    if (!project_id || !title || !category || !plain_password) {
      return res.status(400).json({ error: 'Missing required credential fields.' });
    }
    
    const secureHexPayload = encrypt(plain_password);

    const credentialPayload = { 
      project_id, 
      title, 
      category, 
      login_url: login_url && login_url !== "" ? login_url : null, 
      auth_type: auth_type || 'Password', 
      email: email && email !== "" ? email : null, 
      username: username && username !== "" ? username : null, 
      encrypted_password: secureHexPayload, 
      remarks: remarks && remarks !== "" ? remarks : null, 
      expiry_date: expiry_date && expiry_date !== "" ? expiry_date : null,
      client_visible: !!client_visible
    };

    const { data, error } = await supabase
      .from('credentials')
      .insert([credentialPayload])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/credentials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, login_url, auth_type, email, username, plain_password, remarks, expiry_date, client_visible } = req.body;

    const updatePayload = {
      title: title?.trim(),
      category,
      auth_type: auth_type || 'Password',
      login_url: login_url && login_url !== "" ? login_url : null,
      email: email && email !== "" ? email : null,
      username: username && username !== "" ? username : null,
      remarks: remarks && remarks !== "" ? remarks : null,
      expiry_date: expiry_date && expiry_date !== "" ? expiry_date : null,
      client_visible: !!client_visible
    };

    if (plain_password && plain_password.trim() !== "" && !plain_password.startsWith("••••••••")) {
      updatePayload.encrypted_password = encrypt(plain_password);
    }

    const { data, error } = await supabase
      .from('credentials')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/credentials/:id/decrypt', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: cred, error } = await supabase
      .from('credentials')
      .select('encrypted_password')
      .eq('id', id).single();
    if (error || !cred) return res.status(404).json({ error: 'Record not found.' });

    const unmaskedText = decrypt(cred.encrypted_password);
    res.json({ password: unmaskedText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. NOTES ENDPOINTS
// ==========================================

app.get('/api/projects/:projectId/notes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('project_id', req.params.projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { project_id, title, content, tags, client_visible } = req.body;
    const { data, error } = await supabase
      .from('notes')
      .insert([{ project_id, title, content, tags: tags && tags !== "" ? tags : null, client_visible: !!client_visible }])
      .select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags, client_visible } = req.body;

    const { data, error } = await supabase
      .from('notes')
      .update({
        title: title?.trim(),
        content: content?.trim(),
        tags: tags && tags.trim() !== "" ? tags.trim() : null,
        client_visible: !!client_visible
      })
      .eq('id', id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. REMINDERS & RENEWALS ENDPOINTS
// ==========================================

app.get('/api/renewals', async (req, res) => {
  try {
    const { data, error } = await supabase.from('reminders').select('*').order('expiry_date', { ascending: true });
    res.json(data || []);
  } catch {
    res.json([]);
  }
});

app.get('/api/projects/:projectId/reminders', async (req, res) => {
  try {
    const { data, error } = await supabase.from('reminders').select('*').eq('project_id', req.params.projectId);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reminders', async (req, res) => {
  try {
    const { project_id, title, type, expiry_date, reminder_days } = req.body;
    const { data, error } = await supabase
      .from('reminders')
      .insert([{ project_id, title, type, expiry_date, reminder_days: parseInt(reminder_days) || 30 }])
      .select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/reminders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, expiry_date, reminder_days } = req.body;

    const { data, error } = await supabase
      .from('reminders')
      .update({
        title: title?.trim(),
        type,
        expiry_date,
        reminder_days: parseInt(reminder_days) || 30
      })
      .eq('id', id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. FILE STORAGE ENTRIES ENDPOINTS
// ==========================================

app.get('/api/projects/:projectId/files', async (req, res) => {
  try {
    const { data, error } = await supabase.from('files').select('*').eq('project_id', req.params.projectId);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/files', async (req, res) => {
  try {
    const { project_id, name, file_type, file_data, client_visible } = req.body;
    const { data, error } = await supabase
      .from('files')
      .insert([{ project_id, name, file_type, file_data: file_data || null, client_visible: !!client_visible }])
      .select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, file_type, client_visible } = req.body;
    const { data, error } = await supabase
      .from('files')
      .update({ name, file_type, client_visible: !!client_visible })
      .eq('id', id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. PROFILES / USERS ENDPOINTS
// ==========================================

app.get('/api/profiles', async (req, res) => {
  try {
    const { role } = req.query;
    let dbQuery = supabase.from('profiles').select('*, projects(name)');
    
    if (role) {
      dbQuery = dbQuery.eq('role', role);
    }
    
    const { data, error } = await dbQuery;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profiles/:id', async (req, res) => {
  try {
    const { role, associated_project_id, full_name } = req.body;
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role, 
        associated_project_id: associated_project_id || null,
        full_name 
      })
      .eq('id', req.params.id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. V2 GRANULAR WORKSPACE SHARING ENDPOINTS
// ==========================================

// ==========================================
// NEW: SHADOW SHARE ENDPOINTS (Bypassing UUID constraints)
// ==========================================

app.get('/api/projects/:projectId/shares', async (req, res) => {
  try {
    const { projectId } = req.params;
    // We fetch from the new text-friendly table
    const { data, error } = await supabase
      .from('text_shares')
      .select('*')
      .eq('project_id', projectId);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/project-shares', async (req, res) => {
  try {
    const { project_id, profile_id, can_view, can_edit_credentials, can_edit_notes, can_edit_files } = req.body;
    
    // Upsert into the text_shares table (No foreign key validation)
    const { data, error } = await supabase
      .from('text_shares')
      .upsert({
        project_id,
        profile_id,
        can_view: !!can_view,
        can_edit_credentials: !!can_edit_credentials,
        can_edit_notes: !!can_edit_notes,
        can_edit_files: !!can_edit_files
      }, { onConflict: 'project_id,profile_id' })
      .select();

    if (error) {
        console.error("DEBUG: Share insert failed:", error);
        return res.status(400).json({ error: error.message });
    }
    res.status(200).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NEW: EMPLOYEES ENDPOINTS
// ==========================================

// GET: Fetch all registered company staff members
app.get('/api/employees', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Modify specific employee tier permissions or attributes
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { role, department, full_name } = req.body;
    const { data, error } = await supabase
      .from('employees')
      .update({ role, department, full_name, updated_at: new Date() })
      .eq('id', req.params.id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NEW: CLIENTS ENDPOINTS
// ==========================================

// GET: Fetch all active portal clients along with joined project data
app.get('/api/clients', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*, projects(name)')
      .order('full_name', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Map or update client project assignments and profile metrics
app.put('/api/clients/:id', async (req, res) => {
  try {
    const { associated_project_id, full_name, company_name, phone_number } = req.body;
    const { data, error } = await supabase
      .from('clients')
      .update({ 
        associated_project_id: associated_project_id || null, 
        full_name, 
        company_name,
        phone_number,
        updated_at: new Date() 
      })
      .eq('id', req.params.id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.get('/api/employees-with-shares', async (req, res) => {
  try {
    // 1. Get all employees
    const { data: employees, error: empErr } = await supabase.from('employees').select('*');
    if (empErr) throw empErr;

    // 2. Get all shares
    const { data: shares, error: shareErr } = await supabase.from('text_shares').select('profile_id, project_id');
    if (shareErr) throw shareErr;

    // 3. Get all project names
    const { data: projects, error: projErr } = await supabase.from('projects').select('id, name');
    if (projErr) throw projErr;

    // 4. Merge data
    const result = employees.map(emp => {
      const empShares = shares.filter(s => s.profile_id === emp.id);
      const assignedProjects = empShares.map(s => {
        const proj = projects.find(p => p.id === s.project_id);
        return proj ? proj.name : "Unknown Project";
      });
      return { ...emp, assigned_projects: assignedProjects };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Bind Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Unified V2 Vault CRM Server listening on port ${PORT}`);
});