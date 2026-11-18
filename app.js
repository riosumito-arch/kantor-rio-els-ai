import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://hmqeukhqwuujrkwnhxdp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Yh97FpuxKJp8R4ARWhd2HQ_ZkUWEgQQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const $ = (id) => document.getElementById(id);
const appState = { user: null, companyId: null, company: null, employees: [], sales: [], products: [], channels: [], units: [], activeEmployee: null, month: new Date(), messages: [] };
const defaultPlatformLabels = {lynk:'Lynk.id',shopee:'Shopee',tiktok_tokopedia:'TikTok Shop & Tokopedia',mt4:'Riset emas · MetaTrader 4 (MT4)',mt5:'Riset emas · MetaTrader 5 (MT5)',stockbit:'Riset saham · Stockbit'};
function assetUrl(path){return path?supabase.storage.from('company-brand-assets').getPublicUrl(path).data.publicUrl:''}
function renderBrandAsset(el,path,fallback){if(!el)return;const url=assetUrl(path);el.textContent=url?'':fallback;if(url){el.style.backgroundImage=`url("${url}")`;el.classList.add('image-mark')}else{el.style.backgroundImage='';el.classList.remove('image-mark')}}
function renderCompany(){const c=appState.company||{};const name=c.name||'Kantor Rio.Els_AI';document.title=name;['homeCompanyName','introCompanyName'].forEach(id=>{if($(id))$(id).textContent=name});$('sideCompanyName').textContent=name.replace(/^Kantor\s+/i,'');$('buildingCompanyName').textContent=`${name.toUpperCase()} · HEAD OFFICE`;$('loginArtName').firstChild.textContent=name.toUpperCase();$('loginBrandName').textContent=name.toUpperCase();$('introText').textContent=c.intro_text||'Perusahaan digital yang dikelola bersama tim AI untuk meneliti produk, memasarkan produk, melayani pelanggan, dan memantau kinerja usaha.';[...document.querySelectorAll('.brand-mark')].forEach(el=>renderBrandAsset(el,c.logo_path,(name.trim()[0]||'R').toUpperCase()));const building=document.querySelector('.building');const wallpaper=assetUrl(c.wallpaper_path);building.style.backgroundImage=wallpaper?`linear-gradient(110deg,rgba(13,24,45,.90),rgba(13,24,45,.75)),url("${wallpaper}")`:'';building.style.backgroundSize='cover';building.style.backgroundPosition='center';$('companyNameInput').value=c.name||'';$('companyIntroInput').value=c.intro_text||'';document.querySelectorAll('[data-platform-label]').forEach(input=>input.value=(c.platform_labels||{})[input.dataset.platformLabel]||defaultPlatformLabels[input.dataset.platformLabel]||'')}
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));
const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badgeStatus = (s) => ({working:'Bekerja',moving:'Berpindah',meeting:'Rapat',break:'Istirahat',done:'Selesai',error:'Perlu bantuan',waiting:'Menunggu'})[s] || 'Menunggu';
const iconFor = (dept='') => ({Penjualan:'✦',Keuangan:'▤',Gudang:'▣',HRD:'♙','Riset Produk':'⌕','Riset Emas':'◈','Riset Saham':'▥',Editor:'✎','Layanan Pelanggan':'✉',Administrasi:'✧'})[dept] || '✦';
const showToast = (msg) => { const t=$('toast'); t.textContent=msg; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),3600); };
function showLogin(message='') { $('loginScreen').classList.remove('hidden'); $('app').classList.add('hidden'); if(message) $('loginNotice').textContent=message; }
function showApp() { $('loginScreen').classList.add('hidden'); $('app').classList.remove('hidden'); $('sideEmail').textContent=appState.user?.email || 'Owner'; }

