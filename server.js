import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express'; // <-- TAMBAHAN BARU: Import Swagger UI
import YAML from 'yamljs';                 // <-- TAMBAHAN BARU: Import Yaml parser

// Import semua routes
import authRoutes from './routes/authRoutes.js';
import mountainRoutes from './routes/mountainRoutes.js'; 
import trailRoutes from './routes/trailRoutes.js';       
import weatherRoutes from './routes/weatherRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// SETUP SWAGGER API DOCUMENTATION
// ==========================================
// Baca file yaml (Pastikan file openapi.yaml ada di folder yang sama dengan server.js)
const swaggerDocument = YAML.load('./openapi.yaml'); 
// Daftarkan endpoint untuk UI dokumentasinya
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));    

// Daftarkan semua endpoint
app.use('/api/auth', authRoutes);
app.use('/api/mountains', mountainRoutes); 
app.use('/api/trails', trailRoutes);       
app.use('/api/weather', weatherRoutes);

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server mantap running di port ${PORT}`);
  console.log(`📄 Dokumentasi API tersedia di http://localhost:${PORT}/api-docs`); // <-- TAMBAHAN LOG
});

// ==========================================
// BARIS WAJIB UNTUK DEPLOY DI VERCEL
// ==========================================
export default app;