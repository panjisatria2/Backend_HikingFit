import { db } from '../config/firebase.js';

// CREATE: Tambah Gunung Baru
export const createMountain = async (req, res) => {
  try {
    const { name, location, elevation, status, description, imageUrl, latitude, longitude, difficulty } = req.body;
    
    // Validasi dasar
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude dan Longitude wajib diisi untuk mendeteksi cuaca!' });
    }

    const newMountain = { 
      name, 
      location, 
      elevation: Number(elevation), 
      difficulty: difficulty || 'Medium',
      status, 
      description: description || '', 
      imageUrl: imageUrl || '', // <--- Menerima Link Gambar dari Web React
      latitude: Number(latitude),
      longitude: Number(longitude),
      createdAt: new Date().toISOString() 
    };
    
    const docRef = await db.collection('mountains').add(newMountain);
    res.status(201).json({ success: true, message: 'Gunung berhasil ditambahkan', id: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menambah gunung', error: error.message });
  }
};

// READ: Ambil Semua Data Gunung + Cuaca Real-time (Open-Meteo)
export const getAllMountains = async (req, res) => {
  try {
    const snapshot = await db.collection('mountains').get();
    const mountains = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Gunakan Promise.all untuk mengambil cuaca secara paralel (bersamaan)
    const mountainsWithWeather = await Promise.all(mountains.map(async (mountain) => {
      let currentTemperature = null;
      
      try {
        if (mountain.latitude && mountain.longitude) {
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${mountain.latitude}&longitude=${mountain.longitude}&current_weather=true`;
          const weatherRes = await fetch(weatherUrl);
          const weatherData = await weatherRes.json();
          
          if (weatherData && weatherData.current_weather) {
            currentTemperature = weatherData.current_weather.temperature; 
          }
        }
      } catch (err) {
        console.error(`Gagal mengambil cuaca untuk ${mountain.name}:`, err.message);
      }

      return { 
        ...mountain, 
        weather: currentTemperature ? `${currentTemperature}°C` : 'N/A'
      };
    }));

    res.status(200).json({ success: true, data: mountainsWithWeather });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data', error: error.message });
  }
};

// READ: Ambil Detail 1 Gunung + Cuaca Real-time
export const getMountainById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('mountains').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Gunung tidak ditemukan' });
    }

    const mountain = { id: doc.id, ...doc.data() };
    let currentTemperature = null;

    try {
      if (mountain.latitude && mountain.longitude) {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${mountain.latitude}&longitude=${mountain.longitude}&current_weather=true`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();
        if (weatherData && weatherData.current_weather) {
          currentTemperature = weatherData.current_weather.temperature;
        }
      }
    } catch (err) {
      console.error(`Gagal cuaca:`, err.message);
    }

    mountain.weather = currentTemperature ? `${currentTemperature}°C` : 'N/A';

    res.status(200).json({ success: true, data: mountain });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail gunung', error: error.message });
  }
};

// UPDATE: Edit Data Gunung
export const updateMountain = async (req, res) => {
  try {
    const { id } = req.params;
    // req.body otomatis membawa semua data yang diedit dari React, termasuk imageUrl baru jika ada
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    
    await db.collection('mountains').doc(id).update(updateData);
    res.status(200).json({ success: true, message: 'Data gunung berhasil diupdate' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal update gunung', error: error.message });
  }
};

// DELETE: Hapus Gunung
export const deleteMountain = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('mountains').doc(id).delete();
    res.status(200).json({ success: true, message: 'Gunung berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus gunung', error: error.message });
  }
};