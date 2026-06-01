import express from 'express';
import { db, auth } from '../config/firebase.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Konfigurasi Nodemailer menggunakan Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// =========================================================================
// 1. POST: KIRIM OTP KE EMAIL (Dipanggil saat Register)
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

    // Kirim OTP via Email
    const mailOptions = {
      from: '"HikingFit App" <no-reply@hikingfit.com>',
      to: email,
      subject: 'Kode Verifikasi OTP HikingFit',
      text: `Halo, kode verifikasi OTP Anda adalah: ${otpCode}\n\nMasukkan kode ini di aplikasi untuk mengaktifkan akun Anda.`,
      html: `<h3>Halo Pendaki!</h3><p>Kode verifikasi OTP Anda adalah: <b>${otpCode}</b></p><p>Masukkan kode ini di aplikasi untuk mengaktifkan akun Anda.</p>`
    };

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

    // Ambil data OTP dari Firestore
    const otpDoc = await db.collection('otps').doc(uid).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ success: false, message: 'Sesi OTP tidak ditemukan atau sudah kedaluwarsa.' });
    }

    const data = otpDoc.data();

    // Cek kecocokan OTP
    if (data.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Kode OTP salah!' });
    }

    // JIKA BENAR: Update status emailVerified user di Firebase Auth menjadi TRUE
    await auth.updateUser(uid, { emailVerified: true });

    // Hapus OTP dari Firestore agar tidak bisa dipakai 2 kali
    await db.collection('otps').doc(uid).delete();

    res.status(200).json({ success: true, message: 'Email berhasil diverifikasi!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;