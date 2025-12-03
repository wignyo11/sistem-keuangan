🥬 Equilib System - Sistem Informasi Akuntansi & Agribisnis

**Equilib System** adalah aplikasi manajemen keuangan dan operasional berbasis web yang dirancang khusus untuk UMKM Agribisnis (Studi Kasus: Perusahaan Selada). Sistem ini mendigitalkan seluruh proses bisnis mulai dari pencatatan transaksi hingga pelaporan akuntansi otomatis secara *real-time*.

## Fitur Utama (Key Features)

### 1. Core Accounting Engine
* **Double-Entry System:** Setiap transaksi otomatis menghasilkan jurnal Debit & Kredit yang seimbang (Balance).
* **Accrual Basis:** Mengakui Pendapatan (Piutang) dan Beban (Utang) saat transaksi terjadi, bukan hanya saat kas diterima/keluar.
* **Automated Journaling:** Pengguna tidak perlu paham akuntansi mendalam. Input melalui formulir "pintasan", sistem yang menjurnal otomatis di latar belakang.

### 2. Manajemen Inventori & HPP (Advanced)
* **Metode Perpetual:** Stok ter-update *real-time* setiap ada pembelian atau penjualan.
* **Weighted Average Cost:** Menghitung Harga Pokok Penjualan (HPP) secara otomatis berdasarkan rata-rata harga beli stok yang ada.
* **Jurnal Otomatis:** Saat penjualan terjadi, sistem otomatis menjurnal HPP dan mengurangi nilai persediaan barang dagang.

### 3. Siklus Bisnis Lengkap
* **Penjualan (Sales):** Input Invoice Penjualan, perhitungan PPN Keluaran otomatis, dan pencatatan Piutang Dagang.
* **Pembelian (Purchasing):** Input Pembelian Stok/Beban, perhitungan PPN Masukan, dan pencatatan Utang Usaha.
* **Pelunasan (AR/AP):** Fitur penerimaan pembayaran dari pelanggan dan pembayaran utang ke supplier/vendor.
* **Retur Penjualan:** Menangani pengembalian barang dari pelanggan dengan penyesuaian stok dan piutang otomatis.

### 4. Manajemen Aset Tetap
* **Pencatatan Aset:** Manajemen daftar aset tetap (Kendaraan, Mesin, Bangunan).
* **One-Click Depreciation:** Fitur "Jalankan Penyusutan" untuk menghitung dan membuat Jurnal Penyesuaian (AJE) penyusutan secara otomatis di akhir bulan.

### 5. Laporan Keuangan & Dashboard
* **Dashboard Eksekutif (Sultan Edition):** Ringkasan KPI *real-time* (Kas, Omzet, Laba Bersih), Grafik Tren Profitabilitas, dan Ranking Produk Terlaris.
* **Laporan Laba Rugi (Income Statement):** Menyajikan pendapatan, HPP, dan beban operasional.
* **Laporan Neraca (Balance Sheet):** Format Skontro (Aset = Liabilitas + Ekuitas).
* **Laporan Arus Kas (Cash Flow):** Menggunakan Metode Tidak Langsung (Indirect Method).
* **Buku Besar (General Ledger) & Neraca Saldo.**
* **Buku Besar Pembantu:** Rincian mutasi Utang/Piutang per Kontak.
* **Cetak Invoice PDF:** Generate bukti transaksi profesional siap cetak.

### 6. Keamanan & Multi-User (RBAC)
* **JWT Authentication:** Keamanan login berbasis token dengan mekanisme *auto-refresh* dan persistensi login anti-logout.
* **Role-Based Access Control (RBAC):** Hak akses berbeda untuk setiap peran:
    * **Pemilik:** Akses Penuh (Super Admin).
    * **Akuntan:** Akses Laporan Keuangan, Jurnal Umum, Aset Tetap.
    * **Sales:** Hanya Input Penjualan & Terima Pembayaran (Akses Laporan dibatasi).
    * **Purchasing:** Hanya Input Pembelian & Bayar Utang.


## 🛠️ Tech Stack

### Backend (API & Logic)
* **Language:** Python
* **Framework:** Django & Django REST Framework (DRF)
* **Authentication:** Simple JWT
* **Database:** SQLite (Development) / PostgreSQL (Production/Railway)
* **Utilities:** Pandas (Export Excel), Whitenoise (Static Files)

### Frontend (User Interface)
* **Library:** React.js (Vite)
* **UI Framework:** Ant Design (Antd) - Support Dark Mode
* **State Management:** React Context API (`AuthContext`)
* **HTTP Client:** Axios (dengan Interceptors untuk Token)
* **Visualization:** Recharts (Grafik Dashboard)
* **PDF Generation:** @react-pdf/renderer

---

## Cara Install & Menjalankan (Localhost)

Ikuti langkah ini untuk menjalankan aplikasi di komputer Anda.

### Prasyarat
* Python 3.10+
* Node.js 16+
* Git

### 1. Clone Repository
```bash
git clone [https://github.com/wignyo11/sistem-keuangan.git](https://github.com/wignyo11/sistem-keuangan.git)
cd sistem-keuangan
2. Setup Backend (Django)
Bash

# Masuk ke folder root
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install Library
pip install -r requirements.txt

# Migrasi Database
python manage.py migrate

# Buat Admin
python manage.py createsuperuser

# Jalankan Server
python manage.py runserver
3. Setup Frontend (React)
Buka terminal baru:

Bash

cd frontend-keuangan
npm install
npm run dev
Akses aplikasi di: http://localhost:5173

Deployment
Aplikasi ini telah dikonfigurasi untuk deploy otomatis ke Railway (PaaS).

Backend: Menggunakan Gunicorn & Whitenoise.

Database: Terhubung ke PostgreSQL Railway via dj_database_url.

Security: Menggunakan CSRF_TRUSTED_ORIGINS dan SSL Redirect untuk keamanan produksi.

Copyright © 2025 Group 8 - Equilib System
