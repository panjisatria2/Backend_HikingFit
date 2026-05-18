import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// =========================================================================
// INTERNALLY-SCOPED MIDDLEWARE: VERIFIKASI JWT SUPABASE
// =========================================================================
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

    // 3. Jika token valid, simpan data user ke dalam objek request 'req.user'
    req.user = user;
    
    // Lanjut ke fungsi utama di route
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 1. POST: REGISTER AKUN BARU DENGAN AUTO-ROLE (REQ-062, REQ-063)
// =========================================================================
router.post('/register', async (req, res) => {
  try {
    // Menerima parameter 'device' ('web' atau 'mobile') dari client
    const { fullName, email, password, confirmPassword, device } = req.body;

    // Validasi input di sisi server (REQ-063)
    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi!' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password dan Confirm Password tidak cocok!' });
    }

    // Penentuan ROLE otomatis berdasarkan asal device pendaftaran
    let userRole = 'user'; // Bawaan untuk aplikasi mobile (pengguna umum)
    if (device === 'web') {
      userRole = 'admin';  // Otomatis dikunci sebagai admin jika daftar via website
    }

    // Daftarkan akun kredensial ke Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Menyimpan Nama Lengkap & Role permanen ke dalam user_metadata Supabase
        data: { 
          full_name: fullName,
          role: userRole 
        }
      }
    });

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: `Registrasi berhasil sebagai ${userRole}! Silakan lanjut ke langkah berikutnya.`,
      user: data.user
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. POST: LOGIN MULTI-DEVICE (REQ-060, Custom Expiry & Proteksi Admin)
// =========================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password, device } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email & password wajib diisi!' });
    }

    // Verifikasi akun ke Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Ambil role yang tersimpan di dalam metadata akun saat register dulu
    const userRole = data.user?.user_metadata?.role || 'user';

    // ⚠️ VALIDASI KEAMANAN: Blokir 'user' biasa yang mencoba login ke Web Admin
    if (device === 'web' && userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Akses ditolak! Halaman Web Admin hanya boleh diakses oleh Admin.' 
      });
    }

    let sessionData = { ...data.session };
    const waktuSekarang = Math.floor(Date.now() / 1000); // Unix timestamp (detik)

    // Logika kustom masa aktif token (Admin 1 hari, Mobile 30 hari)
    if (device === 'web') {
      sessionData.expires_in = 86400; // 1 Hari (detik)
      sessionData.expires_at = waktuSekarang + 86400;
    } else if (device === 'mobile') {
      sessionData.expires_in = 2592000; // 30 Hari (detik)
      sessionData.expires_at = waktuSekarang + 2592000;
    }

    res.status(200).json({
      success: true,
      message: `Login berhasil! Anda masuk sebagai ${userRole}.`,
      role: userRole,
      session: sessionData,
      user: data.user
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 3. POST: SUBMIT ONBOARDING ASSESSMENT (REQ-066 s/d REQ-076)
// =========================================================================
router.post('/onboarding', async (req, res) => {
  try {
    const { userId, height, weight, experienceLevel, fitnessGoals, mountainPreference } = req.body;

    // Validasi kecukupan dan batas nilai input (REQ-068, REQ-069, REQ-074)
    if (!userId || !height || !weight || !experienceLevel || !fitnessGoals || !mountainPreference) {
      return res.status(400).json({ success: false, message: 'Data kuesioner tidak boleh ada yang kosong!' });
    }
    if (height < 140 || height > 220) {
      return res.status(400).json({ success: false, message: 'Tinggi badan harus di antara 140 cm - 220 cm!' });
    }
    if (weight <= 0) {
      return res.status(400).json({ success: false, message: 'Berat badan harus berupa angka positif!' });
    }

    // Kalkulasi otomatis nilai BMI (REQ-076) -> Rumus: BB (kg) / (TB (m))^2
    const heightInMeter = height / 100;
    const bmiValue = (weight / (heightInMeter * heightInMeter)).toFixed(2);

    // Penentuan Kategori Status BMI berdasarkan standar Kemenkes
    let bmiLabel = 'Ideal';
    if (bmiValue < 18.5) bmiLabel = 'Underweight';
    else if (bmiValue >= 23 && bmiValue < 25) bmiLabel = 'Kelebihan Berat Badan';
    else if (bmiValue >= 25) bmiLabel = 'Overweight';

    // Simpan data fisik awal ke tabel 'profiles' di Supabase (REQ-075)
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        height: height,
        weight: weight,
        experience_level: experienceLevel,
        fitness_goals: fitnessGoals,
        mountain_preference: mountainPreference,
        bmi_score: parseFloat(bmiValue),
        bmi_status: bmiLabel,
        updated_at: new Date()
      })
      .select();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Onboarding Assessment berhasil disimpan! Profil awal terbentuk.',
      bmi_score: bmiValue,
      bmi_status: bmiLabel,
      data: data
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
// =========================================================================
// 4. GET: AMBIL PROFIL LENGKAP USER (CUKUP MASUKKAN TOKEN SAJA!)
// =========================================================================
router.get('/profile', verifyJWT, async (req, res) => {
  try {
    // ID diambil otomatis dari token yang dibongkar oleh verifyJWT (req.user.id)
    const userId = req.user.id;

    // Tarik data biodata fisik dari tabel 'profiles' Supabase
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    // Satukan kepingan data menggunakan info langsung dari token (req.user)
    const responseData = {
      userId: userId,
      fullName: req.user.user_metadata?.full_name || profileData?.full_name || 'Pendaki Fit',
      email: req.user.email || '',
      role: req.user.user_metadata?.role || 'user',
      height: profileData?.height || 0,
      weight: profileData?.weight || 0,
      bmiScore: profileData?.bmi_score || 0,
      bmiStatus: profileData?.bmi_status || 'Belum dihitung',
      experienceLevel: profileData?.experience_level || 'Beginner',
      fitnessGoals: profileData?.fitness_goals || '',
      mountainPreference: profileData?.mountain_preference || ''
    };

    res.status(200).json({
      success: true,
      message: 'Data profil berhasil diambil murni menggunakan Token JWT!',
      data: responseData
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 5. PUT: UPDATE PROFIL LENGKAP (CUKUP MASUKKAN TOKEN SAJA!)
// =========================================================================
router.put('/profile/update', verifyJWT, async (req, res) => {
  try {
    // ID diambil otomatis dari token (req.user.id), frontend tidak perlu kirim userId lagi di body
    const userId = req.user.id;
    const { fullName, height, weight, experienceLevel, fitnessGoals, mountainPreference } = req.body;

    // Hitung ulang BMI otomatis jika parameter tinggi atau berat badan ikut diubah
    let bmiValue = 0;
    let bmiLabel = 'Ideal';
    
    if (height && weight) {
      const heightInMeter = height / 100;
      bmiValue = parseFloat((weight / (heightInMeter * heightInMeter)).toFixed(2));

      if (bmiValue < 18.5) bmiLabel = 'Underweight';
      else if (bmiValue >= 23 && bmiValue < 25) bmiLabel = 'Kelebihan Berat Badan';
      else if (bmiValue >= 25) bmiLabel = 'Overweight';
    }

    // Perbarui data secara real-time di tabel database 'profiles'
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName,
        height: height,
        weight: weight,
        experience_level: experienceLevel,
        fitness_goals: fitnessGoals,
        mountain_preference: mountainPreference,
        bmi_score: bmiValue,
        bmi_status: bmiLabel,
        updated_at: new Date()
      })
      .select();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Profil berhasil diperbarui murni berbasis Token JWT!',
      data: {
        ...data[0],
        bmi_score: bmiValue,
        bmi_status: bmiLabel
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;