async function requestLogin(e) {
  e.preventDefault();
  const email = $('email').value.trim();
  const password = $('password').value; // Pastikan input id="password" ada di HTML
  const btn = $('loginBtn'); 
  
  if(!password) { 
    $('loginNotice').textContent = 'Silakan masukkan PIN / Kata Sandi.'; 
    return; 
  }

  btn.disabled = true; 
  btn.textContent = 'Memproses...';

  // Coba Login
  let { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Jika gagal karena akun belum ada, otomatis daftarkan
  if (error && error.message.includes('Invalid login credentials')) {
    const signUp = await supabase.auth.signUp({ email, password });
    if (signUp.error) {
       $('loginNotice').textContent = `Gagal: ${signUp.error.message}`;
    } else {
       $('loginNotice').textContent = 'Akun berhasil dibuat! Silakan klik tombol Masuk lagi.';
    }
  } else if (error) {
    $('loginNotice').textContent = `Gagal masuk: ${error.message}`;
  } else {
    // Jika sukses login, langsung buka aplikasi
    bootSession(data.session);
  }

  btn.disabled = false; 
  btn.textContent = 'Masuk ke Kantor';
}

async function bootSession(session) {
  if (!session?.user) { appState.user=null; showLogin(); return; }
  
  const {data:membership,error:memberError}=await supabase.from('company_members').select('company_id,role').eq('user_id',session.user.id).eq('active',true).eq('role','owner').limit(1).maybeSingle();
  
  if(memberError || !membership){
    await supabase.auth.signOut();
    showLogin('Email ini belum terdaftar sebagai owner. Pastikan Anda sudah membuat akun.');
    return;
  }
  
  appState.user=session.user; 
  appState.companyId=membership.company_id;
  
  await refreshData(); 
  showApp(); 
}

async function refreshData() {
  if (!appState.companyId) return;
  const c=appState.companyId;
  const [company,emps,sales,products,channels,units] = await Promise.all([
    supabase.from('companies').select('name,logo_path,wallpaper_path,platform_labels,intro_text').eq('id',c).single(),
    supabase.from('ai_employees').select('id,employee_key,name,department,role_title,assigned_channel,floor,work_status,current_location,current_task_id,is_active,business_unit_id,avatar_path').eq('company_id',c).eq('is_active',true).order('floor').order('name'),
    supabase.from('sales_transactions').select('id,product_type,transaction_status,gross_amount,commission_amount,platform_fee,net_amount,sold_at,products(name),marketplace_accounts(provider,display_name)').eq('company_id',c).order('sold_at',{ascending:false}).limit(1000),
    supabase.from('products').select('id,name,product_type,status,source_url,created_at').eq('company_id',c).order('created_at',{ascending:false}).limit(200),
    supabase.from('marketplace_accounts').select('id,provider,display_name,connection_status,last_sync_at,last_error').eq('company_id',c).order('created_at'),
    supabase.from('business_units').select('id,code,name,unit_type').eq('company_id',c).eq('is_active',true)
  ]);
  if (emps.error) showToast('Data kantor belum bisa dimuat: '+emps.error.message);
  appState.company=company.data||{}; appState.employees=emps.data||[]; appState.sales=sales.data||[]; appState.products=products.data||[]; appState.channels=channels.data||[]; appState.units=units.data||[]; renderCompany();
  $('connectionBadge').textContent='Terhubung ke server'; $('connectionBadge').style.color='#25775e';
  renderHome(); renderEmployees(); renderSales(); renderProducts(); renderChannels(); renderReports(); renderChatList();
}

function renderHome() {
  const paid=appState.sales.filter(x=>x.transaction_status==='paid');
  $('statRevenue').textContent=fmt(paid.reduce((s,x)=>s+Number(x.gross_amount||0),0));
  const working=appState.employees.filter(x=>['working','moving'].includes(x.work_status)).length;
  const meetings=appState.employees.filter(x=>x.work_status==='meeting').length;
  $('statWork').textContent=`${working} bekerja · ${meetings} rapat`;
  $('statEmployees').textContent=`${appState.employees.length} orang`;
  $('unitCaption').textContent=`Owner Rio · ${new Set(appState.employees.map(x=>x.department)).size} fungsi kerja`;
  const groups={3:[],2:[],1:[]}; appState.employees.forEach(e=>{(groups[e.floor]||groups[1]).push(e)});
  const roomsByFloor={3:[['LAB RISET','Leo memantau tren dan peluang produk.',['Riset Produk']],['STUDIO PRODUK SENDIRI','Eliss menyiapkan aset digital milik perusahaan.',['Editor']]],2:[['KANTOR OWNER','Pusat pemantauan dan kendali usaha.',['Owner']],['KEUANGAN & HRD','Laporan, arus kas, dan pengelolaan tim.',['Keuangan','HRD','Administrasi']]],1:[['TIM PENJUALAN','Ryan memimpin penjualan per kanal.',['Penjualan']],['LAYANAN PELANGGAN','Tim dukungan pelanggan per platform.',['Layanan Pelanggan']],['GUDANG & OPERASI','Stok dan kesiapan produk sendiri.',['Gudang']]]};
  $('floorMap').innerHTML=[3,2,1].map(n=>`<div class="floor"><div class="floor-tag"><strong>0${n}</strong><span>${n===3?'RISET & PRODUK':n===2?'OWNER & SDM':'OPERASI TOKO'}</span></div><div class="rooms">${roomsByFloor[n].map(([title,desc,depts])=>{let members=n===2&&title==='KANTOR OWNER'?[]:groups[n].filter(x=>depts.includes(x.department));if(title==='KANTOR OWNER')return `<div class="room"><h3>${title}</h3><p>${desc}</p><div class="people"><button class="person" data-owner-chat><span class="avatar">👤</span>Rio · Owner</button></div></div>`;return `<div class="room ${title.includes('GUDANG')?'pantry':''}"><h3>${title}</h3><p>${desc}</p><div class="people">${members.map(x=>personChip(x)).join('')||'<span style="color:#a8b5c3;font-size:12px">Belum ada karyawan</span>'}</div></div>`}).join('')}</div></div>`).join('');
  $('floorMap').querySelectorAll('[data-employee]').forEach(b=>b.onclick=()=>openChat(b.dataset.employee)); $('floorMap').querySelector('[data-owner-chat]')?.addEventListener('click',()=>showToast('Owner Rio memantau pekerjaan dari kantor lantai 2.'));
  $('statusList').innerHTML=appState.employees.map(e=>`<div class="employee-row"><span class="avatar photo-avatar" style="${e.avatar_path?`background-image:url('${esc(assetUrl(e.avatar_path))}')`:''}">${e.avatar_path?'':iconFor(e.department)}</span><div class="info"><strong>${esc(e.name)} · ${esc(e.role_title)}</strong><small>${esc(e.current_location||e.department)}${e.current_task_id?' · ada tugas':''}</small></div><span class="status ${e.work_status==='working'?'working':e.work_status==='error'?'error':''}">${badgeStatus(e.work_status)}</span></div>`).join('')||'<div class="empty">Belum ada data karyawan.</div>';
}
function personChip(e){return `<button class="person" data-employee="${esc(e.employee_key)}"><span class="avatar photo-avatar" style="${e.avatar_path?`background-image:url('${esc(assetUrl(e.avatar_path))}')`:''}">${e.avatar_path?'':iconFor(e.department)}</span>${esc(e.name)}<span class="dot"></span></button>`}

function renderEmployees(filter='') {
  const q=filter.toLowerCase(); const rows=appState.employees.filter(e=>`${e.name} ${e.department} ${e.role_title} ${e.assigned_channel||''}`.toLowerCase().includes(q));
  $('employeeCount').textContent=`${appState.employees.length} karyawan aktif`;
  $('employeeTable').innerHTML=rows.map(e=>`<tr><td><div class="team-identity"><span class="avatar photo-avatar" style="${e.avatar_path?`background-image:url('${esc(assetUrl(e.avatar_path))}')`:''}">${e.avatar_path?'':iconFor(e.department)}</span><span><strong>${esc(e.name)}</strong><br><small>${esc(e.employee_key)}</small></span></div></td><td>${esc(e.department)}</td><td>${esc(e.role_title)}</td><td>${esc(e.assigned_channel||'—')}</td><td>${e.floor?`Lantai ${e.floor}`:'—'}</td><td><span class="status ${e.work_status==='working'?'working':''}">${badgeStatus(e.work_status)}</span></td><td><div class="small-actions"><button class="btn soft" data-edit="${e.id}">Edit</button><button class="btn danger" data-archive="${e.id}">Arsipkan</button></div></td></tr>`).join('')||'<tr><td colspan="7" class="empty">Tidak ada karyawan yang cocok.</td></tr>';
  $('employeeTable').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editEmployee(b.dataset.edit));
  $('employeeTable').querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>archiveEmployee(b.dataset.archive));
}
function openEmployeeModal(employee=null) {
  $('employeeForm').reset(); $('employeeId').value=employee?.id||''; $('empName').value=employee?.name||''; $('empKey').value=employee?.employee_key||''; $('empDepartment').value=employee?.department||''; $('empRole').value=employee?.role_title||''; $('empChannel').value=employee?.assigned_channel||''; $('empFloor').value=employee?.floor||1; $('empKey').disabled=!!employee; $('empAvatar').dataset.currentPath=employee?.avatar_path||''; $('modalTitle').textContent=employee?'Edit karyawan':'Tambah karyawan'; $('employeeModal').classList.remove('hidden');
}
function editEmployee(id){const e=appState.employees.find(x=>x.id===id);if(e)openEmployeeModal(e)}
async function saveEmployee(ev){ev.preventDefault();const id=$('employeeId').value||null;const dept=$('empDepartment').value.trim();const unit=appState.units.find(u=>u.code===(dept==='Riset Emas'?'gold_research':dept==='Riset Saham'?'equity_research':['Penjualan','Layanan Pelanggan','Riset Produk','Editor','Gudang'].includes(dept)?'digital_commerce':'corporate'))||appState.units[0];const config={employee_key:$('empKey').value.trim().toLowerCase(),name:$('empName').value.trim(),department:dept,role_title:$('empRole').value.trim(),assigned_channel:$('empChannel').value.trim(),floor:$('empFloor').value,business_unit_id:unit?.id,marketplace_assignments:[]};const {error}=await supabase.rpc('save_ai_employee',{p_company_id:appState.companyId,p_employee_id:id,p_config:config});if(error){showToast('Belum tersimpan: '+error.message);return}const avatarFile=$('empAvatar').files[0];if(avatarFile){if(!['image/jpeg','image/png','image/webp'].includes(avatarFile.type)||avatarFile.size>5000000){showToast('Foto harus JPG, PNG, atau WEBP maksimal 5 MB.');return}let saved=appState.employees.find(x=>x.employee_key===config.employee_key);if(!saved){const lookup=await supabase.from('ai_employees').select('id').eq('company_id',appState.companyId).eq('employee_key',config.employee_key).single();saved=lookup.data}if(saved){const ext=avatarFile.type==='image/png'?'png':avatarFile.type==='image/webp'?'webp':'jpg';const path=`${appState.companyId}/team/${saved.id}.${ext}`;const up=await supabase.storage.from('company-brand-assets').upload(path,avatarFile,{upsert:true,contentType:avatarFile.type});if(up.error){showToast('Foto belum tersimpan: '+up.error.message);return}const upd=await supabase.from('ai_employees').update({avatar_path:path}).eq('company_id',appState.companyId).eq('id',saved.id);if(upd.error){showToast('Foto terunggah tetapi belum tertaut: '+upd.error.message);return}}} $('employeeModal').classList.add('hidden');showToast('Profil dan foto karyawan disimpan.');await refreshData()}
async function archiveEmployee(id){const e=appState.employees.find(x=>x.id===id);if(!e||!confirm(`Arsipkan ${e.name}? Riwayat tugas dan transaksi akan tetap tersimpan.`))return;const {error}=await supabase.rpc('archive_ai_employee',{p_company_id:appState.companyId,p_employee_id:id});if(error)showToast('Gagal mengarsipkan: '+error.message);else{showToast(`${e.name} diarsipkan; riwayat tetap tersimpan.`);await refreshData()}}

