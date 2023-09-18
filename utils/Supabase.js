import { createClient } from '@supabase/supabase-js';

let supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY);

export default supabaseClient;