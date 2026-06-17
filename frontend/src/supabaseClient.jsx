import { createClient } from '@supabase/supabase-js';

// Use the public URL and ANON key from your Supabase Dashboard
// NOT the Service Role Key (that should only be used in the backend)
// Change your import line to this:
const supabaseUrl = (import.meta.env).VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta.env ).VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);