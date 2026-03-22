import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const admin = createClient(url, key);

async function run() {
  const { data, error } = await admin.from('agents').select('*').limit(1);
  console.log('agents:', data ? (data[0] ? Object.keys(data[0]) : 'empty') : error);
  const { data: d2, error: e2 } = await admin.from('user_agents').select('*').limit(1);
  console.log('user_agents:', d2 ? (d2[0] ? Object.keys(d2[0]) : 'empty') : e2);
}
run();
