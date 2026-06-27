import express from 'express';
import { getWeatherHistory } from '../controllers/weatherController.js';

const router = express.Router();

// Endpoint untuk mengambil grafik cuaca
router.get('/:trailName', getWeatherHistory);

export default router;