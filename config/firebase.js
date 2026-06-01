import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

try {
  // Ambil string JSON dari .env dan ubah kembali menjadi objek
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  // Inisialisasi Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log("🔥 Firebase Admin SDK berhasil terkoneksi!");
} catch (error) {
  console.error("Gagal menghubungkan Firebase:", error.message);
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };