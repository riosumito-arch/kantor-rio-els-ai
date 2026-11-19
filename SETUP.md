# Kantor Rio.Els_AI

## Fitur yang disiapkan

- Beranda menampilkan scene kantor 3D satu lantai beserta nama dan status karyawan aktif. Ruang kerja terbuka memakai kelompok meja empat orang, menyediakan sedikitnya 32 kursi untuk tim hingga 32 orang, lalu memanjang otomatis setiap kali perlu satu baris kelompok baru. Denah juga menampilkan ruang CEO, Finance, HRD, arsip, lounge, dan area kopi.
- Logo mahkota ER memakai latar biru muda. Berkas `brand-logo-source.jpeg` harus diunggah berdampingan dengan `ruang3d.html` dan `app.js` agar logo muncul pada website dan scene 3D.
- Logo, nama kantor, dan wallpaper dapat diubah dari **Pengaturan kantor**.
- Login web memakai email dan kata sandi. Pemulihan kata sandi menggunakan email Supabase.
- Menu **Email masuk** menampilkan inbox Gmail dengan izin baca saja. Hubungkan Google OAuth Client ID setelah Gmail API diaktifkan di Google Cloud; asal JavaScript yang diizinkan harus sama dengan domain situs.
- Menu **Tim & HRD** menyimpan job desk dan pilihan tool per karyawan.
- Pilihan tool adalah Claude AI, OpenAI API, dan ChatGPT melalui OpenAI API. Pilihan ChatGPT memakai `OPENAI_API_KEY`; langganan ChatGPT saja tidak menyediakan akses API.
- Canva tersedia di menu **Platform & unduhan** sebagai tool desain, dengan tautan resmi yang dapat dibuka atau disalin. Canva tidak dijalankan sebagai model AI karyawan.
- **Platform & unduhan** menyediakan sepuluh baris link awal yang dapat diisi dengan copy-paste dan disalin kembali dari menu tersebut. Ini menyimpan tautan; sinkronisasi marketplace tetap memerlukan integrasi API resmi masing-masing platform.
- Tidak ada menu **Kantor** terpisah; scene tetap tampil langsung di beranda.

## Langkah sebelum perubahan dipakai di situs

1. Pastikan akun Supabase yang terhubung memiliki proyek `hmqeukhqwuujrkwnhxdp`.
2. Terapkan kedua migrasi secara berurutan dari folder `supabase/migrations/`: `202611170001_job_descriptions_and_manager_access.sql`, lalu `202611180001_allow_chatgpt_employee_tool.sql`.
3. Deploy ulang fungsi `employee-chat` dan deploy fungsi `manage-company-access`.
4. Atur secrets Supabase Functions: `APP_ORIGIN`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `ANTHROPIC_API_KEY`, dan `ANTHROPIC_MODEL`. Gunakan key server-side; jangan memasukkannya ke berkas web.
5. Untuk Gmail, aktifkan Gmail API di Google Cloud Console, buat OAuth Client ID tipe Web, tambahkan domain situs di **Authorized JavaScript origins**, lalu tempel Client ID pada menu **Email masuk**. Akses inbox hanya memakai scope `gmail.readonly`.
6. Pastikan URL situs tercantum di **Supabase Auth → URL Configuration → Redirect URLs** agar tautan reset kembali ke web.
7. Terbitkan isi folder ini ke Cloudflare Pages.


## Login email and password

- Website login uses email and password so normal sign-ins do not send an email each time. Existing accounts need one password reset if their password is unknown.
- Supabase built-in email is limited to 2 messages per hour for the entire project. Configure a custom SMTP sender before resetting passwords or inviting more members, then set the Auth email rate limit to a value your email provider supports. Do not disable email confirmation to bypass the limit.
- In Supabase **Authentication → SMTP Settings**, configure sender address, SMTP host, port, username, and password. Keep SMTP credentials in Supabase, not in this repository.
- In **Authentication → URL Configuration**, set the production Site URL and add the production URL plus the active Cloudflare Pages preview under Redirect URLs. Replace the preview entry with the owned `.com` domain after it is connected.

## Remaining external setup

- Apply both migrations in order and deploy `employee-chat` and `manage-company-access`.
- Set the listed AI provider secrets in Supabase Edge Function secrets.
- Gmail requires a Google OAuth Client ID and the Gmail API enabled in Google Cloud; it cannot use the Brevo SMTP key.
- Connect the owned `.com` domain to Cloudflare Pages. The preview address is not the final company address.
- Marketplace entries are links with copy/paste support. Automatic shop/account connections require a separate official API/OAuth integration and credentials for each platform.
