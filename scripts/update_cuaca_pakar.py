import requests
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
import datetime
import os

# ==========================================
# 1. INISIALISASI FIREBASE
# ==========================================
# Cek apakah jalan di lokal atau di GitHub Actions
cred_path = "config/firebase-service-account.json"
if not os.path.exists(cred_path):
    # Kalau di root directory (misal saat cron github jalan)
    cred_path = "firebase-service-account.json" 

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

master_gunung = [
    {
        "id_doc": "slamet", 
        "nama": "Gunung Slamet", 
        "jalur": [
            {"nama": "Bambangan", "lat": -7.2188, "lon": 109.2550},
            {"nama": "Dipajaya", "lat": -7.1990, "lon": 109.2601},
            {"nama": "Guci", "lat": -7.1975, "lon": 109.1664}
        ]
    },
    {
        "id_doc": "prau", 
        "nama": "Gunung Prau", 
        "jalur": [
            {"nama": "Patak Banteng", "lat": -7.2105, "lon": 109.9234},
            {"nama": "Dieng", "lat": -7.2023, "lon": 109.9078},
            {"nama": "Wates", "lat": -7.1852, "lon": 109.9451}
        ]
    },
    {
        "id_doc": "merbabu", 
        "nama": "Gunung Merbabu", 
        "jalur": [
            {"nama": "Selo", "lat": -7.4812, "lon": 110.4501},
            {"nama": "Suwanting", "lat": -7.4650, "lon": 110.4205},
            {"nama": "Wekas", "lat": -7.4121, "lon": 110.4287}
        ]
    }
]

def jalankan_sistem_pakar(gunung):
    print(f"\n🔍 Menganalisis & Menyimpan Data {gunung['nama']}...")
    
    jalur_terbaik = None
    skor_tertinggi = -9999
    alasan_terbaik = ""

    for jalur in gunung['jalur']:
        # Tarik data suhu dan angin 14 hari ke belakang
        url = f"https://api.open-meteo.com/v1/forecast?latitude={jalur['lat']}&longitude={jalur['lon']}&past_days=14&forecast_days=1&daily=precipitation_sum,wind_speed_10m_max,temperature_2m_max&timezone=Asia%2FJakarta"
        
        try:
            response = requests.get(url).json()
            df = pd.DataFrame(response['daily'])
            
            # --- SIMPAN HISTORI 7 HARI KE FIREBASE ---
            temp_history = df['temperature_2m_max'].tail(7).tolist()
            wind_history = df['wind_speed_10m_max'].tail(7).tolist()
            dates = df['time'].tail(7).tolist()

            db.collection("weather_history").document(jalur['nama']).set({
                "mountainId": gunung['id_doc'],
                "trailName": jalur['nama'],
                "dates": dates,
                "tempHistory": temp_history,
                "windHistory": wind_history,
                "lastUpdated": firestore.SERVER_TIMESTAMP
            })
            print(f"   [+] Data Grafik Suhu & Angin '{jalur['nama']}' disimpan ke Firebase!")

            # --- ANALISIS BIG DATA (14 HARI) ---
            total_hujan = df['precipitation_sum'].sum()
            max_angin = df['wind_speed_10m_max'].max()
            
            skor_keamanan = 100 - (total_hujan * 0.5) - (max_angin * 1.2)
            
            if skor_keamanan > skor_tertinggi:
                skor_tertinggi = skor_keamanan
                jalur_terbaik = jalur['nama']
                alasan_terbaik = f"Berdasarkan analisis deret waktu, rute ini memiliki iklim mikro paling stabil. Akumulasi hujan hanya {total_hujan:.1f} mm dengan angin maksimal {max_angin} km/h."

        except Exception as e:
            print(f"   [!] Gagal memproses {jalur['nama']}: {e}")

    if jalur_terbaik:
        hasil_analisis = {
            "gunungId": gunung['id_doc'],
            "namaGunung": gunung['nama'],
            "jalurTerbaik": jalur_terbaik,
            "alasan": alasan_terbaik,
            "skor": round(skor_tertinggi, 1),
            "terakhirUpdate": firestore.SERVER_TIMESTAMP
        }
        db.collection("rekomendasi_cuaca").document(gunung['id_doc']).set(hasil_analisis)
        print(f"⭐ PEMENANG {gunung['nama']}: {jalur_terbaik} berhasil disimpan!")

if __name__ == "__main__":
    print(f"=== CRON JOB DIMULAI: {datetime.datetime.now()} ===")
    for g in master_gunung:
        jalankan_sistem_pakar(g)
    print("\n=== CRON JOB SELESAI ===")