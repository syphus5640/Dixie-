import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('agents').select('*').limit(1);
  console.log('Agents error:', error);
  console.log('Agents data:', data);
  
  const { data: ua, error: uae } = await supabase.from('user_agents').select('*').limit(1);
  console.log('User Agents error:', uae);
  console.log('User Agents data:', ua);
}
run();