function renderSales(){const filter=$('salesFilter').value;const month=appState.month;const ym=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}`;const tx=appState.sales.filter(x=>x.sold_at?.startsWith(ym)&&x.transaction_status==='paid'&&(filter==='all'||x.marketplace_accounts?.provider===filter));const total=tx.reduce((s,x)=>s+Number(x.gross_amount||0),0);$('monthTitle').textContent=new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(month);$('salesTotal').textContent=`Omzet bulan ini: ${fmt(total)}`;const first=new Date(month.getFullYear(),month.getMonth(),1).getDay();const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();const headers=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];$('calendar').innerHTML=headers.map(d=>`<div class="day" style="min-height:35px;background:#f6f8f6;color:#718078"><b>${d}</b></div>`).join('')+Array.from({length:first},()=>'<div class="day"></div>').join('')+Array.from({length:days},(_,i)=>{const day=i+1;const ds=`${ym}-${String(day).padStart(2,'0')}`;const dt=tx.filter(x=>x.sold_at?.slice(0,10)===ds);const sum=dt.reduce((s,x)=>s+Number(x.gross_amount||0),0);return `<div class="day"><b>${day}</b>${dt.length?`<small>${dt.length} pesanan<br>${fmt(sum)}</small>`:''}</div>`}).join('');$('salesTable').innerHTML=tx.map(x=>`<tr><td>${new Date(x.sold_at).toLocaleDateString('id-ID')}</td><td>${esc(x.marketplace_accounts?.display_name||x.marketplace_accounts?.provider||'Marketplace')}</td><td>${esc(x.products?.name||'Produk belum dipetakan')}</td><td>${x.product_type==='own'?'Milik sendiri':'Afiliasi'}</td><td>${esc(x.transaction_status)}</td><td>${fmt(x.gross_amount)}</td><td>${fmt(x.net_amount)}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">Belum ada transaksi pada bulan ini.</td></tr>'}
function renderProducts(){$('productTable').innerHTML=appState.products.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${p.product_type==='own'?'Milik sendiri':'Afiliasi'}</td><td>${esc(p.status)}</td><td>${p.source_url?`<a href="${esc(p.source_url)}" target="_blank" rel="noreferrer">Buka sumber</a>`:'—'}</td><td>${new Date(p.created_at).toLocaleDateString('id-ID')}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Belum ada produk. Tambahkan produk untuk memulai pustaka aset.</td></tr>'}
async function addProduct(ev){ev.preventDefault();const editor=appState.employees.find(e=>e.employee_key==='vina');const status=$('productStatus').value;const {error}=await supabase.from('products').insert({company_id:appState.companyId,product_type:$('productType').value,name:$('productName').value.trim(),description:$('productDescription').value.trim()||null,source_url:$('productSource').value.trim()||null,status,created_by_employee_id:editor?.id||null,business_unit_id:appState.units.find(u=>u.code==='digital_commerce')?.id});if(error){showToast('Produk belum tersimpan: '+error.message);return} $('productModal').classList.add('hidden');$('productForm').reset();showToast(status==='ready'?'Produk siap dipasarkan tersimpan.':'Produk tersimpan sebagai draft.');await refreshData()}
function renderChannels(){const labels={...defaultPlatformLabels,...(appState.company?.platform_labels||{})};const expected=Object.entries(labels);$('channelList').innerHTML=expected.map(([key,label])=>{const rec=appState.channels.filter(x=>x.provider===key);return `<div class="connect-card"><div><h3>${esc(label)}</h3><p>${rec.length?rec.map(x=>esc(x.display_name)).join(', '):key.startsWith('mt')||key==='stockbit'?'Unit riset menunggu integrasi resmi.':'Akun belum terhubung'}</p></div><span class="status ${rec.some(x=>x.connection_status==='connected')?'working':''}">${rec.some(x=>x.connection_status==='connected')?'Terhubung':rec.length?badgeStatus(rec[0].connection_status):'Belum terhubung'}</span></div>`}).join('')}
async function saveCompanySettings(ev){ev.preventDefault();const name=$('companyNameInput').value.trim();if(!name){showToast('Nama perusahaan harus diisi.');return}const updates={name,intro_text:$('companyIntroInput').value.trim(),platform_labels:Object.fromEntries([...document.querySelectorAll('[data-platform-label]')].map(i=>[i.dataset.platformLabel,i.value.trim()||defaultPlatformLabels[i.dataset.platformLabel]]))};for(const [inputId,key] of [['companyLogoInput','logo_path'],['companyWallpaperInput','wallpaper_path']]){const file=$(inputId).files[0];if(!file)continue;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5000000){showToast('Gambar harus JPG, PNG, atau WEBP maksimal 5 MB.');return}const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const path=`${appState.companyId}/branding/${key}.${ext}`;const up=await supabase.storage.from('company-brand-assets').upload(path,file,{upsert:true,contentType:file.type});if(up.error){showToast('Gambar belum tersimpan: '+up.error.message);return}updates[key]=path}const {error}=await supabase.from('companies').update(updates).eq('id',appState.companyId);if(error){showToast('Pengaturan belum tersimpan: '+error.message);return}showToast('Pengaturan perusahaan disimpan.');await refreshData()}
function renderReports(){const paid=appState.sales.filter(x=>x.transaction_status==='paid');$('reportGross').textContent=fmt(paid.reduce((s,x)=>s+Number(x.gross_amount||0),0));$('reportCommission').textContent=fmt(paid.reduce((s,x)=>s+Number(x.commission_amount||0),0));$('reportFees').textContent=fmt(paid.reduce((s,x)=>s+Number(x.platform_fee||0),0));$('reportNet').textContent=fmt(paid.reduce((s,x)=>s+Number(x.net_amount||0),0));$('taxNote').textContent=paid.length?'Dasar pajak belum dihitung otomatis. Catat bentuk usaha dan status pajak bersama konsultan pajak sebelum menetapkan kewajiban.':'Belum ada transaksi untuk dihitung.'}

