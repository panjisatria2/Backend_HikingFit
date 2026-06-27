import { db } from '../config/firebase.js';

export const getWeatherHistory = async (req, res) => {
  try {
    const { trailName } = req.params; 
    
    const doc = await db.collection('weather_history').doc(trailName).get();

    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Data grafik cuaca belum tersedia dari satelit.' 
      });
    }

    res.status(200).json({ success: true, data: doc.data() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};