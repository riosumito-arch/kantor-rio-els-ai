-- Live, editable job instructions for each AI employee.
alter table public.companies
  add column if not exists platform_links jsonb not null default '{}'::jsonb,
  add column if not exists download_links jsonb not null default '[]'::jsonb;

update public.companies set download_links = '[
  {"label":"Claude","url":"https://claude.ai/"},
  {"label":"ChatGPT","url":"https://chatgpt.com/"},
  {"label":"OpenAI API Platform","url":"https://platform.openai.com/"},
  {"label":"Anthropic Console","url":"https://console.anthropic.com/"},
  {"label":"Lynk.id","url":"https://www.lynk.id/"},
  {"label":"Shopee Seller Centre","url":"https://seller.shopee.co.id/"},
  {"label":"TikTok Shop & Tokopedia Seller Center","url":"https://seller-id.tiktok.com/"},
  {"label":"MetaTrader 4","url":"https://www.metatrader4.com/en"},
  {"label":"MetaTrader 5","url":"https://www.metatrader5.com/en/download"},
  {"label":"Stockbit","url":"https://stockbit.com/"}
]'::jsonb where download_links = '[]'::jsonb;

alter table public.ai_employees
  add column if not exists job_description text not null default '',
  add column if not exists ai_provider text not null default 'openai';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ai_employees_ai_provider_check') then
    alter table public.ai_employees add constraint ai_employees_ai_provider_check check (ai_provider in ('openai','anthropic'));
  end if;
end $$;

update public.ai_employees
set job_description = case department
  when 'Penjualan' then 'Mengelola penjualan pada kanal yang ditugaskan, memantau pesanan dan performa produk, lalu melaporkan peluang serta kendala kepada CEO. Jangan mengubah harga, mengirim pesan pelanggan, atau menjalankan transaksi tanpa persetujuan CEO.'
  when 'Keuangan' then 'Memeriksa catatan omzet, biaya, komisi, dan penerimaan; menyiapkan ringkasan keuangan serta menandai data yang belum lengkap. Tidak memindahkan uang atau mengirim pelaporan pajak tanpa persetujuan CEO.'
  when 'HRD' then 'Menjaga data tim, memperbarui deskripsi kerja, membantu pembagian tugas, dan merangkum kebutuhan karyawan untuk keputusan CEO.'
  when 'Gudang' then 'Memantau catatan stok dan pesanan produk, menandai selisih atau stok rendah, serta menyiapkan ringkasan operasional gudang.'
  when 'Administrasi' then 'Menjaga dokumentasi operasional tetap rapi, memeriksa kelengkapan data, dan membantu menyiapkan laporan internal.'
  when 'Editor' then 'Menyusun dan meninjau konten serta aset produk perusahaan sesuai arahan CEO sebelum dipublikasikan.'
  when 'Layanan Pelanggan' then 'Menganalisis pertanyaan dan keluhan pelanggan, menyiapkan draf jawaban yang sopan, dan meminta persetujuan sebelum mengirim balasan.'
  when 'Riset Produk' then 'Meneliti tren, kompetitor, dan peluang produk dengan mencatat sumber serta rekomendasi untuk ditinjau CEO.'
  when 'Riset Emas' then 'Mengumpulkan data pasar emas dan membuat ringkasan skenario serta risiko untuk ditinjau CEO; tidak memberi instruksi transaksi personal.'
  when 'Riset Saham' then 'Mengumpulkan data pasar saham dan membuat ringkasan skenario serta risiko untuk ditinjau CEO; tidak memberi instruksi transaksi personal.'
  else 'Menjalankan tugas pada divisi ' || department || ' sesuai arahan CEO, menyampaikan hasil dan kendala, serta meminta persetujuan sebelum tindakan yang berdampak pada pelanggan atau uang.'
end
where coalesce(trim(job_description), '') = '';

-- The CEO can invite full-access managers and revoke them later. Viewers remain read-only.
alter table public.company_members add column if not exists email text;
update public.company_members m set email = u.email
from auth.users u where u.id = m.user_id and m.email is null;

create or replace function public.has_company_write_access(target_company uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = target_company
      and m.user_id = auth.uid()
      and m.active
      and m.role in ('owner','manager','staff')
  );
$$;

revoke all on function public.has_company_write_access(uuid) from public;
grant execute on function public.has_company_write_access(uuid) to authenticated;

drop policy if exists "owners read companies" on public.companies;
create policy "members read companies" on public.companies
  for select to authenticated using (public.has_company_access(id));
drop policy if exists "owners manage companies" on public.companies;
create policy "company writers update companies" on public.companies
  for update to authenticated using (public.has_company_write_access(id))
  with check (public.has_company_write_access(id));

do $$
declare t text;
begin
  foreach t in array array['ai_employees','ai_tasks','employee_chat_messages','task_events','marketplace_accounts','products','product_assets','sales_transactions','webhook_receipts','audit_logs'] loop
    execute format('drop policy if exists %I on public.%I', t || '_members_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_company_write_access(company_id))', t || '_members_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_members_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_company_write_access(company_id)) with check (public.has_company_write_access(company_id))', t || '_members_update', t);
  end loop;
end $$;

drop policy if exists "employee marketplace assignments owner manage" on public.employee_marketplace_assignments;
create policy "employee marketplace assignments company writers manage"
  on public.employee_marketplace_assignments for all to authenticated
  using (public.has_company_write_access(company_id))
  with check (public.has_company_write_access(company_id));

drop policy if exists "company brand assets owner upload" on storage.objects;
create policy "company brand assets company writers upload"
  on storage.objects for insert to authenticated with check (
    bucket_id = 'company-brand-assets'
    and public.has_company_write_access((storage.foldername(name))[1]::uuid)
  );
drop policy if exists "company brand assets owner update" on storage.objects;
create policy "company brand assets company writers update"
  on storage.objects for update to authenticated using (
    bucket_id = 'company-brand-assets'
    and public.has_company_write_access((storage.foldername(name))[1]::uuid)
  ) with check (
    bucket_id = 'company-brand-assets'
    and public.has_company_write_access((storage.foldername(name))[1]::uuid)
  );
drop policy if exists "company brand assets owner delete" on storage.objects;
create policy "company brand assets company writers delete"
  on storage.objects for delete to authenticated using (
    bucket_id = 'company-brand-assets'
    and public.has_company_write_access((storage.foldername(name))[1]::uuid)
  );
