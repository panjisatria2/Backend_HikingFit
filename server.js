import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger.js'; //[cite: 2]

// Import semua routes
import authRoutes from './routes/authRoutes.js';
import mountainRoutes from './routes/mountainRoutes.js'; 
import trailRoutes from './routes/trailRoutes.js';       
import weatherRoutes from './routes/weatherRoutes.js';

dotenv.config();

const app = express(); //[cite: 2]

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// SETUP SWAGGER API DOCUMENTATION
// ==========================================
// Gunakan CDN Cloudflare untuk CSS dan JS agar Vercel tidak kebingungan mencari static files
const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.30.0/swagger-ui.min.css"; //[cite: 2]

const swaggerOptions = {
  customCssUrl: CSS_URL,
  customJs: [
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.30.0/swagger-ui-bundle.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.30.0/swagger-ui-standalone-preset.min.js",
  ],
};

// Terapkan options yang berisi CDN JS dan CSS ke dalam setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions)); //[cite: 2]

// Daftarkan semua endpoint
app.use('/api/auth', authRoutes); //[cite: 2]
app.use('/api/mountains', mountainRoutes); 
app.use('/api/trails', trailRoutes);       
app.use('/api/weather', weatherRoutes);

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server mantap running di port ${PORT}`);
  console.log(`📄 Dokumentasi API tersedia di http://localhost:${PORT}/api-docs`);
});

export default app; 