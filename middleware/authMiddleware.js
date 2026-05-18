import supabase from '../config/supabase.js';

const verifyJWT = async (req, res, next) => {
  try {
    // 1. Ambil token dari header 'Authorization: Bearer <TOKEN>'
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Akses ditolak! Token tidak ditemukan atau format salah (Gunakan Bearer Token).' 
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verifikasi token langsung ke Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token tidak valid atau sudah kedaluwarsa!' 
      });
    }

    // 3. Jika token valid, simpan data user ke dalam object request 'req.user'
    req.user = user;
    
    // Lanjut ke fungsi utama di route
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default verifyJWT;