function renderChatList(){const preferred=['ryan','jessy','linda','leo','elsa','wilson','jessica','venny','stela','veronika','vina'];const sorted=[...appState.employees].sort((a,b)=>preferred.indexOf(a.employee_key)-preferred.indexOf(b.employee_key));$('chatEmployees').innerHTML=sorted.map(e=>`<button class="chat-select ${appState.activeEmployee?.id===e.id?'active':''}" data-chat="${esc(e.employee_key)}"><span class="avatar">${iconFor(e.department)}</span><span><b>${esc(e.name)}</b><small style="display:block;color:#718096">${esc(e.role_title)}</small></span></button>`).join('');$('chatEmployees').querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>openChat(b.dataset.chat))}
async function openChat(key){const e=appState.employees.find(x=>x.employee_key===key);if(!e)return;appState.activeEmployee=e;renderChatList();$('chatTitle').textContent=`${e.name} · ${e.role_title}`;$('chatMessages').innerHTML='<div class="empty">Memuat riwayat diskusi…</div>';const {data,error}=await supabase.from('employee_chat_messages').select('sender,content,created_at').eq('company_id',appState.companyId).eq('employee_id',e.id).order('created_at').limit(80);if(error){$('chatMessages').innerHTML='<div class="empty">Riwayat belum dapat dimuat.</div>';return}appState.messages=data||[];renderMessages()}
function renderMessages(){const m=$('chatMessages');m.innerHTML=appState.messages.map(x=>`<div class="bubble ${x.sender==='owner'?'owner':''}"><small style="display:block;color:#708078;margin-bottom:4px">${x.sender==='owner'?'Rio · Owner':esc(appState.activeEmployee?.name||'Karyawan AI')}</small>${esc(x.content).replace(/\n/g,'<br>')}</div>`).join('')||'<div class="empty">Belum ada percakapan. Tulis tugas untuk karyawan AI.</div>';m.scrollTop=m.scrollHeight}
async function sendChat(){const e=appState.activeEmployee;const message=$('chatInput').value.trim();if(!e){showToast('Pilih karyawan AI terlebih dahulu.');return}if(!message)return;const b=$('sendChat');b.disabled=true;b.textContent='Memproses…';appState.messages.push({sender:'owner',content:message});renderMessages();$('chatInput').value='';const {data,error}=await supabase.functions.invoke('employee-chat',{body:{companyId:appState.companyId,employeeKey:e.employee_key,message}});b.disabled=false;b.textContent='Kirim tugas';if(error){appState.messages.push({sender:'employee_ai',content:`Belum dapat menjawab: ${error.message}`});renderMessages();showToast('Tugas AI gagal diproses.');return}if(data?.error){appState.messages.push({sender:'employee_ai',content:data.error});renderMessages();return}appState.messages.push({sender:'employee_ai',content:data.reply});renderMessages();await refreshData()}

