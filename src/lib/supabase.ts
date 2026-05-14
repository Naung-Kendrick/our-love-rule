import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://voilkhdihifooooprtud.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OMlC-s1d6orGEm-1owMxeg_N1fkGeX-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
