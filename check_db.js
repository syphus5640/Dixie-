import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const admin = createClient(url, key);

async function check() {
  const { data, error } = await admin.from('agents').select('*');
  console.log("agents:", data);
  console.log("error:", error);
  
  const { data: d2, error: e2 } = await admin.from('user_agents').select('*');
  console.log("user_agents:", d2);
  console.log("error2:", e2);
}

check();