async function startLynkMarketing(){const employee=appState.employees.find(e=>e.employee_key==='jessy'&&e.is_active);if(!employee){showToast('Jessy belum aktif. Periksa menu Tim & HRD.');return}const btn=$('startLynkMarketing');btn.disabled=true;btn.textContent='Menugaskan Jessy…';await openChat('jessy');const listed=appState.products.filter(p=>['ready','listed'].includes(p.status));const catalog=listed.length?listed.map(p=>`${p.name} (${p.product_type==='own'?'produk sendiri':'afiliasi'}) ${p.source_url||'tautan belum dicatat'}`).join('; '):'Belum ada produk berstatus siap/listed di katalog kantor.';const request=listed.length?'Buat ringkasan fakta, prioritas produk, 3 ide promosi, dan draf caption pendek dengan tautan produk yang tersedia.':'Jangan membuat ide promosi, klaim produk, atau caption. Laporkan bahwa katalog belum berisi produk siap jual dan data apa yang harus dilengkapi terlebih dahulu.';$('chatInput').value=`Mulai tugas marketing Lynk hari ini. Tinjau penjualan Lynk 30 hari terakhir dari data kantor dan gunakan katalog siap jual ini: ${catalog} ${request} Jangan mengarang produk, tautan, tren, angka, manfaat, atau klaim. Ini tugas internal: jangan mengubah harga/produk, menghubungi pelanggan, atau menerbitkan konten.`;await sendChat();btn.disabled=false;btn.textContent='Mulai tugas marketing Lynk'}

