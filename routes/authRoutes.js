import express from 'express';
import { db, auth } from '../config/firebase.js'; // Pastikan path ini sesuai dengan file konfigurasi Firebase Abang
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// =========================================================================
// KONFIGURASI NODEMAILER (PENGIRIM EMAIL)
// =========================================================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// =========================================================================
// 1. POST: KIRIM OTP KE EMAIL (DENGAN CUSTOM EMAIL TEMPLATE)
// =========================================================================
router.post('/send-otp', async (req, res) => {
  try {
    const { uid, email } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ success: false, message: 'UID dan Email wajib dikirim!' });
    }

    // Generate 6 digit angka OTP acak
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Simpan OTP ke database Firestore (koleksi 'otps')
    await db.collection('otps').doc(uid).set({
      otp: otpCode,
      createdAt: new Date().toISOString()
    });

    // --- BAGIAN CUSTOM EMAIL ---
    // Di sinilah Abang bisa mengedit tampilan email yang masuk ke HP user
    const mailOptions = {
      from: '"HikingFit Support" <no-reply@hikingfit.com>', // Nama pengirim yang muncul di Inbox
      to: email,
      subject: '🔑 Kode Verifikasi Akun HikingFit', // Judul Email
      text: `Halo, kode verifikasi OTP Anda adalah: ${otpCode}`, // Fallback untuk HP jadul yang tidak support HTML
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #EFEFEF; border-radius: 16px; background-color: #FFFFFF; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <div style="background-color: #E8F5E9; padding: 15px; border-radius: 50%; width: 60px; height: 60px; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 30px;">🏔️</span>
          </div>
          <h2 style="color: #1A1D1A; margin-bottom: 10px; font-size: 24px;">Selamat datang di HikingFit!</h2>
          <p style="color: #666666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
            Halo Pendaki!<br>
            Untuk menyelesaikan pendaftaran akun Anda, silakan masukkan 6 digit kode keamanan berikut:
          </p>
          <div style="background-color: #F9FBFA; border: 2px dashed #2E6930; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
            <h1 style="color: #2E6930; font-size: 40px; letter-spacing: 12px; margin: 0;">${otpCode}</h1>
          </div>
          <p style="color: #999999; font-size: 13px; margin-bottom: 0;">
            Kode ini hanya berlaku, jangan berikan kepada siapapun termasuk pihak HikingFit.<br>
            <strong>Prepare for the peak!</strong>
          </p>
        </div>
      `
    };

    // Eksekusi pengiriman email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Kode OTP berhasil dikirim ke email.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. POST: VERIFIKASI OTP
// =========================================================================
router.post('/verify-otp', async (req, res) => {
  try {
    const { uid, otp } = req.body;

    if (!uid || !otp) {
      return res.status(400).json({ success: false, message: 'UID dan OTP wajib diisi!' });
    }

    const otpDoc = await db.collection('otps').doc(uid).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ success: false, message: 'Sesi OTP tidak ditemukan atau sudah kedaluwarsa.' });
    }

    const data = otpDoc.data();

    if (data.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Kode OTP salah!' });
    }

    // JIKA BENAR: Update status emailVerified
    await auth.updateUser(uid, { emailVerified: true });

    // Hapus OTP dari Firestore
    await db.collection('otps').doc(uid).delete();

    res.status(200).json({ success: true, message: 'Email berhasil diverifikasi!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// MIDDLEWARE: VERIFIKASI TOKEN FIREBASE (SATU PINTU KEAMANAN)
// =========================================================================
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Akses Ditolak: Token tidak ditemukan' });
  }
  
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken; // Menitipkan data user ke dalam request
    next(); // Lanjut ke proses berikutnya
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Akses Ditolak: Token tidak valid atau kadaluwarsa' });
  }
};

// =========================================================================
// 3. POST: SIMPAN DATA KUESIONER (ONBOARDING)
// =========================================================================
router.post('/onboarding', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid; 
    const { height, weight, experienceLevel, fitnessGoals, mountainPreference } = req.body;

    // Kalkulasi BMI: Berat (kg) / (Tinggi (m) * Tinggi (m))
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);

    // Simpan ke Firestore
    await db.collection('profiles').doc(uid).set({
      height: height,
      weight: weight,
      bmi: parseFloat(bmi),
      experienceLevel: experienceLevel,
      fitnessGoals: fitnessGoals,
      mountainPreference: mountainPreference,
      updatedAt: new Date().toISOString()
    }, { merge: true }); 

    res.status(200).json({ success: true, message: 'Profil dan kuesioner berhasil disimpan!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 4. GET: CEK PROFIL (DIPAKAI SAAT LOGIN)
// =========================================================================
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const doc = await db.collection('profiles').doc(uid).get();
    
    if (doc.exists) {
      res.status(200).json({ success: true, data: doc.data() });
    } else {
      res.status(200).json({ success: true, data: null }); // Belum isi kuesioner
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;