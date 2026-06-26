import express from 'express';
import { 
  createMountain, 
  getAllMountains, 
  getMountainById, 
  updateMountain, 
  deleteMountain 
} from '../controllers/mountainController.js';

const router = express.Router();

// HAPUS SEMUA verifyJWT DARI SINI:
router.post('/', createMountain); 
router.get('/', getAllMountains); 
router.get('/:id', getMountainById); 
router.put('/:id', updateMountain); 
router.delete('/:id', deleteMountain); 

export default router;