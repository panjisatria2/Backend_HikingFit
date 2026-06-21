import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  let serviceAccount;

  // Baca variabel FIREBASE_SERVICE_ACCOUNT yang Abang buat di Vercel
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Karena disimpen utuh, kita tinggal ubah teksnya jadi JSON
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Kalau jalan di laptop lokal, baca file aslinya
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  }

  // Inisialisasi Firebase
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Admin SDK berhasil terkoneksi!");
  }
} catch (error) {
  console.error("Gagal menghubungkan Firebase:", error.message);
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };