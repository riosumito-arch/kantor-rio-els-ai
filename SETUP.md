# Kantor Rio.Els_AI — pembaruan tahap pertama

## Urutan penerapan

1. Terapkan `supabase/migrations/202611170001_job_descriptions_and_manager_access.sql` ke proyek Supabase sebelum menerbitkan website.
2. Terbitkan ulang fungsi `employee-chat` dan terbitkan fungsi baru `manage-company-access`.
3. Pastikan secret Supabase Functions berisi `APP_ORIGIN`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `ANTHROPIC_API_KEY`, dan `ANTHROPIC_MODEL` sesuai layanan yang dipakai. Claude memerlukan secret Anthropic; ChatGPT/OpenAI memakai secret OpenAI.
4. Unggah isi paket website ke Cloudflare Pages.
5. CEO dapat mengundang `elsaangeliany24@gmail.com` dari **Tim & HRD → Akses akun kantor**. Akun mendapat akses penuh sebagai manager; CEO utama dapat menonaktifkannya dari panel yang sama.

## Pengaturan setelah terbit

- Nama perusahaan, logo, platform, dan link dapat diubah dari **Pengaturan kantor**. Jika akun sudah menyimpan logo lama di Supabase, unggah `brand-logo-blue.jpg` sekali pada pengaturan logo agar tersimpan untuk semua anggota.
- Sepuluh link unduhan awal tersedia di **Platform & unduhan**; CEO dapat mengganti atau menambah link tanpa mengedit kode website.
- Deskripsi kerja dan pilihan Claude atau ChatGPT/OpenAI dapat diubah per karyawan dari **Tim & HRD**. Deskripsi itu ditampilkan pada profil kerja dan menjadi arahan pada chat AI berikutnya.
- Scene kantor 3D dapat dibuka dari **Gedung kantor**. Nama perusahaan mengikuti nama yang tersimpan di pengaturan.
