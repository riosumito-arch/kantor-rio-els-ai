import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (data: unknown, status: number, origin: string | null) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Access-Control-Allow-Origin': origin && origin === Deno.env.get('APP_ORIGIN') ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  },
});

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: {
    'Access-Control-Allow-Origin': origin && origin === Deno.env.get('APP_ORIGIN') ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
  } });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
  if (Deno.env.get('APP_ORIGIN') && origin !== Deno.env.get('APP_ORIGIN')) return json({ error: 'Origin not allowed' }, 403, origin);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('authorization');
  if (!url || !anonKey || !serviceKey || !authorization) return json({ error: 'Server belum dikonfigurasi' }, 503, origin);

  const userDb = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await userDb.auth.getUser();
  if (authError || !authData.user) return json({ error: 'Silakan login kembali' }, 401, origin);

  let input: { action?: string; companyId?: string; email?: string; userId?: string };
  try { input = await req.json(); } catch { return json({ error: 'Permintaan tidak valid' }, 400, origin); }
  if (!input.companyId || !['invite', 'deactivate'].includes(input.action || '')) return json({ error: 'Aksi atau kantor tidak valid' }, 400, origin);

  const { data: company, error: companyError } = await admin.from('companies').select('id,owner_user_id').eq('id', input.companyId).maybeSingle();
  if (companyError || !company || company.owner_user_id !== authData.user.id) return json({ error: 'Hanya CEO utama yang dapat mengatur akses kantor' }, 403, origin);

  if (input.action === 'invite') {
    const email = input.email?.trim().toLowerCase();
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Alamat email tidak valid' }, 400, origin);
    if (email === authData.user.email?.toLowerCase()) return json({ error: 'Email CEO sudah memiliki akses' }, 400, origin);
    const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) return json({ error: 'Akun email belum dapat diperiksa' }, 500, origin);
    let user = users.users.find(item => item.email?.toLowerCase() === email);
    let inviteSent = false;
    if (!user) {
      const redirectTo = Deno.env.get('APP_ORIGIN') || origin || undefined;
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (error || !data.user) return json({ error: error?.message || 'Undangan email gagal dikirim' }, 400, origin);
      user = data.user; inviteSent = true;
    }
    if (user.id === company.owner_user_id) return json({ error: 'Akun CEO utama tidak dapat diubah' }, 400, origin);
    const { error: membershipError } = await admin.from('company_members').upsert({
      company_id: company.id, user_id: user.id, email, role: 'manager', active: true,
    }, { onConflict: 'company_id,user_id' });
    if (membershipError) return json({ error: 'Akun ditemukan tetapi akses kantor belum tersimpan' }, 500, origin);
    return json({ success: true, inviteSent, email }, 200, origin);
  }

  if (!input.userId || input.userId === company.owner_user_id) return json({ error: 'Akun CEO utama tidak dapat dinonaktifkan' }, 400, origin);
  const { data: member, error: deactivateError } = await admin.from('company_members')
    .update({ active: false }).eq('company_id', company.id).eq('user_id', input.userId)
    .select('user_id').maybeSingle();
  if (deactivateError || !member) return json({ error: 'Anggota kantor tidak ditemukan atau akses gagal dinonaktifkan' }, 400, origin);
  return json({ success: true }, 200, origin);
});
