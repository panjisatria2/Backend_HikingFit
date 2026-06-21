import express from 'express';
import { 
  createMountain, 
  getAllMountains, 
  getMountainById, // <-- Tambahan baru
  updateMountain, 
  deleteMountain 
} from '../controllers/mountainController.js';
import verifyJWT from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.post('/', verifyJWT, createMountain); // Buat gunung (Admin)
router.get('/', getAllMountains); // List semua gunung + cuaca (Publik/Flutter)
router.get('/:id', getMountainById); // Detail 1 gunung + cuaca (Publik/Flutter)
router.put('/:id', verifyJWT, updateMountain); // Edit (Admin)
router.delete('/:id', verifyJWT, deleteMountain); // Hapus (Admin)

export default router;