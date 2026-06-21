import { db } from '../config/firebase.js';

// GET: Ambil Semua Jalur (BISA DIAKSES PUBLIK & USER LOGIN)
export const getTrails = async (req, res) => {
  try {
    const { mountainId, userId } = req.query; 
    
    let query = db.collection('trails');
    if (mountainId) {
      query = query.where('mountainId', '==', mountainId);
    }

    const snapshot = await query.get();
    let trails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // LOGIKA PERSONALISASI WAKTU ESTIMASI
    if (userId) {
      // 1. Cek data kebugaran user di database
      const userRef = await db.collection('users').doc(userId).get();
      let fitnessLevel = 'Beginner'; // Default fallback
      
      if (userRef.exists) {
        fitnessLevel = userRef.data().fitnessLevel || 'Beginner';
      }
        
      // 2. Ubah estimasi waktu berdasarkan fisik user
      trails = trails.map(trail => {
        const personalizedSegments = trail.segments.map(seg => {
          // PEMBERSIH: Ambil angkanya saja walau data di DB terlanjur ada teksnya
          let rawTime = parseInt(seg.estimatedTime); 
          if (isNaN(rawTime)) rawTime = 0;

          let newTimeStr = `${rawTime} Menit`; // Default

          if (fitnessLevel === 'Pro') {
            newTimeStr = `${Math.round(rawTime * 0.8)} Menit (Fast Pace)`;
          } else if (fitnessLevel === 'Beginner') {
            newTimeStr = `${Math.round(rawTime * 1.3)} Menit (Slow Pace)`;
          }

          // PENTING: Pisahkan data mentah untuk Admin dan data teks untuk Flutter
          return { 
            ...seg, 
            estimatedTime: rawTime,  // Angka bersih (Untuk form Edit Web Admin)
            displayTime: newTimeStr  // Teks panjang (Untuk UI Aplikasi Flutter)
          };
        });
        return { ...trail, segments: personalizedSegments };
      });
      
    } else {
      // JIKA TIDAK LOGIN: Waktu dibiarkan original (Default dari muncak.id)
      trails = trails.map(trail => {
        const defaultSegments = trail.segments.map(seg => {
          let rawTime = parseInt(seg.estimatedTime);
          if (isNaN(rawTime)) rawTime = 0;

          return {
            ...seg,
            estimatedTime: rawTime, // Angka bersih (Untuk form Edit Web Admin)
            displayTime: `${rawTime} Menit (Standar Muncak.id)` // Teks panjang (Untuk UI Aplikasi Flutter)
          };
        });
        return { ...trail, segments: defaultSegments };
      });
    }

    res.status(200).json({ success: true, data: trails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST: Tambah Jalur Baru (HANYA ADMIN)
export const createTrail = async (req, res) => {
  try {
    const docRef = await db.collection('trails').add(req.body);
    res.status(201).json({ success: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT: Edit Jalur (HANYA ADMIN)
export const updateTrail = async (req, res) => {
  try {
    await db.collection('trails').doc(req.params.id).update(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE: Hapus Jalur (HANYA ADMIN)
export const deleteTrail = async (req, res) => {
  try {
    await db.collection('trails').doc(req.params.id).delete();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};