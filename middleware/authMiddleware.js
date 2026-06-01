import { auth } from '../config/firebase.js';

const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Akses ditolak! Token tidak valid.' 
      });
    }

    const token = authHeader.split(' ')[1];

    // Verifikasi ID Token Firebase
    const decodedToken = await auth.verifyIdToken(token);
    
    // Simpan data user (termasuk uid) ke req.user
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token Firebase kedaluwarsa atau tidak valid!' });
  }
};

export default verifyJWT;