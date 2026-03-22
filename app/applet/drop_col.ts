import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const admin = createClient(url, key);

async function run() {
  const { error } = await admin.rpc('exec_sql', { query: `
    ALTER TABLE agents DROP COLUMN IF EXISTS is_admin_only;
    ALTER TABLE user_agents DROP COLUMN IF EXISTS is_admin_only;
  ` });
  console.log('Drop column result:', error ? error : 'Success');
}
run();