function setView(view){document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));$(`view-${view}`)?.classList.add('active');document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===view));const labels={intro:'Pengenalan perusahaan',home:'Gedung kantor',sales:'Penjualan & kalender',products:'Produk penjualan',service:'Layanan pelanggan',warehouse:'Pergudangan',channels:'Koneksi platform',reports:'Laporan keuangan & pajak',chat:'Cara kerja AI & chat',hr:'Tim & HRD',settings:'Pengaturan kantor'};$('crumb').textContent=labels[view]||'Kantor';$('sidebar').classList.remove('open');}
function wire(){ $('loginForm').addEventListener('submit',requestLogin);$('employeeForm').addEventListener('submit',saveEmployee);$('productForm').addEventListener('submit',addProduct);$('companySettingsForm').addEventListener('submit',saveCompanySettings);$('addEmployee').onclick=()=>openEmployeeModal();$('addProduct').onclick=()=>$('productModal').classList.remove('hidden');$('employeeSearch').oninput=e=>renderEmployees(e.target.value);$('salesFilter').onchange=renderSales;$('monthPrev').onclick=()=>{appState.month.setMonth(appState.month.getMonth()-1);renderSales()};$('monthNext').onclick=()=>{appState.month.setMonth(appState.month.getMonth()+1);renderSales()};$('sendChat').onclick=sendChat;$('startLynkMarketing').onclick=startLynkMarketing;$('chatInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}};$('logoutBtn').onclick=async()=>{await supabase.auth.signOut();showLogin('Kamu sudah keluar dari kantor.')};$('menuBtn').onclick=()=>$('sidebar').classList.toggle('open');document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('.modal').classList.add('hidden'));document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('stockInfo').onclick=()=>showToast('Wilson mencatat stok setelah produk fisik dan transaksi gudang dimasukkan.');const d=new Date();$('today').textContent=new Intl.DateTimeFormat('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(d);}

wire();supabase.auth.onAuthStateChange((_event,session)=>{void bootSession(session)});supabase.auth.getSession().then(({data})=>bootSession(data.session));
