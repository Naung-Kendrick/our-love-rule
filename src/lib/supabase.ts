import { createClient } from '@supabase/supabase-js';

<<<<<<< HEAD
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
=======
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://voilkhdihifooooprtud.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OMlC-s1d6orGEm-1owMxeg_N1fkGeX-';
>>>>>>> 093e8b7787917cdfbd41ca546e177acda1c3ae4f

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
