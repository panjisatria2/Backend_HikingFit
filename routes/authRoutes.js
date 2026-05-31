import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// =========================================================================
// MIDDLEWARE: VERIFIKASI TOKEN JWT SUPABASE
// =========================================================================
const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Akses ditolak! Token tidak ditemukan atau format salah (Gunakan Bearer Token).' 
      });
    }

    const token = authHeader.split(' ')[1];

    // Ambil data user secara real-time berdasarkan token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token tidak valid atau sudah kedaluwarsa!' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 1. POST: REGISTER AKUN BARU + INITIATE EMAIL OTP
// =========================================================================
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, device } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi!' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password dan Confirm Password tidak cocok!' });
    }

    let userRole = 'user'; 
    if (device === 'web') {
      userRole = 'admin';  
    }

    // Mendaftarkan user ke Supabase Auth dengan Bcrypt Hashing internal otomatis
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: fullName,
          role: userRole 
        }
      }
    });

    if (error) throw error;

    // Jika daftar dari mobile, paksa verifikasi OTP email sebelum bisa dipakai login
    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Kode verifikasi OTP telah dikirimkan ke email Anda.',
      user: {
        id: data.user.id,
        email: data.user.email,
        confirmed: data.user.email_confirmed_at != null
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. POST: VERIFIKASI KODE OTP EMAIL (KEAMANAN TAMBAHAN)
// =========================================================================
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, tokenOtp } = req.body;

    if (!email || !tokenOtp) {
      return res.status(400).json({ success: false, message: 'Email dan Token OTP wajib diisi!' });
    }

    // Melakukan pengecekan token OTP ke server otentikasi Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: tokenOtp,
      type: 'signup' // tipe signup untuk memverifikasi pendaftaran user baru
    });

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Email berhasil diverifikasi secara aman! Silakan lakukan login.',
      session: data.session,
      user: data.user
    });
  } catch (error) {
    res.status(400).json({ success: false, message: `Gagal verifikasi OTP: ${error.message}` });
  }
});

// =========================================================================
// 3. POST: LOGIN DENGAN PROTEKSI MULTI-DEVICE & INTEGRASI STATUS PROFIL
// =========================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password, device } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email & password wajib diisi!' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Proteksi Keamanan: Cek apakah user sudah verifikasi email OTP-nya
    if (device === 'mobile' && !data.user.email_confirmed_at) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak! Silakan verifikasi email Anda menggunakan kode OTP terlebih dahulu.'
      });
    }

    const userRole = data.user?.user_metadata?.role || 'user';

    if (device === 'web' && userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Akses ditolak! Halaman Web Admin hanya boleh diakses oleh Admin.' 
      });
    }

    // Ambil data profil fisik untuk mengecek apakah user sudah mengisi kuesioner onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('height, weight')
      .eq('id', data.user.id)
      .single();

    // Tandai true jika data fisik sudah lengkap tersimpan di tabel database
    const hasCompletedOnboarding = profile && (profile.height > 0 && profile.weight > 0);

    let sessionData = { ...data.session };
    const waktuSekarang = Math.floor(Date.now() / 1000); 

    if (device === 'web') {
      sessionData.expires_in = 86400; 
      sessionData.expires_at = waktuSekarang + 86400;
    } else if (device === 'mobile') {
      sessionData.expires_in = 2592000; 
      sessionData.expires_at = waktuSekarang + 2592000;
    }

    res.status(200).json({
      success: true,
      message: `Login berhasil! Anda masuk sebagai ${userRole}.`,
      role: userRole,
      session: sessionData,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name,
        hasCompletedOnboarding: !!hasCompletedOnboarding // Konversi ke nilai boolean murni
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 4. POST: SUBMIT KUESIONER ONBOARDING (TERPROTEKSI TOKEN JWT)
// =========================================================================
router.post('/onboarding', verifyJWT, async (req, res) => {
  try {
    // KEAMANAN TINGGI: ID user diambil langsung dari Token JWT (req.user.id), tidak bisa dibajak!
    const userId = req.user.id;
    const { height, weight, experienceLevel, fitnessGoals, mountainPreference } = req.body;

    if (!height || !weight || !experienceLevel || !fitnessGoals || !mountainPreference) {
      return res.status(400).json({ success: false, message: 'Data kuesioner tidak boleh ada yang kosong!' });
    }
    if (height < 140 || height > 220) {
      return res.status(400).json({ success: false, message: 'Tinggi badan harus di antara 140 cm - 220 cm!' });
    }
    if (weight <= 0) {
      return res.status(400).json({ success: false, message: 'Berat badan harus berupa angka positif!' });
    }

    const heightInMeter = height / 100;
    const bmiValue = (weight / (heightInMeter * heightInMeter)).toFixed(2);

    let bmiLabel = 'Ideal';
    if (bmiValue < 18.5) bmiLabel = 'Underweight';
    else if (bmiValue >= 23 && bmiValue < 25) bmiLabel = 'Kelebihan Berat Badan';
    else if (bmiValue >= 25) bmiLabel = 'Overweight';

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
      message: 'Onboarding Assessment berhasil disimpan secara aman murni berbasis Token JWT!',
      bmi_score: bmiValue,
      bmi_status: bmiLabel,
      data: data
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 5. GET: AMBIL PROFIL LENGKAP USER (TERPROTEKSI TOKEN JWT)
// =========================================================================
router.get('/profile', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

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
// 6. PUT: UPDATE PROFIL LENGKAP (TERPROTEKSI TOKEN JWT)
// =========================================================================
router.put('/profile/update', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, height, weight, experienceLevel, fitnessGoals, mountainPreference } = req.body;

    let bmiValue = 0;
    let bmiLabel = 'Ideal';
    
    if (height && weight) {
      const heightInMeter = height / 100;
      bmiValue = parseFloat((weight / (heightInMeter * heightInMeter)).toFixed(2));

      if (bmiValue < 18.5) bmiLabel = 'Underweight';
      else if (bmiValue >= 23 && bmiValue < 25) bmiLabel = 'Kelebihan Berat Badan';
      else if (bmiValue >= 25) bmiLabel = 'Overweight';
    }

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