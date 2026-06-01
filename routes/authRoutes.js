import express from 'express';
import { db } from '../config/firebase.js';
import verifyJWT from '../middleware/authMiddleware.js';

const router = express.Router();

// =========================================================================
// 1. POST: SUBMIT KUESIONER ONBOARDING (FIRESTORE)
// =========================================================================
router.post('/onboarding', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.uid; // uid dari Firebase Auth
    const { height, weight, experienceLevel, fitnessGoals, mountainPreference } = req.body;

    if (!height || !weight || !experienceLevel || !fitnessGoals || !mountainPreference) {
      return res.status(400).json({ success: false, message: 'Data kuesioner tidak boleh kosong!' });
    }

    const heightInMeter = height / 100;
    const bmiValue = (weight / (heightInMeter * heightInMeter)).toFixed(2);

    let bmiLabel = 'Ideal';
    if (bmiValue < 18.5) bmiLabel = 'Underweight';
    else if (bmiValue >= 23 && bmiValue < 25) bmiLabel = 'Kelebihan Berat Badan';
    else if (bmiValue >= 25) bmiLabel = 'Overweight';

    // Simpan ke Firestore Document NoSQL
    const profileRef = db.collection('profiles').doc(userId);
    await profileRef.set({
      height: height,
      weight: weight,
      experienceLevel: experienceLevel,
      fitnessGoals: fitnessGoals,
      mountainPreference: mountainPreference,
      bmiScore: parseFloat(bmiValue),
      bmiStatus: bmiLabel,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    res.status(200).json({
      success: true,
      message: 'Onboarding Assessment berhasil disimpan ke Firestore!',
      bmiScore: bmiValue,
      bmiStatus: bmiLabel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. GET: AMBIL PROFIL LENGKAP USER (FIRESTORE)
// =========================================================================
router.get('/profile', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.uid;

    const profileRef = db.collection('profiles').doc(userId);
    const doc = await profileRef.get();

    let profileData = {};
    if (doc.exists) {
      profileData = doc.data();
    }

    const responseData = {
      userId: userId,
      fullName: req.user.name || profileData.fullName || 'Pendaki Fit',
      email: req.user.email || '',
      height: profileData.height || 0,
      weight: profileData.weight || 0,
      bmiScore: profileData.bmiScore || 0,
      bmiStatus: profileData.bmiStatus || 'Belum dihitung',
      experienceLevel: profileData.experienceLevel || 'Beginner',
      fitnessGoals: profileData.fitnessGoals || '',
      mountainPreference: profileData.mountainPreference || ''
    };

    res.status(200).json({
      success: true,
      message: 'Data profil Firestore berhasil diambil!',
      data: responseData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 3. PUT: UPDATE PROFIL LENGKAP (FIRESTORE)
// =========================================================================
router.put('/profile/update', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { fullName, height, weight, experienceLevel, fitnessGoals, mountainPreference } = req.body;

    let bmiValue = 0;
    let bmiLabel = 'Ideal';
    
    if (height && weight) {
      const heightInMeter = height / 100;
      bmiValue = parseFloat((weight / (heightInMeter * heightInMeter)).toFixed(2));

      if (bmiValue < 18.5) bmiLabel = 'Underweight';
      else if (bmiValue >= 23 && bmiValue < 25) bmiLabel = 'Kelebihan Berat Badan';
      else if (bmiValue >= 25) bmiLabel = 'Overweight';
    }

    const profileRef = db.collection('profiles').doc(userId);
    await profileRef.set({
      fullName: fullName,
      height: height,
      weight: weight,
      experienceLevel: experienceLevel,
      fitnessGoals: fitnessGoals,
      mountainPreference: mountainPreference,
      bmiScore: bmiValue,
      bmiStatus: bmiLabel,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    res.status(200).json({
      success: true,
      message: 'Profil Firestore berhasil diperbarui!',
      data: {
        bmiScore: bmiValue,
        bmiStatus: bmiLabel
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;