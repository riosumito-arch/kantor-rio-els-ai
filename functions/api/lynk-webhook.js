export async function onRequestPost(context) {
  const { request, env } = context;
  
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  const body = await request.json();
  
  console.log('--- HEADERS DARI LYNK.ID ---');
  console.log(JSON.stringify(headers));
  console.log('--- BODY DARI LYNK.ID ---');
  console.log(JSON.stringify(body));

  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
