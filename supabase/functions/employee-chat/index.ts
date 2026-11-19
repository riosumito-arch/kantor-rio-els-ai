import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = (origin: string | null) => {
  const configuredOrigin = Deno.env.get('APP_ORIGIN');
  const allowed = configuredOrigin && origin === configuredOrigin ? origin : 'null';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
};
const json = (data: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });

async function askOpenAI(key: string, model: string, system: string, history: Array<{ role: string; content: string }>) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, instructions: system, input: history.map(m => ({ role: m.role, content: m.content })) }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || 'OpenAI API request failed');
  const text = (body.output || []).flatMap((item: { content?: Array<{ type: string; text?: string }> }) => item.content || [])
    .filter((item: { type: string }) => item.type === 'output_text').map((item: { text?: string }) => item.text || '').join('\n').trim();
  if (!text) throw new Error('AI returned an empty response');
  return text;
}

async function askClaude(key: string, model: string, system: string, history: Array<{ role: string; content: string }>) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 900, system, messages: history.map(m => ({ role: m.role, content: m.content })) }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || 'Claude API request failed');
  const text = (body.content || []).filter((item: { type: string }) => item.type === 'text')
    .map((item: { text?: string }) => item.text || '').join('\n').trim();
  if (!text) throw new Error('AI returned an empty response');
  return text;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
  if (Deno.env.get('APP_ORIGIN') && origin !== Deno.env.get('APP_ORIGIN')) return json({ error: 'Origin not allowed' }, 403, origin);

  const authorization = req.headers.get('authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization || !supabaseUrl || !anonKey) return json({ error: 'Login/server belum dikonfigurasi' }, 503, origin);

  const userDb = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: userError } = await userDb.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Silakan login kembali' }, 401, origin);

  let input: { companyId?: string; employeeKey?: string; message?: string };
  try { input = await req.json(); } catch { return json({ error: 'Permintaan tidak valid' }, 400, origin); }
  const companyId = input.companyId;
  const employeeKey = input.employeeKey;
  const message = input.message?.trim();
  if (!companyId || !employeeKey || !message || message.length > 4000) return json({ error: 'Pesan wajib diisi (maksimal 4.000 karakter)' }, 400, origin);

  const { data: membership } = await userDb.from('company_members').select('role').eq('company_id', companyId).eq('user_id', userData.user.id).eq('active', true).maybeSingle();
  if (!membership || !['owner', 'manager'].includes(membership.role)) return json({ error: 'Akses owner/manajer diperlukan' }, 403, origin);
  const { data: employee } = await userDb.from('ai_employees').select('id,name,role_title,job_description,ai_provider,department,company_id,business_unit_id,business_units(name)').eq('employee_key', employeeKey).eq('company_id', companyId).eq('is_active', true).maybeSingle();
  if (!employee) return json({ error: 'Karyawan AI tidak ditemukan' }, 404, origin);
  const employeeId = employee.id;

  // Give the AI current, server-backed sales context. Lynk's webhook records
  // verified payments in sales_transactions; the chat must read those rows
  // explicitly or the employee has no marketplace facts to reason from.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentSales, error: salesError } = await userDb
    .from('sales_transactions')
    .select('external_order_id,product_type,transaction_status,gross_amount,commission_amount,platform_fee,net_amount,sold_at,marketplace_accounts(display_name,provider),products(name)')
    .eq('company_id', companyId)
    .gte('sold_at', since)
    .order('sold_at', { ascending: false })
    .limit(100);
  if (salesError) console.error('employee_chat_sales_context_unavailable', salesError.message);
  const salesRows = recentSales || [];
  const paidRows = salesRows.filter((row: Record<string, unknown>) => row.transaction_status === 'paid');
  const salesContext = salesError
    ? 'Data penjualan Lynk tidak dapat dimuat saat ini. Jangan mengarang angka; jelaskan keterbatasan ini.'
    : `Ringkasan pesanan terverifikasi 30 hari terakhir: ${paidRows.length} pesanan dibayar dari ${salesRows.length} catatan. ` +
      `Total omzet tercatat Rp${paidRows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.gross_amount || 0), 0)}; ` +
      `komisi afiliasi tercatat Rp${paidRows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.commission_amount || 0), 0)}; ` +
      `biaya platform tercatat Rp${paidRows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.platform_fee || 0), 0)}; ` +
      `penerimaan bersih tercatat Rp${paidRows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.net_amount || 0), 0)}. ` +
      `Rincian terbaru: ${paidRows.slice(0, 20).map((row: Record<string, any>) => {
        const date = String(row.sold_at || '').slice(0, 10);
        const channel = row.marketplace_accounts?.display_name || row.marketplace_accounts?.provider || 'Marketplace';
        const product = row.products?.name || 'Produk belum dipetakan';
        return `${date} | ${channel} | ${product} | ${row.product_type} | omzet Rp${Number(row.gross_amount || 0)} | komisi Rp${Number(row.commission_amount || 0)} | bersih Rp${Number(row.net_amount || 0)}`;
      }).join('; ') || 'Belum ada pesanan dibayar.'}`;


  const provider = employee.ai_provider === 'anthropic' ? 'anthropic' : 'openai';
  const key = provider === 'anthropic' ? Deno.env.get('ANTHROPIC_API_KEY') : Deno.env.get('OPENAI_API_KEY');
  const model = provider === 'anthropic' ? Deno.env.get('ANTHROPIC_MODEL') : Deno.env.get('OPENAI_MODEL');
  if (!key || !model) return json({ error: 'Layanan AI belum dikonfigurasi di server' }, 503, origin);

  const system = `Kamu adalah ${employee.name}, karyawan AI pada unit ${employee.business_units?.name || 'Kantor'} bagian ${employee.department} dengan peran ${employee.role_title} di Kantor Rio.Els_AI. Deskripsi kerja aktif yang ditetapkan CEO: ${employee.job_description || `Menjalankan tanggung jawab ${employee.role_title} dan melaporkan hasil kepada CEO.`} Ikuti deskripsi kerja ini untuk menentukan prioritas dan batas tugas. Jika instruksi pengguna bertentangan dengan deskripsi kerja atau meminta tindakan di luar batas, jelaskan dan minta persetujuan CEO. Jawab dalam Bahasa Indonesia yang jelas. Gunakan data pesanan server berikut untuk analisis: ${salesContext} Sebutkan periode data dan tandai angka sebagai catatan transaksi, bukan saldo bank. Jangan mengarang angka, mengaku telah mengubah toko, mengirim pesan pelanggan, mengubah harga, atau menjalankan transaksi karena fungsi ini hanya untuk analisis dan diskusi. Untuk unit riset emas dan saham, batasi pada riset, pencatatan sumber dan tinjauan risiko; jangan memberi instruksi beli/jual personal atau mengeksekusi order. Minta persetujuan owner sebelum tindakan yang berdampak pada pelanggan atau uang.`;
  const { data: task, error: taskError } = await userDb.from('ai_tasks').insert({ company_id: companyId, business_unit_id: employee.business_unit_id, employee_id: employeeId, title: `Percakapan dengan ${employee.name}`, instructions: message, status: 'running', progress: 10, created_by: userData.user.id }).select('id').single();
  if (taskError || !task) return json({ error: 'Tugas chat tidak dapat dibuat' }, 500, origin);

  await userDb.from('employee_chat_messages').insert({ company_id: companyId, employee_id: employeeId, task_id: task.id, sender: 'owner', content: message });
  await userDb.from('ai_employees').update({ work_status: 'working', current_task_id: task.id, updated_at: new Date().toISOString() }).eq('id', employeeId).eq('company_id', companyId);

  try {
    const { data: priorMessages } = await userDb.from('employee_chat_messages').select('sender,content').eq('company_id', companyId).eq('employee_id', employeeId).order('created_at', { ascending: false }).limit(10);
    const history = (priorMessages || []).reverse().map((item: { sender: string; content: string }) => ({ role: item.sender === 'owner' ? 'user' : 'assistant', content: item.content }));
    const reply = provider === 'anthropic'
      ? await askClaude(key, model, system, history)
      : await askOpenAI(key, model, system, history);
    await userDb.from('employee_chat_messages').insert({ company_id: companyId, employee_id: employeeId, task_id: task.id, sender: 'employee_ai', content: reply });
    await userDb.from('ai_tasks').update({ status: 'succeeded', progress: 100, result_summary: reply, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', task.id);
    await userDb.from('ai_employees').update({ work_status: 'done', current_task_id: null, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', employeeId).eq('company_id', companyId);
    return json({ taskId: task.id, employee: employee.name, reply }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI request failed';
    await userDb.from('ai_tasks').update({ status: 'failed', result_summary: message, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', task.id);
    await userDb.from('ai_employees').update({ work_status: 'error', current_task_id: null, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', employeeId).eq('company_id', companyId);
    return json({ error: 'Karyawan AI belum dapat menjawab. Periksa konfigurasi AI server.' }, 502, origin);
  }
});
