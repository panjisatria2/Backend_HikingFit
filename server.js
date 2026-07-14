import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

// Import semua routes
import authRoutes from './routes/authRoutes.js';
import mountainRoutes from './routes/mountainRoutes.js'; // <-- TAMBAHAN BARU
import trailRoutes from './routes/trailRoutes.js';       // <-- TAMBAHAN BARU
import weatherRoutes from './routes/weatherRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Daftarkan semua endpoint
app.use('/api/auth', authRoutes);
app.use('/api/mountains', mountainRoutes); // <-- TAMBAHAN BARU
app.use('/api/trails', trailRoutes);       // <-- TAMBAHAN BARU
app.use('/api/weather', weatherRoutes);

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server mantap running di port ${PORT}`);
});

// ==========================================
// BARIS WAJIB UNTUK DEPLOY DI VERCEL
// ==========================================
export default app;