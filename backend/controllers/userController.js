// backend/controllers/userController.js
import { createClient } from '@supabase/supabase-js';

// Use the Service Role Key (ONLY IN BACKEND)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const createUser = async (req, res) => {
  const { email, password, fullName, role } = req.body;

  // 1. Create the Auth User
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for internal use
  });

  if (authError) return res.status(400).json({ error: authError.message });

  // 2. Create the Profile record with the specific Role
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([{ id: authData.user.id, full_name: fullName, role: role }]);

  if (profileError) return res.status(400).json({ error: profileError.message });

  res.status(200).json({ message: "User provisioned successfully" });
};