import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL ou ANON KEY não configurados. Verifique seu .env/Vercel.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
