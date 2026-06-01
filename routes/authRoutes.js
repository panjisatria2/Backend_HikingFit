import express from 'express';
import { db, auth } from '../config/firebase.js'; 
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// =========================================================================
// KONFIGURASI PENGIRIM EMAIL
// =========================================================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// =========================================================================
// 1. POST: KIRIM OTP & BUAT PROFIL (SIMPAN NAMA)
// =========================================================================
router.post('/send-otp', async (req, res) => {
  try {
    const { uid, email, fullName } = req.body; 

    if (!uid || !email) {
      return res.status(400).json({ success: false, message: 'UID dan Email wajib dikirim!' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 1. Simpan OTP sementara
    await db.collection('otps').doc(uid).set({
      otp: otpCode,
      createdAt: new Date().toISOString()
    });

    // 2. Simpan Nama & Email ke Database Profil (PENTING!)
    await db.collection('profiles').doc(uid).set({
      fullName: fullName || 'Pendaki',
      email: email,
      createdAt: new Date().toISOString()
    }, { merge: true }); 

    // 3. Kirim Email (Desain Custom)
    const mailOptions = {
      from: '"HikingFit Support" <no-reply@hikingfit.com>',
      to: email,
      subject: '🔑 Kode Verifikasi Akun HikingFit',
      text: `Halo, kode verifikasi OTP Anda adalah: ${otpCode}`,
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
            Kode ini hanya berlaku 10 menit. Jangan berikan kepada siapapun.<br>
            <strong>Prepare for the peak!</strong>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Kode OTP berhasil dikirim.' });
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

    if (!uid || !otp) return res.status(400).json({ success: false, message: 'Data tidak lengkap' });

    const otpDoc = await db.collection('otps').doc(uid).get();
    if (!otpDoc.exists) return res.status(400).json({ success: false, message: 'OTP kadaluwarsa' });

    if (otpDoc.data().otp !== otp) return res.status(400).json({ success: false, message: 'Kode Salah!' });

    await auth.updateUser(uid, { emailVerified: true });
    await db.collection('otps').doc(uid).delete();

    res.status(200).json({ success: true, message: 'Email terverifikasi!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// MIDDLEWARE: KEAMANAN TOKEN
// =========================================================================
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Akses Ditolak' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    req.user = await auth.verifyIdToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token tidak valid' });
  }
};

// =========================================================================
// 3. POST: SIMPAN DATA FISIK / QUESIONER
// =========================================================================
router.post('/onboarding', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid; 
    const { height, weight, experienceLevel, fitnessGoals, mountainPreference } = req.body;

    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);

    await db.collection('profiles').doc(uid).set({
      height: height,
      weight: weight,
      bmi: parseFloat(bmi),
      experienceLevel: experienceLevel,
      fitnessGoals: fitnessGoals,
      mountainPreference: mountainPreference,
      updatedAt: new Date().toISOString()
    }, { merge: true }); 

    res.status(200).json({ success: true, message: 'Profil disimpan!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 4. GET: AMBIL PROFIL (UNTUK HOME & SETTING)
// =========================================================================
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const doc = await db.collection('profiles').doc(uid).get();
    
    if (doc.exists) {
      res.status(200).json({ success: true, data: doc.data() });
    } else {
      res.status(200).json({ success: true, data: null }); 
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;