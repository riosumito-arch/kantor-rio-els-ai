export async function onRequestPost(context) {
  const { request, env } = context;
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
