import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { swaggerDocument } from './swagger.js'; // Tetap import file JS yang berisi skema API Anda

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
// SETUP SWAGGER API DOCUMENTATION (VERCEL PROOF)
// ==========================================
// Bypass middleware dan kirim HTML murni ke browser
app.get('/api-docs', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>HikingFit API Docs</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css" />
      <style>
        body { margin: 0; background: #fafafa; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            spec: ${JSON.stringify(swaggerDocument)},
            dom_id: '#swagger-ui',
            deepLinking: true,
          });
        };
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

// Daftarkan semua endpoint
app.use('/api/auth', authRoutes);
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