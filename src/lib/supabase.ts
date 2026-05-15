import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === '' || supabaseAnonKey === '') {
  console.error('Supabase credentials ARE EMPTY STRINGS! Check Vercel Settings.');
} else {
  console.log('Supabase keys detected, length:', supabaseUrl.length, supabaseAnonKey.length);
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
