import requests
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
import datetime

# ==========================================
# 1. INISIALISASI FIREBASE
# ==========================================
# Membaca token rahasia yang akan disuntikkan oleh GitHub Actions
cred = credentials.Certificate("firebase-service-account.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# ==========================================
# 2. MASTER DATA 3 GUNUNG & KOORDINAT JALUR
# ==========================================
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

# ==========================================
# 3. FUNGSI ANALISIS SISTEM PAKAR (BIG DATA)
# ==========================================
def jalankan_sistem_pakar(gunung):
    print(f"\n🔍 Menganalisis {gunung['nama']}...")
    
    jalur_terbaik = None
    skor_tertinggi = -9999
    alasan_terbaik = ""

    # Looping setiap jalur di gunung tersebut
    for jalur in gunung['jalur']:
        # Menarik data cuaca 14 Hari kebelakang dari Open-Meteo
        url = f"https://api.open-meteo.com/v1/forecast?latitude={jalur['lat']}&longitude={jalur['lon']}&past_days=14&daily=precipitation_sum,wind_speed_10m_max&timezone=Asia%2FJakarta"
        
        try:
            response = requests.get(url).json()
            
            # --- INTEGRASI KODE PANDAS (DARI UTS BIG DATA) ---
            # Memasukkan data JSON Harian ke dalam DataFrame Pandas
            df = pd.DataFrame(response['daily'])
            
            # Mencari total curah hujan dan maksimal angin selama 14 hari
            total_hujan = df['precipitation_sum'].sum()
            max_angin = df['wind_speed_10m_max'].max()
            
            # Algoritma Penilaian (Semakin kecil hujan & angin, skor semakin tinggi)
            skor_keamanan = 100 - (total_hujan * 0.5) - (max_angin * 1.2)
            
            print(f"   -> {jalur['nama']}: Hujan {total_hujan:.1f}mm, Angin {max_angin}km/h | Skor Keamanan: {skor_keamanan:.1f}")

            # Seleksi Jalur Pemenang
            if skor_keamanan > skor_tertinggi:
                skor_tertinggi = skor_keamanan
                jalur_terbaik = jalur['nama']
                alasan_terbaik = f"Berdasarkan analisis deret waktu, rute ini memiliki iklim mikro paling stabil. Akumulasi curah hujan hanya {total_hujan:.1f} mm dengan angin maksimal {max_angin} km/h dalam 14 hari terakhir."

        except Exception as e:
            print(f"   [!] Gagal mengambil data di {jalur['nama']}: {e}")

    # ==========================================
    # 4. SIMPAN HASIL KE DATABASE FIREBASE
    # ==========================================
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
        print(f"⭐ PEMENANG {gunung['nama']}: {jalur_terbaik} berhasil disimpan ke Firebase!")

if __name__ == "__main__":
    print(f"=== CRON JOB DIMULAI: {datetime.datetime.now()} ===")
    for g in master_gunung:
        jalankan_sistem_pakar(g)
    print("\n=== CRON JOB SELESAI ===")