import express from 'express';
import { getTrails, createTrail, updateTrail, deleteTrail } from '../controllers/trailController.js';
import verifyJWT from '../middleware/authMiddleware.js'; // Middleware cek token admin

const router = express.Router();

// PUBLIK & USER LOGIN (Kirim ?userId=xxx di URL kalau user sudah login)
router.get('/', getTrails); 

// HANYA ADMIN (Dipanggil dari Web Admin React)
router.post('/', verifyJWT, createTrail); 
router.put('/:id', verifyJWT, updateTrail); 
router.delete('/:id', verifyJWT, deleteTrail); 

export default router;