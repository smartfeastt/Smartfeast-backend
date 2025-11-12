import { createClient } from "@supabase/supabase-js";
import { loadEnv } from './loadenv.js';

loadEnv();


const supabaseUrl = process.env.supabase_url;
const supabaseKey = process.env.supabase_service_secret;//bypasses rls
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
