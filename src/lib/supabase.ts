import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing in Vercel! Go to Vercel Settings > Environment Variables and add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
} else {
  console.log('Supabase initialized with URL:', supabaseUrl.substring(0, 15) + '...');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
