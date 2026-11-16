export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Tangani rute webhook Lynk.id
    if (url.pathname === '/api/lynk-webhook') {
      // Terima GET (untuk Test URL) dan POST (untuk data asli)
      if (request.method === 'GET' || request.method === 'POST') {
        try {
          // Untuk POST, coba baca body (jika ada)
          let body = null;
          if (request.method === 'POST') {
            body = await request.json();
            console.log('Data dari Lynk.id:', body);
          } else {
            console.log('Test GET dari Lynk.id diterima');
          }
          
          // Kirim respons sukses
          return new Response(JSON.stringify({ status: 'ok', message: 'Webhook is ready' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e) {
          return new Response('Bad Request', { status: 400 });
        }
      }
    }
    
    // Untuk rute lain (seperti halaman utama), serahkan ke aset statis
    return env.ASSETS.fetch(request);
  }
};
