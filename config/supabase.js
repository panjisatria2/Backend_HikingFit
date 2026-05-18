import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws'; // <-- 1. Import library ws yang baru di-install

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// 2. Tambahkan opsi { auth: { ... }, realtime: { transport: ws } } di argumen ketiga
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false // Bagus untuk backend Express agar session tidak tabrakan antar user
  },
  realtime: {
    transport: ws, // <-- Ini dia penawarnya agar Node.js v18 tidak crash lagi
  },
});

export default supabase;