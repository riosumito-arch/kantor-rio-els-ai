# Kantor Rio.Els_AI

## Fitur yang disiapkan

- Beranda menampilkan scene kantor 3D satu lantai. Meja dan kursi workspace bertambah mengikuti jumlah karyawan aktif; figur karyawan memakai jas dan bergerak ringan saat bekerja.
- Logo, nama kantor, dan wallpaper dapat diubah dari **Pengaturan kantor**.
- Login web memakai tautan masuk yang dikirim ke email terdaftar. Akses aplikasi dibatasi untuk anggota kantor yang aktif.
- Menu **Tim & HRD** menyimpan job desk dan pilihan tool per karyawan.
- Pilihan tool adalah Claude AI, OpenAI API, dan ChatGPT melalui OpenAI API. Pilihan ChatGPT memakai `OPENAI_API_KEY`; langganan ChatGPT saja tidak menyediakan akses API.
- Canva tersedia di menu **Platform & unduhan** sebagai tool desain, dengan tautan resmi yang dapat dibuka atau disalin. Canva tidak dijalankan sebagai model AI karyawan.
- **Platform & unduhan** menyediakan sepuluh baris link awal yang dapat diisi dengan copy-paste dan disalin kembali dari menu tersebut. Ini menyimpan tautan; sinkronisasi marketplace tetap memerlukan integrasi API resmi masing-masing platform.
- Menu **Gedung kantor** dihapus dari sidebar; scene tetap menjadi bagian dari beranda.

## Langkah sebelum perubahan dipakai di situs

1. Pastikan akun Supabase yang terhubung memiliki proyek `hmqeukhqwuujrkwnhxdp`.
2. Terapkan kedua migrasi secara berurutan dari folder `supabase/migrations/`: `202611170001_job_descriptions_and_manager_access.sql`, lalu `202611180001_allow_chatgpt_employee_tool.sql`.
3. Deploy ulang fungsi `employee-chat` dan deploy fungsi `manage-company-access`.
4. Atur secrets Supabase Functions: `APP_ORIGIN`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `ANTHROPIC_API_KEY`, dan `ANTHROPIC_MODEL`. Gunakan key server-side; jangan memasukkannya ke berkas web.
5. Pastikan URL situs tercantum di **Supabase Auth → URL Configuration → Redirect URLs** agar tautan login kembali ke web.
6. Terbitkan isi folder ini ke Cloudflare Pages.
