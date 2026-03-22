
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config(); // Try root first
dotenv.config({ path: path.join(__dirname, '.env') }); // Then try server folder

const isProd = process.env.NODE_ENV === 'production';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Make io accessible globally or pass it to routes
global.io = io;

io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('[SOCKET] Client disconnected:', socket.id);
  });
});

const PORT = 3001;

/**
 * SECURE CREDENTIAL MANAGEMENT
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const retellApiKey = process.env.RETELL_API_KEY;

// Queue processing state
let lastCallTimestamp = 0;
const CALL_DELAY_MS = 3 * 60 * 1000; // 3 minutes
const CALL_WINDOW_START_HOUR = 10;
const CALL_WINDOW_END_HOUR = 17; // 5 PM

const isWithinCallWindow = () => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= CALL_WINDOW_START_HOUR && hour < CALL_WINDOW_END_HOUR;
};

const processCallQueue = async () => {
  try {
    const now = Date.now();
    if (now - lastCallTimestamp < CALL_DELAY_MS) return;
    if (!isWithinCallWindow()) return;

    const admin = getSupabaseAdmin();
    
    // Get the next pending call
    const { data: nextCall, error: fetchError } = await admin
      .from('call_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fetchError || !nextCall) return;

    console.log(`[QUEUE] Processing call for ${nextCall.phone_number} (User: ${nextCall.user_id})`);
    
    // Update status to 'calling'
    await admin
      .from('call_queue')
      .update({ status: 'calling', processed_at: new Date().toISOString() })
      .eq('id', nextCall.id);

    lastCallTimestamp = Date.now();

    const webhookUrl = process.env.N8N_OUTBOUND_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error("N8N_OUTBOUND_WEBHOOK_URL not configured");
    }

    // Trigger the call via n8n
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: nextCall.user_id,
        agent_id: nextCall.agent_id,
        agent_phone: nextCall.agent_phone,
        phone_numbers: [nextCall.phone_number] // Send as array of one for compatibility
      })
    });

    if (!n8nResponse.ok) {
      const errText = await n8nResponse.text();
      throw new Error(`n8n trigger failed: ${errText}`);
    }

    // Update status to 'completed'
    await admin
      .from('call_queue')
      .update({ status: 'completed' })
      .eq('id', nextCall.id);

    console.log(`[QUEUE] Successfully triggered call for ${nextCall.phone_number}`);
  } catch (error) {
    console.error("[QUEUE] Error processing call queue:", error.message);
    // If we had a specific call, mark it as failed
    // We'd need to track which call failed in the catch block if we wanted to be precise
  }
};

// Start the queue worker
setInterval(processCallQueue, 10000); // Check every 10 seconds

let supabaseAdmin = null;

const getSupabaseAdmin = () => {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key || url.includes('your-project-id')) {
    throw new Error("Supabase credentials missing or invalid in environment variables.");
  }

  supabaseAdmin = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return supabaseAdmin;
};

const ensureAdminColumns = async (admin) => {
  try {
    await admin.rpc('exec_sql', { query: `
      ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
      ALTER TABLE IF EXISTS "Profiles" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
      ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS is_employee BOOLEAN DEFAULT FALSE;
      ALTER TABLE IF EXISTS "Profiles" ADD COLUMN IF NOT EXISTS is_employee BOOLEAN DEFAULT FALSE;
      ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS employee_id TEXT;
      ALTER TABLE IF EXISTS "Profiles" ADD COLUMN IF NOT EXISTS employee_id TEXT;
      ALTER TABLE IF EXISTS agents ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
      ALTER TABLE IF EXISTS "Agents" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
      ALTER TABLE IF EXISTS user_agents ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
      ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE IF EXISTS "Profiles" ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS script TEXT;
      ALTER TABLE IF EXISTS "Profiles" ADD COLUMN IF NOT EXISTS script TEXT;
      NOTIFY pgrst, 'reload schema';
    ` });
    
    // Auto-promote the owner to admin
    await admin.from('profiles').update({ is_admin: true }).in('email', ['kev.stanchev@gmail.com']);
    await admin.from('Profiles').update({ is_admin: true }).in('email', ['kev.stanchev@gmail.com']);

    // Sync emails from auth.users to profiles if missing
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers();
    if (!listError && users) {
      for (const u of users) {
        await admin.from('profiles').update({ email: u.email }).eq('id', u.id);
        await admin.from('Profiles').update({ email: u.email }).eq('id', u.id);
      }
    }
  } catch (e) {
    console.warn("[SERVER] Failed to ensure columns:", e.message);
  }
};

const checkIsAdmin = async (admin, user) => {
  if (!user) return false;
  
  const userEmail = user.email?.toLowerCase();
  if (userEmail === 'kev.stanchev@gmail.com') {
    return true;
  }

  try {
    let { data: profile, error } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(`[SERVER] checkIsAdmin profile fetch error for ${user.id}:`, error.message);
      const { data: retryProfile, error: retryError } = await admin.from('Profiles').select('is_admin').eq('id', user.id).limit(1).maybeSingle();
      if (retryError) {
        console.warn(`[SERVER] checkIsAdmin Profiles fetch error for ${user.id}:`, retryError.message);
      }
      if (retryProfile) profile = retryProfile;
    }

    if (!profile) return false;
    return profile.is_admin === true || profile.is_admin === 'true' || profile.is_admin === 1 || profile.is_admin === '1' || profile.is_admin === 't';
  } catch (err) {
    console.error(`[SERVER] checkIsAdmin unexpected error for ${user.id}:`, err);
    return false;
  }
};

const getGoogleCalendar = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  console.log("[CALENDAR] Checking credentials...");
  console.log(`[CALENDAR] CLIENT_ID: ${clientId ? 'Present' : 'Missing'}`);
  console.log(`[CALENDAR] CLIENT_SECRET: ${clientSecret ? 'Present' : 'Missing'}`);
  console.log(`[CALENDAR] REFRESH_TOKEN: ${refreshToken ? 'Present (length: ' + refreshToken.length + ')' : 'Missing'}`);
  console.log(`[CALENDAR] CALENDAR_ID: ${process.env.GOOGLE_CALENDAR_ID || 'primary (default)'}`);

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn("[CALENDAR] Missing credentials: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN");
    return null;
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    return google.calendar({
      version: "v3",
      auth: oauth2Client
    });
  } catch (error) {
    console.error("[CALENDAR] Initialization Error:", error.message);
    return null;
  }
};

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[SERVER] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const validateAgentId = (id) => {
  if (!id || typeof id !== 'string') return false;
  const agentIdRegex = /^[a-zA-Z0-9_-]+$/;
  return agentIdRegex.test(id);
};

// API Routes
app.get('/api/config', (req, res) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  res.json({
    supabaseUrl: url,
    supabaseAnonKey: key,
    supabaseServiceKey: key // provide both for compatibility
  });
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, metadata } = req.body;
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) throw error;

    // Create profile entry
    if (data.user) {
      const { error: profileError } = await admin
        .from('profiles')
        .insert([{
          id: data.user.id,
          email: email,
          first_name: metadata.first_name,
          last_name: metadata.last_name,
          business_name: metadata.business_name,
          business_address: metadata.business_address,
          phone: metadata.phone
        }]);
      
      if (profileError) {
        console.error("Profile creation error:", profileError);
        // We don't throw here to allow the user to still be created
      }
    }

    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Sync email to profile if missing
    if (data.user) {
      await admin.from('profiles').update({ email: email }).eq('id', data.user.id);
    }

    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email } = req.body;
  try {
    const admin = getSupabaseAdmin();
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const { data, error } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/profile/update', async (req, res) => {
  const { updates } = req.body;
  const authHeader = req.headers.authorization;
  
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the user's token
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { data, error } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/delete-account', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.error("[SERVER] Delete account: No auth header");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      console.error("[SERVER] Delete account: Invalid session", authError);
      throw new Error("Invalid session. Please sign in again.");
    }

    console.log(`[SERVER] Termination request for: ${user.email || user.id}`);

    console.log(`[SERVER] Purging all data for user: ${user.id}`);

    // 1.5. Fetch user's agents to clear dynamic tables
    try {
      const { data: userAgents } = await admin
        .from('agents')
        .select('id, agent_id')
        .eq('user_id', user.id);
      
      if (userAgents && userAgents.length > 0) {
        console.log(`[SERVER] Found ${userAgents.length} agents for user. Clearing dynamic tables...`);
        for (const agent of userAgents) {
          const possibleNames = [
            agent.agent_id,
            agent.id,
            `agent_${agent.agent_id}`,
            `agent_${agent.id}`,
            (agent.agent_id || '').toLowerCase(),
            (agent.id || '').toLowerCase()
          ].filter(Boolean);

          for (const tableName of [...new Set(possibleNames)]) {
            try {
              // Try to delete rows where user_id matches, or just clear the table if it's agent-specific
              // We'll try both common patterns
              await admin.from(tableName).delete().eq('user_id', user.id);
              await admin.from(tableName).delete().eq('id', user.id);
            } catch (e) {
              // Ignore errors for dynamic tables
            }
          }
        }
      }
    } catch (e) {
      console.warn("[SERVER] Failed to fetch user agents for dynamic purge:", e);
    }

    // 2. Delete dependent records across all known and potential tables
    // ORDER MATTERS: Delete leaf/join tables first to satisfy FK constraints
    const tables = [
      // Join / Leaf tables first
      { name: 'user_agents', userField: 'user_id' },
      { name: 'user_reviews', userField: 'user_id' },
      { name: 'user_profiles', userField: 'user_id' },
      { name: 'user_settings', userField: 'user_id' },
      { name: 'user_data', userField: 'user_id' },
      { name: 'user_stats', userField: 'user_id' },
      { name: 'user_activity', userField: 'user_id' },
      { name: 'user_logs', userField: 'user_id' },
      { name: 'user_calls', userField: 'user_id' },
      { name: 'user_messages', userField: 'user_id' },
      { name: 'user_notifications', userField: 'user_id' },
      { name: 'user_metadata', userField: 'user_id' },
      
      // Feature tables
      { name: 'reviews', userField: 'user_id' },
      { name: 'Reviews', userField: 'user_id' },
      { name: 'messages', userField: 'user_id' },
      { name: 'calls', userField: 'user_id' },
      { name: 'logs', userField: 'user_id' },
      { name: 'notifications', userField: 'user_id' },
      { name: 'Agent ID', userField: 'user_id' },
      
      // Main entity tables
      { name: 'agents', userField: 'user_id' },
      { name: 'Agents', userField: 'user_id' },
      { name: 'projects', userField: 'user_id' },
      { name: 'assets', userField: 'user_id' },
      
      // Identity / Profile tables last
      { name: 'profiles', userField: 'id' },
      { name: 'Profiles', userField: 'id' },
      { name: 'users', userField: 'id' },
      { name: 'account', userField: 'id' },
      { name: 'accounts', userField: 'id' }
    ];

    console.log(`[SERVER] Starting sequential purge of ${tables.length} potential tables...`);

    for (const table of tables) {
      try {
        // Try deleting by the specified field
        await admin.from(table.name).delete().eq(table.userField, user.id);
        
        // Also try common alternatives to be absolutely sure
        if (table.userField !== 'id') {
          await admin.from(table.name).delete().eq('id', user.id);
        }
        if (table.userField !== 'user_id') {
          await admin.from(table.name).delete().eq('user_id', user.id);
        }
        if (table.userField !== 'owner_id') {
          await admin.from(table.name).delete().eq('owner_id', user.id);
        }
      } catch (e) {
        // Ignore errors for non-existent tables or missing columns
      }
    }
    
    // 2.5 Extra step: Try to clear any table that might be named 'user_<uuid>'
    try {
      await admin.from(`user_${user.id}`).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {}
    
    // 3. Delete user from auth (Admin action)
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("[SERVER] Auth deletion error:", deleteError.message);
      throw new Error(`Critical failure during account removal: ${deleteError.message}`);
    }

    console.log(`[SERVER] Account successfully terminated: ${user.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error("[SERVER] Delete account final catch:", error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/reviews', async (req, res) => {
  try {
    const admin = getSupabaseAdmin();
    
    // Fetch reviews joined with profiles
    const { data, error } = await admin
      .from('reviews')
      .select(`
        *,
        profiles:user_id (
          id,
          first_name,
          last_name,
          business_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("[SERVER] Reviews fetch error:", error);
      // Handle missing table gracefully
      if (error.code === '42P01' || error.message?.includes('schema cache')) {
        return res.status(404).json({ error: "Table 'reviews' not found." });
      }
      throw error;
    }
    
    res.json(data || []);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/reviews/submit', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { rating, content, review_id } = req.body;

    if (review_id) {
      // Update existing review
      const { data, error } = await admin
        .from('reviews')
        .update({
          rating,
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', review_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } else {
      // Create new review
      const { data, error } = await admin
        .from('reviews')
        .insert([{
          user_id: user.id,
          rating,
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const reviewId = req.params.id;
    console.log(`[SERVER] Attempting to delete review ${reviewId} for user ${user.id}`);

    // Try lowercase 'reviews' first
    let { error, count } = await admin
      .from('reviews')
      .delete({ count: 'exact' })
      .eq('id', reviewId)
      .eq('user_id', user.id);

    // Fallback to capitalized 'Reviews' if table not found
    if (error && (error.code === '42P01' || error.message?.includes('schema cache'))) {
      console.log("[SERVER] Table 'reviews' not found, trying 'Reviews'");
      const retry = await admin
        .from('Reviews')
        .delete({ count: 'exact' })
        .eq('id', reviewId)
        .eq('user_id', user.id);
      error = retry.error;
      count = retry.count;
    }

    if (error) {
      console.error("[SERVER] Delete review error:", error);
      throw error;
    }

    console.log(`[SERVER] Delete result: ${count} rows affected`);
    res.json({ success: true, affected: count ?? 0 });
  } catch (error) {
    console.error("[SERVER] Delete review catch:", error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/user/profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    // Robust table fetch for 'profiles'
    let { data, error } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && (error.code === '42P01' || error.message?.includes('schema cache'))) {
      // Try capitalized 'Profiles'
      const retry = await admin.from('Profiles').select('*').eq('id', user.id).single();
      if (!retry.error) {
        data = retry.data;
        error = null;
      }
    }

    if (error) {
      console.error("[SERVER] Profile fetch error:", error);
      const isMissing = error.code === '42P01' || error.code === '42703' || error.message?.includes('schema cache');
      if (isMissing) {
        return res.status(404).json({ 
          error: `Table 'profiles' not found in Supabase. Please ensure you have a 'profiles' or 'Profiles' table.`,
          code: error.code 
        });
      }
      throw error;
    }
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/user/script', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { script } = req.body;

    const { data, error } = await admin
      .from('profiles')
      .update({ script })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/user/agents', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    // Check if user is admin
    const isAdmin = await checkIsAdmin(admin, user);

    // Ensure columns exist
    if (isAdmin) {
      try {
        await admin.rpc('exec_sql', { query: `
          ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
          ALTER TABLE IF EXISTS "Profiles" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
          ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS is_employee BOOLEAN DEFAULT FALSE;
          ALTER TABLE IF EXISTS "Profiles" ADD COLUMN IF NOT EXISTS is_employee BOOLEAN DEFAULT FALSE;
          ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS employee_id TEXT;
          ALTER TABLE IF EXISTS "Profiles" ADD COLUMN IF NOT EXISTS employee_id TEXT;
          ALTER TABLE IF EXISTS agents ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
          ALTER TABLE IF EXISTS "Agents" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
          ALTER TABLE IF EXISTS user_agents ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
          ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS email TEXT;
          ALTER TABLE IF EXISTS "Profiles" ADD COLUMN IF NOT EXISTS email TEXT;
          ALTER TABLE IF EXISTS agents DROP COLUMN IF EXISTS is_admin_only;
          ALTER TABLE IF EXISTS "Agents" DROP COLUMN IF EXISTS is_admin_only;
          ALTER TABLE IF EXISTS user_agents DROP COLUMN IF EXISTS is_admin_only;
          ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS is_admin_only;
          ALTER TABLE IF EXISTS "Profiles" DROP COLUMN IF EXISTS is_admin_only;
          NOTIFY pgrst, 'reload schema';
        ` });
        
        // Auto-promote the owner to admin
        await admin.from('profiles').update({ is_admin: true }).in('email', ['kev.stanchev@gmail.com']);
      } catch (e) {
        console.warn("[SERVER] Failed to ensure columns:", e);
      }
    }

    const adminMode = req.query.admin_mode === 'true';

    if (isAdmin && adminMode) {
      // Admin Mode: Show ONLY admin agents in the system to all admins
      // This allows all admin agents to be synced and managed between all admin accounts
      let dbAgents = [];
      let fetchError = null;
      
      const [agentsRes, userAgentsRes, capAgentsRes] = await Promise.all([
        admin.from('agents').select('*').eq('is_admin', true),
        admin.from('user_agents').select('*').eq('is_admin', true),
        admin.from('Agents').select('*').eq('is_admin', true)
      ]);
      
      if (!agentsRes.error && agentsRes.data) dbAgents.push(...agentsRes.data);
      else if (agentsRes.error && agentsRes.error.code !== '42P01' && !agentsRes.error.message?.includes('schema cache')) fetchError = agentsRes.error;
      
      if (!userAgentsRes.error && userAgentsRes.data) dbAgents.push(...userAgentsRes.data);
      else if (userAgentsRes.error && userAgentsRes.error.code !== '42P01' && !userAgentsRes.error.message?.includes('schema cache')) fetchError = fetchError || userAgentsRes.error;
      
      if (!capAgentsRes.error && capAgentsRes.data) dbAgents.push(...capAgentsRes.data);
      else if (capAgentsRes.error && capAgentsRes.error.code !== '42P01' && !capAgentsRes.error.message?.includes('schema cache')) fetchError = fetchError || capAgentsRes.error;

      if (dbAgents.length === 0 && fetchError) {
        console.error("[SERVER] Admin agents fetch error:", fetchError);
        if (fetchError.code === '42703') {
          return res.status(404).json({ 
            error: `The 'is_admin' column is missing from your agents table. Please run the following SQL in your Supabase SQL Editor: ALTER TABLE agents ADD COLUMN is_admin BOOLEAN DEFAULT FALSE; ALTER TABLE user_agents ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;`
          });
        }
        return res.status(400).json({ error: fetchError.message });
      }

      // Deduplicate
      const uniqueAgentsMap = new Map();
      dbAgents.forEach(a => uniqueAgentsMap.set(a.id, a));
      dbAgents = Array.from(uniqueAgentsMap.values());

      // Fetch profiles to attach owner_info
      if (dbAgents && dbAgents.length > 0) {
        const userIds = [...new Set(dbAgents.map(a => a.user_id))];
        let { data: profilesData } = await admin
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
          
        if (!profilesData) {
          const retryProfiles = await admin
            .from('Profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds);
          profilesData = retryProfiles.data;
        }

        if (profilesData) {
          const profileMap = {};
          profilesData.forEach(p => {
            profileMap[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unknown User';
          });
          dbAgents = dbAgents.map(agent => ({
            ...agent,
            owner_info: profileMap[agent.user_id] || 'Unknown User'
          }));
        }
      }

      return res.json(dbAgents || []);
    }

    // Robust table fetch for 'agents'
    let dbAgents = [];
    let fetchError = null;
    
    const [res1, res2, res3] = await Promise.all([
      admin.from('agents').select('*').eq('user_id', user.id).eq('is_admin', false),
      admin.from('user_agents').select('*').eq('user_id', user.id).eq('is_admin', false),
      admin.from('Agents').select('*').eq('user_id', user.id).eq('is_admin', false)
    ]);
    
    // Owners should always see their own agents, even if they are marked as is_admin
    if (!res1.error && res1.data) dbAgents.push(...res1.data);
    else if (res1.error && res1.error.code !== '42P01' && !res1.error.message?.includes('schema cache')) fetchError = res1.error;
    
    if (!res2.error && res2.data) dbAgents.push(...res2.data);
    else if (res2.error && res2.error.code !== '42P01' && !res2.error.message?.includes('schema cache')) fetchError = fetchError || res2.error;
    
    if (!res3.error && res3.data) dbAgents.push(...res3.data);
    else if (res3.error && res3.error.code !== '42P01' && !res3.error.message?.includes('schema cache')) fetchError = fetchError || res3.error;
    
    if (dbAgents.length === 0 && fetchError) {
      console.error("[SERVER] Agents fetch error:", fetchError);
      const isMissing = fetchError.code === '42P01' || fetchError.code === '42703' || fetchError.message?.includes('schema cache');
      if (isMissing) {
        return res.status(404).json({ 
          error: `Table 'agents' not found in Supabase. Please ensure you have an 'agents' or 'Agents' table.`,
          code: fetchError.code
        });
      }
      throw fetchError;
    }
    
    // Deduplicate
    const uniqueAgentsMap = new Map();
    dbAgents.forEach(a => uniqueAgentsMap.set(a.id, a));
    dbAgents = Array.from(uniqueAgentsMap.values());
    
    res.json(dbAgents);
  } catch (error) {
    console.error("[SERVER] Agents route catch:", error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/admin/profiles', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const isAdmin = await checkIsAdmin(admin, user);
    if (!isAdmin) return res.status(403).json({ error: "Forbidden" });

    // Ensure columns exist before fetching
    await ensureAdminColumns(admin);

    const { data: profiles, error } = await admin
      .from('profiles')
      .select('*');

    if (error) {
      const retry = await admin.from('Profiles').select('*');
      if (retry.error) throw retry.error;
      return res.json(retry.data || []);
    }
    
    res.json(profiles || []);
  } catch (error) {
    console.error("[SERVER] Admin profiles fetch error:", error);
    res.status(500).json({ error: error.message || JSON.stringify(error) });
  }
});

app.post('/api/admin/profiles/:id/toggle-admin', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const isAdmin = await checkIsAdmin(admin, user);
    if (!isAdmin) return res.status(403).json({ error: "Forbidden" });

    // Ensure columns exist before update
    await ensureAdminColumns(admin);

    const { is_admin } = req.body;
    console.log(`[SERVER] Toggling admin for ${req.params.id} to ${is_admin}`);

    let { error } = await admin
      .from('profiles')
      .update({ is_admin })
      .eq('id', req.params.id);

    if (error) {
      console.warn(`[SERVER] Toggle admin 'profiles' error:`, error.message);
      const retry = await admin.from('Profiles').update({ is_admin }).eq('id', req.params.id);
      if (retry.error) {
        console.error(`[SERVER] Toggle admin 'Profiles' error:`, retry.error.message);
        throw retry.error;
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("[SERVER] Admin toggle error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/profiles/:id/toggle-employee', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const isAdmin = await checkIsAdmin(admin, user);
    if (!isAdmin) return res.status(403).json({ error: "Forbidden" });

    // Ensure columns exist before update
    await ensureAdminColumns(admin);

    const { is_employee } = req.body;
    console.log(`[SERVER] Toggling employee for ${req.params.id} to ${is_employee}`);
    
    let updateData = { is_employee };

    if (is_employee) {
      // Generate employee ID if not present
      let { data: profile, error: fetchError } = await admin.from('profiles').select('employee_id').eq('id', req.params.id).maybeSingle();
      
      if (fetchError || !profile) {
        const retryFetch = await admin.from('Profiles').select('employee_id').eq('id', req.params.id).maybeSingle();
        if (retryFetch.data) profile = retryFetch.data;
      }

      if (!profile?.employee_id) {
        const empId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
        updateData.employee_id = empId;
      }
    }

    let { error } = await admin
      .from('profiles')
      .update(updateData)
      .eq('id', req.params.id);

    if (error) {
      console.warn(`[SERVER] Toggle employee 'profiles' error:`, error.message);
      const retry = await admin.from('Profiles').update(updateData).eq('id', req.params.id);
      if (retry.error) {
        console.error(`[SERVER] Toggle employee 'Profiles' error:`, retry.error.message);
        throw retry.error;
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("[SERVER] Admin toggle employee error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to get tomorrow's date at the same time
const getTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString();
};

app.post('/api/user/agents', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { agent_nickname, retell_agent_id, agent_type, agent_phone, admin_mode } = req.body;

    // Check if user is admin
    let { data: profile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const retryProfile = await admin.from('Profiles').select('is_admin').eq('id', user.id).single();
      if (retryProfile.data) profile = retryProfile.data;
    }

    let isAdmin = profile?.is_admin === true || profile?.is_admin === 'true';
    const userEmail = user.email?.toLowerCase();
    if (userEmail === 'kev.stanchev@gmail.com') {
      isAdmin = true;
    }

    // If admin and admin_mode is on, try to create the table if it doesn't exist
    if (isAdmin && (admin_mode === true || admin_mode === 'true') && retell_agent_id) {
      const tableName = retell_agent_id.toLowerCase().startsWith('agent_') 
        ? retell_agent_id.toLowerCase() 
        : `agent_${retell_agent_id.toLowerCase()}`;
      
      console.log(`[SERVER] Admin ${user.email} deploying agent. Attempting to ensure table ${tableName} exists...`);
      
      const { error: checkError } = await admin.from(tableName).select('Call Ids').limit(1);
      
      if (checkError && (checkError.code === '42P01' || checkError.message?.includes('schema cache'))) {
        console.log(`[SERVER] Table ${tableName} missing. Attempting creation via exec_sql...`);
        
        const createSql = `CREATE TABLE IF NOT EXISTS "${tableName}" ("Call Ids" text, "created_at" timestamptz DEFAULT now());`;
        const { error: rpcError } = await admin.rpc('exec_sql', { query: createSql });
        
        if (rpcError) {
          console.error(`[SERVER] Failed to create table via RPC:`, JSON.stringify(rpcError, null, 2));
          
          const setupSql = `
-- Run this in your Supabase SQL Editor to enable automatic table creation:
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;`.trim();

          return res.status(400).json({ 
            error: `Infrastructure table '${tableName}' could not be created automatically.`,
            details: "The 'exec_sql' function might be missing or misconfigured in your Supabase project.",
            action: "Please run the following SQL in your Supabase SQL Editor to enable this feature:",
            setupSql: setupSql,
            tableSql: createSql
          });
        }
        console.log(`[SERVER] Table ${tableName} created successfully.`);
      }
    }
    
    // Try 'agents' first
    let { data, error } = await admin
      .from('agents')
      .insert([{
        user_id: user.id,
        agent_nickname,
        retell_agent_id,
        agent_type: agent_type || 'inbound',
        agent_phone,
        is_admin: isAdmin && (admin_mode === true || admin_mode === 'true')
      }])
      .select()
      .single();

    if (error && (error.code === '42P01' || error.message?.includes('schema cache'))) {
      // Try 'user_agents'
      const retry = await admin
        .from('user_agents')
        .insert([{
          user_id: user.id,
          agent_nickname,
          retell_agent_id,
          agent_type: agent_type || 'inbound',
          agent_phone,
          is_admin: isAdmin && (admin_mode === true || admin_mode === 'true')
        }])
        .select()
        .single();
      
      if (!retry.error) {
        data = retry.data;
        error = null;
      } else if (retry.error && (retry.error.code === '42P01' || retry.error.message?.includes('schema cache'))) {
        // Try 'Agents'
        const retryAgents = await admin
          .from('Agents')
          .insert([{
            user_id: user.id,
            agent_nickname,
            retell_agent_id,
            agent_type: agent_type || 'inbound',
            agent_phone,
            is_admin: isAdmin && (admin_mode === true || admin_mode === 'true')
          }])
          .select()
          .single();
        
        if (!retryAgents.error) {
          data = retryAgents.data;
          error = null;
        }
      }
    }

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/user/agents/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { updates, admin_mode } = req.body;

    // Check if user is admin
    let { data: profile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const retryProfile = await admin.from('Profiles').select('is_admin').eq('id', user.id).single();
      if (retryProfile.data) profile = retryProfile.data;
    }

    let isAdmin = profile?.is_admin === true || profile?.is_admin === 'true';
    const userEmail = user.email?.toLowerCase();
    if (userEmail === 'kev.stanchev@gmail.com') {
      isAdmin = true;
    }

    // If admin and admin_mode is on, try to create the table if it doesn't exist
    if (isAdmin && (admin_mode === true || admin_mode === 'true') && updates?.retell_agent_id) {
      const tableName = updates.retell_agent_id.toLowerCase().startsWith('agent_') 
        ? updates.retell_agent_id.toLowerCase() 
        : `agent_${updates.retell_agent_id.toLowerCase()}`;
      
      console.log(`[SERVER] Admin ${user.email} updating agent. Attempting to ensure table ${tableName} exists...`);
      const { error: checkError } = await admin.from(tableName).select('Call Ids').limit(1);
      
      if (checkError && (checkError.code === '42P01' || checkError.message?.includes('schema cache'))) {
        const createSql = `CREATE TABLE IF NOT EXISTS "${tableName}" ("Call Ids" text, "created_at" timestamptz DEFAULT now());`;
        await admin.rpc('exec_sql', { query: createSql });
      }
    }
    
    // Ensure agent_type is handled if present in updates
    const finalUpdates = { ...updates };
    if (admin_mode !== undefined) {
      finalUpdates.is_admin = isAdmin && (admin_mode === true || admin_mode === 'true');
    }
    
    // Try 'agents'
    let query = admin.from('agents').update(finalUpdates).eq('id', req.params.id);
    if (!(isAdmin && (admin_mode === true || admin_mode === 'true'))) {
      query = query.eq('user_id', user.id);
    }
    let { data, error } = await query.select().single();

    if (error && (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('schema cache'))) {
      // Try 'user_agents'
      let retryQuery = admin.from('user_agents').update(finalUpdates).eq('id', req.params.id);
      if (!(isAdmin && (admin_mode === true || admin_mode === 'true'))) {
        retryQuery = retryQuery.eq('user_id', user.id);
      }
      const retry = await retryQuery.select().single();
      
      if (!retry.error) {
        data = retry.data;
        error = null;
      } else if (retry.error && (retry.error.code === '42P01' || retry.error.code === 'PGRST116' || retry.error.message?.includes('schema cache'))) {
        // Try 'Agents'
        let retryAgentsQuery = admin.from('Agents').update(finalUpdates).eq('id', req.params.id);
        if (!(isAdmin && (admin_mode === true || admin_mode === 'true'))) {
          retryAgentsQuery = retryAgentsQuery.eq('user_id', user.id);
        }
        const retryAgents = await retryAgentsQuery.select().single();
        if (!retryAgents.error) {
          data = retryAgents.data;
          error = null;
        }
      }
    }

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/user/agents/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    // 1. Check if user is admin
    let { data: profile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const retryProfile = await admin.from('Profiles').select('is_admin').eq('id', user.id).single();
      if (retryProfile.data) profile = retryProfile.data;
    }

    const { admin_mode } = req.body;
    let isAdmin = profile?.is_admin === true || profile?.is_admin === 'true';
    const userEmail = user.email?.toLowerCase();
    if (userEmail === 'kev.stanchev@gmail.com') {
      isAdmin = true;
    }

    // 2. Fetch the agent to get retell_agent_id
    let agentToDelete = null;
    
    // Try 'agents'
    const { data: agentData } = await admin.from('agents').select('*').eq('id', req.params.id).single();
    if (agentData) {
      agentToDelete = agentData;
    } else {
      // Try 'user_agents'
      const { data: userAgentData } = await admin.from('user_agents').select('*').eq('id', req.params.id).single();
      if (userAgentData) {
        agentToDelete = userAgentData;
      } else {
        // Try 'Agents'
        const { data: capAgentData } = await admin.from('Agents').select('*').eq('id', req.params.id).single();
        if (capAgentData) agentToDelete = capAgentData;
      }
    }

    if (!agentToDelete) {
      const retellId = req.params.id;
      if (isAdmin && (admin_mode === true || admin_mode === 'true')) {
        const tableName = retellId.toLowerCase().startsWith('agent_') ? retellId.toLowerCase() : `agent_${retellId.toLowerCase()}`;
        console.log(`[SERVER] Admin ${user.email} deleting infrastructure for ${tableName}`);
        await admin.rpc('exec_sql', { query: `DROP TABLE IF EXISTS "${tableName}";` });
        
        await Promise.all([
          admin.from('agents').delete().eq('retell_agent_id', retellId),
          admin.from('user_agents').delete().eq('retell_agent_id', retellId),
          admin.from('Agents').delete().eq('retell_agent_id', retellId)
        ]);
        
        return res.json({ success: true, message: "Infrastructure and associated records removed." });
      }
      throw new Error("Agent not found");
    }

    const retellAgentId = agentToDelete.retell_agent_id;

    // 3. If admin and admin_mode is on, drop the infrastructure table
    if (isAdmin && (admin_mode === true || admin_mode === 'true') && retellAgentId) {
      const tableName = retellAgentId.toLowerCase().startsWith('agent_') 
        ? retellAgentId.toLowerCase() 
        : `agent_${retellAgentId.toLowerCase()}`;
      
      console.log(`[SERVER] Admin ${user.email} dropping table ${tableName}`);
      const { error: dropError } = await admin.rpc('exec_sql', { query: `DROP TABLE IF EXISTS "${tableName}";` });
      if (dropError) {
        console.error(`[SERVER] Failed to drop table ${tableName}:`, dropError);
      }

      // Delete ALL rows with this retell_agent_id across the system
      await Promise.all([
        admin.from('agents').delete().eq('retell_agent_id', retellAgentId),
        admin.from('user_agents').delete().eq('retell_agent_id', retellAgentId),
        admin.from('Agents').delete().eq('retell_agent_id', retellAgentId)
      ]);
    } else {
      // Standard user delete - only their own row
      await Promise.all([
        admin.from('agents').delete().eq('id', req.params.id).eq('user_id', user.id),
        admin.from('user_agents').delete().eq('id', req.params.id).eq('user_id', user.id),
        admin.from('Agents').delete().eq('id', req.params.id).eq('user_id', user.id)
      ]);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/update-user', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { currentPassword, updates } = req.body;
    
    // Verify current password
    const { error: signInError } = await admin.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });
    
    if (signInError) throw new Error("Current password verification failed.");

    const { data, error } = await admin.auth.admin.updateUserById(user.id, updates);
    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/database/fetch-rows', async (req, res) => {
  let { agent_id } = req.query;
  
  try {
    const admin = getSupabaseAdmin();
    if (!agent_id || !validateAgentId(agent_id)) {
      return res.status(400).json({ error: "Invalid or missing Agent ID." });
    }
    
    const normalizedAgentId = agent_id.toLowerCase();

    const tryFetch = async (tableName) => {
      const columns = ['created_at', 'start_timestamp', 'timestamp', 'start_time'];
      for (const col of columns) {
        const { data, error } = await admin.from(tableName).select('*').order(col, { ascending: false }).limit(50);
        if (!error) return { data, error: null };
        if (error.code !== '42703') return { data, error };
      }
      return await admin.from(tableName).select('*').limit(50);
    };

    let { data, error } = await tryFetch(normalizedAgentId);
    
    if (error && (error.code === '42P01' || error.message?.includes('schema cache'))) {
      if (normalizedAgentId.startsWith('agent_')) {
        const strippedId = normalizedAgentId.replace('agent_', '');
        const retry = await tryFetch(strippedId);
        data = retry.data;
        error = retry.error;
      } else {
        const prefixedId = `agent_${normalizedAgentId}`;
        const retry = await tryFetch(prefixedId);
        if (!retry.error) {
          data = retry.data;
          error = null;
        }
      }
    }

    if (error && (error.code === '42P01' || error.message?.includes('schema cache'))) {
      const { data: fallbackData, error: fallbackError } = await admin
        .from('Agent ID')
        .select('*')
        .or(`agent_id.eq.${agent_id},agent_id.eq.${normalizedAgentId}`)
        .limit(50);
      
      if (!fallbackError) {
        data = fallbackData;
        error = null;
      }
    }

    if (error) {
      console.error(`[DB ERROR]:`, error);
      const isMissing = error.code === '42P01' || error.message?.includes('schema cache');
      return res.status(isMissing ? 404 : 500).json({ error: error.message });
    }
    res.json(data || []);
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
});

app.post('/api/retell/create-web-call', async (req, res) => {
  const { agent_id } = req.body;
  if (!retellApiKey) return res.status(500).json({ error: "RETELL_API_KEY is missing in environment variables." });
  const targetAgentId = agent_id || process.env.RETELL_DEMO_AGENT_ID;
  try {
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${retellApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: targetAgentId })
    });
    res.status(response.status).json(await response.json());
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/retell/get-agent/:agent_id', async (req, res) => {
  const { agent_id } = req.params;
  if (!retellApiKey) return res.status(500).json({ error: "RETELL_API_KEY is missing in environment variables." });
  
  try {
    console.log(`[SERVER] Fetching Retell agent: ${agent_id}`);
    
    let response = await fetch(`https://api.retellai.com/v2/get-agent/${agent_id}`, { 
      headers: { 'Authorization': `Bearer ${retellApiKey}` } 
    });
    
    if (response.status === 404) {
      console.log(`[SERVER] Retell V2 get-agent 404, trying legacy endpoint...`);
      response = await fetch(`https://api.retellai.com/get-agent/${agent_id}`, { 
        headers: { 'Authorization': `Bearer ${retellApiKey}` } 
      });
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`[SERVER] Retell API Error (${response.status}):`, data);
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) { 
    console.error("[SERVER] Retell Fetch Error:", error);
    res.status(500).json({ error: error.message }); 
  }
});

app.get('/api/retell/get-call/:call_id', async (req, res) => {
  const { call_id } = req.params;
  if (!retellApiKey) return res.status(500).json({ error: "RETELL_API_KEY is missing in environment variables." });
  try {
    const normalizedCallId = call_id.toLowerCase();
    const response = await fetch(`https://api.retellai.com/v2/get-call/${normalizedCallId}`, { headers: { 'Authorization': `Bearer ${retellApiKey}` } });
    res.status(response.status).json(await response.json());
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/database/check-table', async (req, res) => {
  let { agent_id } = req.body;
  try {
    const admin = getSupabaseAdmin();
    if (!agent_id) return res.status(400).json({ error: "Agent ID is required." });
    
    const nid = agent_id.toLowerCase();
    
    const { error: err1 } = await admin.from(nid).select('*').limit(1);
    if (!err1) return res.json({ exists: true });
    
    if (nid.startsWith('agent_')) {
      const stripped = nid.replace('agent_', '');
      const { error: err2 } = await admin.from(stripped).select('*').limit(1);
      if (!err2) return res.json({ exists: true });
    } else {
      const prefixed = `agent_${nid}`;
      const { error: err3 } = await admin.from(prefixed).select('*').limit(1);
      if (!err3) return res.json({ exists: true });
    }

    return res.status(404).json({ exists: false, error: "Infrastructure table not found." });
  } catch (err) { 
    console.error("[CHECK TABLE ERROR]:", err);
    res.status(500).json({ error: err.message }); 
  }
});

// Outbound Call Trigger
app.post('/api/outbound/trigger', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { agent_id, phone_numbers, agent_phone } = req.body;
    
    if (!agent_id || !phone_numbers || !Array.isArray(phone_numbers)) {
      return res.status(400).json({ error: "Missing agent_id or phone_numbers array" });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('monthly_limit')
      .eq('id', user.id)
      .single();
    
    const limit = profile?.monthly_limit || 100;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: currentUsage } = await admin
      .from('call_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());
    
    const remaining = limit - (currentUsage || 0);

    if (phone_numbers.length > remaining) {
      return res.status(400).json({ 
        error: `Monthly limit exceeded. You have ${remaining} calls left this month, but tried to queue ${phone_numbers.length}.` 
      });
    }

    console.log(`[SERVER] Queueing ${phone_numbers.length} outbound calls for user ${user.id}`);

    const queueEntries = phone_numbers.map(num => ({
      user_id: user.id,
      agent_id,
      agent_phone,
      phone_number: num,
      status: 'pending',
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await admin
      .from('call_queue')
      .insert(queueEntries);

    if (insertError) throw insertError;

    res.json({ success: true, message: `${phone_numbers.length} calls added to the priority queue.` });
  } catch (error) {
    console.error("[SERVER] Outbound trigger error:", error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/outbound/queue-status', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { agent_id } = req.query;

    const { data: profile } = await admin
      .from('profiles')
      .select('monthly_limit')
      .eq('id', user.id)
      .single();
    
    const limit = profile?.monthly_limit || 100;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: currentUsage } = await admin
      .from('call_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    let statsQuery = admin
      .from('call_queue')
      .select('status', { count: 'exact' })
      .eq('user_id', user.id);
    
    if (agent_id) {
      statsQuery = statsQuery.eq('agent_id', agent_id);
    }

    const { data: userStats, error: statsError } = await statsQuery;

    if (statsError) throw statsError;

    const userPending = userStats.filter((c) => c.status === 'pending').length;
    const userCompleted = userStats.filter((c) => c.status === 'completed').length;
    const userTotal = userStats.length;

    const { count: totalPending, error: totalError } = await admin
      .from('call_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (totalError) throw totalError;

    let oldestQuery = admin
      .from('call_queue')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('status', 'pending');
    
    if (agent_id) {
      oldestQuery = oldestQuery.eq('agent_id', agent_id);
    }

    const { data: oldestPending } = await oldestQuery
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    let position = 0;
    if (oldestPending) {
      const { count } = await admin
        .from('call_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('created_at', oldestPending.created_at);
      position = (count || 0) + 1;
    }

    const totalCallsAhead = (position > 0 ? position - 1 : 0) + userPending;
    const etaMinutes = totalCallsAhead * 3;

    const now = new Date();
    const currentHour = now.getHours();
    let windowMessage = null;
    if (currentHour < 10) {
      windowMessage = "Queue paused until 10:00 AM";
    } else if (currentHour >= 17) {
      windowMessage = "Queue paused until 10:00 AM tomorrow";
    }

    res.json({
      userProgress: {
        completed: userCompleted,
        pending: userPending,
        total: userTotal
      },
      monthlyUsage: {
        limit,
        used: currentUsage || 0,
        remaining: limit - (currentUsage || 0)
      },
      queuePosition: position,
      totalPendingInSystem: totalPending,
      etaMinutes,
      windowMessage
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/availability', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Date is required" });

  const calendar = getGoogleCalendar();
  if (!calendar) return res.json({ busy: [] });

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busySlots = response.data.calendars?.[calendarId]?.busy || [];
    res.json({ busy: busySlots });
  } catch (error) {
    console.error("[AVAILABILITY] Error fetching busy slots:", error.message);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

app.post('/api/book', async (req, res) => {
  const { name, email, date, time, type, businessName, phone, company, industry, otherIndustry } = req.body;
  
  try {
    console.log(`[BOOKING] New request for ${type} from ${email}`);
    
    if (!email || !email.includes('@')) {
      throw new Error("A valid email address is required for booking.");
    }

    let calendarEventId = null;
    const calendar = getGoogleCalendar();
    
    if (calendar) {
      try {
        const dateTime = new Date(date);
        
        if (isNaN(dateTime.getTime())) {
          throw new Error(`Invalid date provided: ${date}`);
        }

        const endDateTime = new Date(dateTime.getTime() + 3600000); // 1 hour duration

        const event = {
          summary: `Consultation: ${name}`,
          description: `Business: ${businessName || company || 'N/A'}\nIndustry: ${industry === 'Other' ? otherIndustry : industry}\nClient: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nType: ${type}`,
          start: {
            dateTime: dateTime.toISOString(),
          },
          end: {
            dateTime: endDateTime.toISOString(),
          },
          conferenceData: {
            createRequest: {
              requestId: `booking-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        };

        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
        console.log(`[BOOKING] Using Calendar ID: ${calendarId}`);
        
        let gRes;
        try {
          gRes = await calendar.events.insert({
            calendarId,
            requestBody: event,
            conferenceDataVersion: 1,
            sendUpdates: 'all'
          });
        } catch (confError) {
          console.info(`[BOOKING] Note: Google Meet link could not be created (${confError.message}). Saving event without link.`);
          const { conferenceData, ...eventWithoutConf } = event;
          gRes = await calendar.events.insert({
            calendarId,
            requestBody: eventWithoutConf,
            sendUpdates: 'all'
          });
        }
        
        calendarEventId = gRes.data.id;
        console.log(`[BOOKING] Google Calendar event created successfully: ${calendarEventId}`);
      } catch (gError) {
        console.error("[BOOKING] Google Calendar Error:", gError.message);
      }
    }

    const webhookUrl = type === 'website' 
      ? process.env.N8N_WEBSITE_WEBHOOK_URL 
      : process.env.N8N_WEBHOOK_URL;

    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      console.warn(`[BOOKING] Invalid or missing webhook URL for ${type}: "${webhookUrl}"`);
      return res.json({ 
        success: true, 
        message: 'Booking received (webhook skipped due to invalid configuration)',
        calendarEventId 
      });
    }

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        phone,
        businessName: businessName || company,
        industry,
        otherIndustry,
        date,
        time,
        type,
        calendarEventId,
        timestamp: new Date().toISOString()
      })
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      throw new Error(`n8n webhook failed: ${errorText}`);
    }

    res.json({ 
      success: true, 
      calendarEventId,
      calendarSync: !!calendarEventId 
    });
  } catch (error) {
    console.error("[BOOKING] Error creating booking:", error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/cancel-booking', async (req, res) => {
  const { bookingId, email } = req.body;

  if (!bookingId && !email) {
    return res.status(400).json({ error: 'Booking ID or Email is required' });
  }

  console.log(`[CANCEL] Request received for ID: ${bookingId}, Email: ${email}`);

  try {
    const calendar = getGoogleCalendar();
    if (calendar && bookingId) {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      console.log(`[CANCEL] Attempting to delete event ${bookingId} from calendar ${calendarId}`);
      
      try {
        await calendar.events.delete({
          calendarId,
          eventId: bookingId,
          sendUpdates: 'all'
        });
        console.log(`[CANCEL] Google Calendar event ${bookingId} deleted successfully.`);
      } catch (gError) {
        console.error("[CANCEL] Google Calendar Delete Error:", gError.message);
        // If it's a 404/410, the event is already gone, which is fine
        if (gError.code !== 404 && gError.code !== 410) {
          console.warn("[CANCEL] Non-critical calendar error, continuing with spreadsheet update.");
        }
      }
    }

    // Update spreadsheet
    try {
      const { headers, leads } = await getLeadsData();
      
      const findKey = (base) => {
        const idx = findBestColumnIndex(headers, base);
        return idx !== -1 ? headers[idx] : base;
      };

      const eventIdKey = findKey('event_id');
      const emailKey = findKey('email');
      
      // Try to find by event_id first, then by email
      let lead = null;
      if (bookingId) {
        lead = leads.find(l => l[eventIdKey] === bookingId);
      }
      
      if (!lead && email) {
        lead = leads.find(l => (l[emailKey] || '').toLowerCase() === email.toLowerCase());
      }
      
      if (lead) {
        console.log(`[CANCEL] Found lead at row ${lead._rowIndex}. Updating status to not_interested.`);
        const sheets = getSheetsClient();
        const spreadsheetId = getSheetId();
        
        const updates = [];
        const updateField = (fieldName, value) => {
          const idx = findBestColumnIndex(headers, fieldName);
          if (idx !== -1) {
            const col = getColumnLetter(idx);
            updates.push({
              range: `Leads!${col}${lead._rowIndex}`,
              values: [[value]]
            });
          }
        };

        updateField('status', 'not_interested');
        updateField('notes', (lead.notes ? lead.notes + '\n' : '') + `Demo cancelled on ${new Date().toLocaleString()}`);
        updateField('callback_date', '');
        updateField('event_id', '');
        updateField('demo_date', '');
        updateField('demo_time', '');

        if (updates.length > 0) {
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            requestBody: {
              valueInputOption: 'USER_ENTERED',
              data: updates
            }
          });
          console.log(`[CANCEL] Successfully updated spreadsheet for lead ${lead.email || bookingId}`);
        }
      } else {
        console.warn(`[CANCEL] Could not find lead in spreadsheet for ID: ${bookingId} or Email: ${email}`);
      }
    } catch (sheetError) {
      console.error("[CANCEL] Error updating spreadsheet:", sheetError.message);
    }

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error("[CANCEL] Error in cancel-booking route:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Calling Dashboard API ---

function getSheetsClient() {
  if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
    throw new Error("Google Sheets credentials not configured.");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function getSheetId() {
  if (!process.env.GOOGLE_SHEET_ID) throw new Error("Google Sheet ID not configured.");
  return process.env.GOOGLE_SHEET_ID;
}

// Helper to ensure 'Called By' column exists in Leads sheet
async function ensureCalledByColumn() {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = getSheetId();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Leads!A1:Z1',
    });
    const headers = response.data.values?.[0] || [];
    const normalizedHeaders = headers.map(h => (h || '').toLowerCase().trim().replace(/[\s-_]+/g, '_'));
    
    if (!normalizedHeaders.includes('called_by')) {
      console.log("[CALLING] Adding 'Called By' column to Leads sheet...");
      const nextColIdx = headers.length;
      const colLetter = getColumnLetter(nextColIdx);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Leads!${colLetter}1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Called By']]
        }
      });
    }
  } catch (error) {
    console.error("[CALLING] Error ensuring 'Called By' column:", error.message);
  }
}

// Helper to get all leads
async function getLeadsData() {
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Leads!A:Z',
  });
  const rows = response.data.values;
  if (!rows || rows.length === 0) return { headers: [], leads: [] };
  
  // Normalize headers: lowercase, trim, and replace spaces/dashes with underscores
  const headers = rows[0].map(h => (h || '').toLowerCase().trim().replace(/[\s-_]+/g, '_'));
  const leads = rows.slice(1).map((row, index) => {
    const lead = { _rowIndex: index + 2 }; // +2 for 1-based index and header row
    headers.forEach((header, i) => {
      if (header) {
        lead[header] = row[i] || '';
      }
    });
    return lead;
  });
  return { headers, leads };
}

function getColumnLetter(index) {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function findBestColumnIndex(headers, fieldName) {
  const normalizedSearch = fieldName.toLowerCase().replace(/[\s-_]+/g, '_');
  
  // 1. Try exact match
  let idx = headers.indexOf(normalizedSearch);
  if (idx !== -1) return idx;
  
  // 2. Try exact match with original headers (case insensitive)
  idx = headers.findIndex(h => h.toLowerCase() === normalizedSearch);
  if (idx !== -1) return idx;

  // 3. Try partial match
  idx = headers.findIndex(h => h === normalizedSearch || h.includes(normalizedSearch));
  if (idx !== -1) return idx;

  // 4. Special cases for common variations
  if (normalizedSearch === 'callback_date') {
    const altIdx = headers.findIndex(h => h === 'callback' || h === 'call_back' || h === 'callback_time' || h.includes('callback'));
    if (altIdx !== -1) return altIdx;
  }
  if (normalizedSearch === 'assigned_to') {
    const altIdx = headers.findIndex(h => h === 'assigned' || h === 'agent' || h === 'employee' || h === 'caller' || h.includes('assigned'));
    if (altIdx !== -1) return altIdx;
  }
  if (normalizedSearch === 'next_call_date') {
    const altIdx = headers.findIndex(h => h === 'next_call' || h === 'follow_up' || h.includes('next_call'));
    if (altIdx !== -1) return altIdx;
  }
  if (normalizedSearch === 'called_by') {
    const altIdx = headers.findIndex(h => h === 'called' || h === 'caller' || h === 'employee_id' || h.includes('called'));
    if (altIdx !== -1) return altIdx;
  }
  
  return -1;
};

// 1. Get all niches
app.get('/api/calling/niches', async (req, res) => {
  try {
    const { leads } = await getLeadsData();
    const niches = [...new Set(leads.map(l => l.niche).filter(Boolean))];
    res.json(niches);
  } catch (error) {
    console.error("[CALLING] Error fetching niches:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Get next lead for a niche
app.post('/api/calling/next-lead', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { niche } = req.body;
    if (!niche) return res.status(400).json({ error: "Niche is required" });

    const { headers, leads } = await getLeadsData();
    const now = new Date();

    // Fetch user profile to get employee_id
    const { data: profile } = await admin.from('profiles').select('employee_id').eq('id', user.id).single();
    const userIdentifier = profile?.employee_id || user.email;

    // Find all available leads
    const availableLeads = leads.filter(l => {
      if (l.niche !== niche) return false;
      if (l.status !== 'new' && l.status !== 'no_answer') return false;
      
      // Check next_call_date
      if (l.next_call_date) {
        const nextCall = new Date(l.next_call_date);
        if (nextCall > now) return false;
      }
      
      // Check if not assigned or assigned to current user (check both email and ID for backward compatibility)
      if (l.assigned_to && l.assigned_to !== user.email && l.assigned_to !== profile?.employee_id) return false;
      
      return true;
    });

    if (availableLeads.length === 0) {
      return res.json({ lead: null });
    }

    // Pick a random lead from the available ones to reduce collision chances
    const randomIndex = Math.floor(Math.random() * availableLeads.length);
    const availableLead = availableLeads[randomIndex];

    // Lock the lead
    const sheets = getSheetsClient();
    const spreadsheetId = getSheetId();
    
    const assignedToIndex = findBestColumnIndex(headers, 'assigned_to');
    
    if (assignedToIndex !== -1) {
      const columnLetter = getColumnLetter(assignedToIndex);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Leads!${columnLetter}${availableLead._rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[userIdentifier]]
        }
      });
      availableLead.assigned_to = userIdentifier;
    }

    res.json({ lead: availableLead });
  } catch (error) {
    console.error("[CALLING] Error fetching next lead:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Update lead status
app.post('/api/calling/update-lead', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { rowIndex, status, nextCallDate, callbackDate, notes, eventId, demoDate, demoTime } = req.body;
    if (!rowIndex || !status) return res.status(400).json({ error: "Row index and status are required" });

    // Ensure 'Called By' column exists
    await ensureCalledByColumn();

    const { headers, leads } = await getLeadsData();
    const currentLead = leads.find(l => l._rowIndex === rowIndex);
    const leadEmail = currentLead ? currentLead[findBestColumnIndex(headers, 'email')] : 'unknown';

    const sheets = getSheetsClient();
    const spreadsheetId = getSheetId();

    // Prepare updates
    const updates = [];
    
    const updateField = (fieldName, value) => {
      const idx = findBestColumnIndex(headers, fieldName);
      
      if (idx !== -1 && value !== undefined) {
        const col = getColumnLetter(idx);
        
        // Format dates for Google Sheets readability
        let finalValue = value;
        if (fieldName.includes('date') && value && typeof value === 'string' && value.includes('T')) {
          try {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
              // Format as YYYY-MM-DD HH:mm:ss
              finalValue = d.toISOString().replace('T', ' ').split('.')[0];
            }
          } catch (e) {
            // fallback to original
          }
        }

        console.log(`[CALLING] Updating field "${fieldName}" (column ${col}) to: ${finalValue}`);
        updates.push({
          range: `Leads!${col}${rowIndex}`,
          values: [[finalValue]]
        });
      } else {
        console.warn(`[CALLING] Could not find column for field: ${fieldName}`);
      }
    };

    const { data: profile } = await admin.from('profiles').select('employee_id').eq('id', user.id).single();
    const userIdentifier = profile?.employee_id || user.email;

    updateField('notes', notes);
    updateField('called_by', userIdentifier); // Track who called them
    
    if (status === 'no_answer') {
      const tomorrowISO = getTomorrow();
      // User requested: "if the employee ... presses no answer it should clear there employee id form the assigned to section in the spreadsheet, so that others can call"
      updateField('status', 'no_answer');
      updateField('next_call_date', tomorrowISO);
      updateField('assigned_to', ''); // Clear assignment
    } else if (status === 'callback') {
      updateField('status', 'callback');
      console.log(`[CALLING] Processing callback for date: ${callbackDate}`);
      updateField('callback_date', callbackDate);
      updateField('assigned_to', userIdentifier); // keep locked
      if (eventId !== undefined) updateField('event_id', eventId);
      if (demoDate !== undefined) updateField('demo_date', demoDate);
      if (demoTime !== undefined) updateField('demo_time', demoTime);
    } else if (status === 'demo_booked' || status === 'meeting_booked') {
      updateField('status', status);
      updateField('assigned_to', userIdentifier); // keep locked for demos
      if (eventId) updateField('event_id', eventId);
      if (demoDate) updateField('demo_date', demoDate);
      if (demoTime) updateField('demo_time', demoTime);
    } else {
      updateField('status', status);
      // User requested to keep assigned_to for statuses like not_interested
    }

    if (updates.length === 0) {
      console.warn("[CALLING] No updates to perform. Check if headers match.");
      return res.json({ success: true, message: "No columns matched for update" });
    }

    // Batch update
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    });

    // Emit real-time update for admins
    if (global.io) {
      global.io.emit('call_update', {
        employeeName: userIdentifier,
        businessName: currentLead?.business_name || 'Unknown Business',
        status: status,
        notes: notes,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[CALLING] Error updating lead:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Get tasks for employee
app.get('/api/calling/tasks', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { data: profile } = await admin.from('profiles').select('employee_id').eq('id', user.id).single();
    
    const { headers, leads } = await getLeadsData();
    
    // Find column names for filtering
    const findKey = (base) => {
      const idx = findBestColumnIndex(headers, base);
      return idx !== -1 ? headers[idx] : base;
    };
    const statusKey = findKey('status');
    const assignedKey = findKey('assigned_to');
    const callbackKey = findKey('callback_date');

    console.log(`[CALLING] Fetching tasks for user: ${user.email}, empId: ${profile?.employee_id}`);
    console.log(`[CALLING] Using keys - status: ${statusKey}, assigned: ${assignedKey}, callback: ${callbackKey}`);

    // Filter callbacks assigned to this user
    const tasks = leads.filter(l => {
      const status = (l[statusKey] || '').toLowerCase();
      const assigned = (l[assignedKey] || '').toLowerCase();
      const callbackDate = l[callbackKey];
      
      const userEmail = user.email?.toLowerCase();
      const empId = profile?.employee_id?.toLowerCase();
      
      const isAssignedToMe = (userEmail && assigned.includes(userEmail)) || 
                             (empId && assigned.includes(empId));

      if (status === 'callback' && callbackDate) {
        // Log potential matches that are NOT assigned to me for debugging
        if (!isAssignedToMe) {
          // console.log(`[CALLING] Task for ${l.business_name} is callback but assigned to: ${assigned}`);
        }
      }

      return status === 'callback' && isAssignedToMe && callbackDate;
    });

    // Sort tasks by callback date
    tasks.sort((a, b) => {
      const dateA = new Date(a[callbackKey] || 0);
      const dateB = new Date(b[callbackKey] || 0);
      return dateA.getTime() - dateB.getTime();
    });

    res.json(tasks);
  } catch (error) {
    console.error("[CALLING] Error fetching tasks:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4b. Get meetings for employee
app.get('/api/calling/meetings', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { data: profile } = await admin.from('profiles').select('employee_id').eq('id', user.id).single();
    
    const { headers, leads } = await getLeadsData();
    
    const findKey = (base) => {
      const idx = findBestColumnIndex(headers, base);
      return idx !== -1 ? headers[idx] : base;
    };
    const statusKey = findKey('status');
    const assignedKey = findKey('assigned_to');
    const demoDateKey = findKey('demo_date');
    const demoTimeKey = findKey('demo_time');
    const eventIdKey = findKey('event_id');

    const meetings = leads.filter(l => {
      const status = (l[statusKey] || '').toLowerCase();
      const assigned = (l[assignedKey] || '').toLowerCase();
      
      const userEmail = user.email?.toLowerCase();
      const empId = profile?.employee_id?.toLowerCase();
      
      const isAssignedToMe = (userEmail && assigned.includes(userEmail)) || 
                             (empId && assigned.includes(empId));

      return (status === 'demo_booked' || status === 'meeting_booked') && isAssignedToMe;
    }).map(l => ({
      ...l,
      event_id: l[eventIdKey],
      demo_date: l[demoDateKey],
      demo_time: l[demoTimeKey],
      email: l[findKey('email')],
      business_name: l[findKey('business_name')] || l[findKey('name')] || 'Unknown'
    }));

    res.json(meetings);
  } catch (error) {
    console.error("[CALLING] Error fetching meetings:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4c. Get calling stats for employee
app.get('/api/calling/stats', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { data: profile } = await admin.from('profiles').select('employee_id').eq('id', user.id).single();
    const userIdentifier = profile?.employee_id || user.email;

    const { headers, leads } = await getLeadsData();
    const myLeads = leads.filter(l => l.called_by === userIdentifier);

    const stats = {
      total: myLeads.length,
      no_answer: myLeads.filter(l => l.status === 'no_answer').length,
      callback: myLeads.filter(l => l.status === 'callback').length,
      demo_booked: myLeads.filter(l => l.status === 'demo_booked' || l.status === 'meeting_booked').length,
      not_interested: myLeads.filter(l => l.status === 'not_interested').length,
      other: myLeads.filter(l => !['no_answer', 'callback', 'demo_booked', 'meeting_booked', 'not_interested'].includes(l.status)).length
    };

    res.json(stats);
  } catch (error) {
    console.error("[CALLING] Error fetching stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4d. Get leaderboard for all employees
app.get('/api/calling/leaderboard', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { leads } = await getLeadsData();
    const { data: profiles } = await admin.from('profiles').select('employee_id, first_name, email');

    const stats = {};
    leads.forEach(lead => {
      const emp = lead.called_by || 'unknown';
      if (emp === 'unknown' || emp === '') return;

      if (!stats[emp]) {
        const profile = profiles?.find(p => p.employee_id === emp || p.email === emp);
        stats[emp] = {
          employee: emp,
          firstName: profile?.first_name || emp.split('@')[0],
          totalCalls: 0,
          bookedMeetings: 0
        };
      }

      stats[emp].totalCalls++;
      if (lead.status === 'demo_booked' || lead.status === 'meeting_booked') {
        stats[emp].bookedMeetings++;
      }
    });

    const leaderboard = Object.values(stats).sort((a, b) => b.bookedMeetings - a.bookedMeetings || b.totalCalls - a.totalCalls);
    res.json(leaderboard);
  } catch (error) {
    console.error("[CALLING] Error fetching leaderboard:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Admin: Get all employee stats
app.get('/api/admin/employee-stats', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    // Check if admin
    const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
    const isAdmin = profile?.is_admin === true || profile?.is_admin === 'true' || user.email?.toLowerCase() === 'kev.stanchev@gmail.com';
    if (!isAdmin) return res.status(403).json({ error: "Forbidden" });

    const { leads } = await getLeadsData();
    
    // Group by employee using 'called_by' column
    const employeeStats = {};
    leads.forEach(lead => {
      const emp = lead.called_by || 'unknown';
      if (emp === 'unknown' || emp === '') return; // Skip uncalled leads

      if (!employeeStats[emp]) {
        employeeStats[emp] = {
          employee: emp,
          total: 0,
          no_answer: 0,
          callback: 0,
          demo_booked: 0,
          not_interested: 0,
          other: 0
        };
      }
      
      employeeStats[emp].total++;
      if (lead.status === 'no_answer') employeeStats[emp].no_answer++;
      else if (lead.status === 'callback') employeeStats[emp].callback++;
      else if (lead.status === 'demo_booked' || lead.status === 'meeting_booked') employeeStats[emp].demo_booked++;
      else if (lead.status === 'not_interested') employeeStats[emp].not_interested++;
      else employeeStats[emp].other++;
    });

    res.json(Object.values(employeeStats));
  } catch (error) {
    console.error("[ADMIN] Error fetching employee stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Release lead
app.post('/api/calling/release-lead', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace('Bearer ', '');

  try {
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

    const { rowIndex } = req.body;
    if (!rowIndex) return res.status(400).json({ error: "Row index required" });

    const sheets = getSheetsClient();
    const spreadsheetId = getSheetId();
    const { headers } = await getLeadsData();
    const assignedToIndex = findBestColumnIndex(headers, 'assigned_to');

    if (assignedToIndex === -1) {
      return res.status(400).json({ error: "assigned_to column not found" });
    }

    const col = getColumnLetter(assignedToIndex);
    const range = `Leads!${col}${rowIndex}`;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [['']] }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("[SERVER] Release lead error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Get Calendar Availability
app.get('/api/calendar/debug', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

    const token = authHeader.split(' ')[1];
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const status = {
      clientId: clientId ? 'Configured' : 'Missing',
      clientSecret: clientSecret ? 'Configured' : 'Missing',
      refreshToken: refreshToken ? `Configured (Length: ${refreshToken.length}, Starts with: ${refreshToken.substring(0, 5)})` : 'Missing',
      calendarId: calendarId,
      env: process.env.NODE_ENV
    };

    const calendar = getGoogleCalendar();
    if (!calendar) {
      return res.json({ status, connection: 'Failed to initialize calendar client' });
    }

    try {
      const response = await calendar.calendarList.get({ calendarId: 'primary' });
      return res.json({ 
        status, 
        connection: 'Success', 
        calendarTitle: response.data.summary,
        calendarId: response.data.id
      });
    } catch (err) {
      return res.json({ 
        status, 
        connection: 'Failed to connect to Google API', 
        error: err.message,
        details: err.response?.data
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/calendar/availability', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const calendar = getGoogleCalendar();
    if (!calendar) return res.status(500).json({ error: "Calendar not configured" });

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    // Look ahead 14 days
    const timeMaxDate = new Date();
    timeMaxDate.setDate(timeMaxDate.getDate() + 14);
    const timeMax = timeMaxDate.toISOString();

    console.log(`[CALENDAR] Fetching availability for ${calendarId} from ${timeMin} to ${timeMax}`);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: 'America/New_York',
        items: [{ id: calendarId }]
      }
    });

    console.log("[CALENDAR] FreeBusy Response:", JSON.stringify(response.data));

    const calendarData = response.data.calendars[calendarId] || response.data.calendars['primary'];
    const busySlots = calendarData?.busy || [];
    
    console.log(`[CALENDAR] Found ${busySlots.length} busy slots`);

    const formatToNY = (date) => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      }).format(date).replace(', ', 'T');
    };

    const nowNY = formatToNY(now);

    // Generate available slots (9 AM to 6 PM, 30 min increments)
    const availableSlots = [];
    const startHour = 9;
    const endHour = 18;

    for (let i = 0; i < 14; i++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + i);
      
      // Get the date part in NY time
      const datePart = formatToNY(currentDate).split('T')[0];
      
      // Skip weekends (we need to know the day of week in NY)
      const dayOfWeek = new Date(datePart + 'T12:00:00Z').getDay(); // Use noon UTC to get the right day
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      for (let hour = startHour; hour < endHour; hour++) {
        for (let min of [0, 30]) {
          const slotStartStr = `${datePart}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
          
          // Calculate slot end (add 30 mins)
          let endMin = min + 30;
          let endHour = hour;
          if (endMin >= 60) {
            endMin -= 60;
            endHour += 1;
          }
          const slotEndStr = `${datePart}T${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`;
          
          if (slotStartStr < nowNY) continue; // Skip past slots

          // Check if slot overlaps with any busy slot
          const isBusy = busySlots.some(busy => {
            const busyStartStr = formatToNY(new Date(busy.start));
            const busyEndStr = formatToNY(new Date(busy.end));
            // Overlap: (StartA < EndB) and (EndA > StartB)
            return (slotStartStr < busyEndStr && slotEndStr > busyStartStr);
          });

          if (!isBusy) {
            // Return local NY string for the frontend
            availableSlots.push(slotStartStr);
          }
        }
      }
    }

    console.log(`[CALENDAR] Generated ${availableSlots.length} available slots`);
    res.json(availableSlots);
  } catch (error) {
    console.error("[CALENDAR] Error fetching availability:", error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Book Demo
app.post('/api/calendar/book-demo', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { business_name, email, date, time } = req.body;
    if (!business_name || !email || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const calendar = getGoogleCalendar();
    if (!calendar) return res.status(500).json({ error: "Calendar not configured" });

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    
    const startDateTimeStr = `${date}T${time}:00`;
    const [hourStr, minStr] = time.split(':');
    let endMin = parseInt(minStr) + 30;
    let endHour = parseInt(hourStr);
    if (endMin >= 60) {
      endMin -= 60;
      endHour += 1;
    }
    const endDateTimeStr = `${date}T${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`;

    const event = {
      summary: `${business_name} - AI Receptionist Demo`,
      description: `AI Receptionist Demo booked via Calling Dashboard.\\nClient Email: ${email}`,
      start: {
        dateTime: startDateTimeStr,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endDateTimeStr,
        timeZone: 'America/New_York',
      },
      attendees: [
        { email: 'kev.stanchev@gmail.com' },
        { email: 'kianmurphy741@gmail.com' },
        { email: email }
      ],
      conferenceData: {
        createRequest: {
          requestId: `demo-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all'
    });

    res.json({ success: true, eventLink: response.data.htmlLink, meetLink: response.data.hangoutLink, eventId: response.data.id });
  } catch (error) {
    console.error("[CALENDAR] Error booking demo:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calendar/reschedule-demo', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const admin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid session");

    const { eventId, date, time } = req.body;
    if (!eventId || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const calendar = getGoogleCalendar();
    if (!calendar) return res.status(500).json({ error: "Calendar not configured" });

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    
    const startDateTimeStr = `${date}T${time}:00`;
    const [hourStr, minStr] = time.split(':');
    let endMin = parseInt(minStr) + 30;
    let endHour = parseInt(hourStr);
    if (endMin >= 60) {
      endMin -= 60;
      endHour += 1;
    }
    const endDateTimeStr = `${date}T${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`;

    const response = await calendar.events.patch({
      calendarId: calendarId,
      eventId: eventId,
      resource: {
        start: {
          dateTime: startDateTimeStr,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: endDateTimeStr,
          timeZone: 'America/New_York',
        }
      },
      sendUpdates: 'all'
    });

    res.json({ success: true, eventLink: response.data.htmlLink, meetLink: response.data.hangoutLink });
  } catch (error) {
    console.error("[CALENDAR] Error rescheduling demo:", error);
    res.status(500).json({ error: error.message });
  }
});

// API 404 Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 [LUNO STUDIOS] Security Infrastructure Active at http://0.0.0.0:${PORT}`);
});
