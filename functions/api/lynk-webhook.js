export async function onRequest(context) {
  const { request, env } = context;

  // Jika Lynk.id mengirim GET (untuk Test URL)
  if (request.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', message: 'Webhook is ready' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Jika Lynk.id mengirim POST (untuk data asli)
  if (request.method === 'POST') {
    const body = await request.json();
    const signature = request.headers.get('X-Lynk-Signature');
    const merchantKey = env.LYNK_MERCHANT_KEY;

    if (!signature || !merchantKey) {
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('Data dari Lynk.id:', body);
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Jika metode lain, tolak
  return new Response('Method Not Allowed', { status: 405 });
}
