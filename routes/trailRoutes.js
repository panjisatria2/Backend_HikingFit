import express from 'express';
import { getTrails, createTrail, updateTrail, deleteTrail } from '../controllers/trailController.js';

const router = express.Router();

// PUBLIK & USER LOGIN (Kirim ?userId=xxx di URL kalau user sudah login)
router.get('/', getTrails); 

// HANYA ADMIN (JWT dimatikan sementara untuk testing Lokal)
router.post('/', createTrail); 
router.put('/:id', updateTrail); 
router.delete('/:id', deleteTrail); 

export default router;