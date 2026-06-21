import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Trik khusus untuk membaca path folder di dalam ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // Baca langsung file JSON yang posisinya sejajar di dalam folder config
  const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

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