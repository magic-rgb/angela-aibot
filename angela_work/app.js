/* ANGELA Launch-Ready Pre-Launch Client
 * Rewards, XP, task completion, referral state and vesting are server-authoritative.
 * Wallet and withdrawals are intentionally closed until launch.
 */
const screen = document.querySelector('#screen');
const nav = [...document.querySelectorAll('.nav-item')];
const logo = 'assets/angela-logo.png';
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#030713'); tg.setBackgroundColor?.('#020611'); }

const state = { tab: 'primary', profile: null, tasks: [], daily: null, referral: null };
function fmt(n){ return Number(n || 0).toLocaleString('en-US'); }
function escapeHtml(s){ return String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function toast(message,type='info'){ const old=document.querySelector('.toast'); old?.remove(); const el=document.createElement('div'); el.className=`toast ${type}`; el.textContent=message; document.body.appendChild(el); requestAnimationFrame(()=>el.classList.add('show')); setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},2400); }
function layout(content){ screen.innerHTML=content; bind(); }
function progress(){ const xp=Number(state.profile?.xp||0); const pct=Math.min(100,Math.round((xp/10000)*100)); return `<div class="xp"><i style="width:${pct}%"></i></div><div class="level-row"><span>${fmt(xp)} / 10,000 XP</span><span>SERVER CONTROLLED</span></div>`; }

window.ANGELA_API = (()=>{
  const base=window.ANGELA_API_BASE||'';
  async function request(path,options={}){
    const res=await fetch(base+path,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){ const e=new Error(data.error||`API_${res.status}`); e.status=res.status; e.data=data; throw e; }
    return data;
  }
  return {
    me:()=>request('/api/me'),
    tasks:()=>request('/api/tasks'),
    daily:()=>request('/api/daily-challenges'),
    referral:()=>request('/api/referral'),
    startTask:id=>request(`/api/tasks/${encodeURIComponent(id)}/start`,{method:'POST',body:'{}'}),
    verifyTask:(id,attemptToken)=>request(`/api/tasks/${encodeURIComponent(id)}/verify`,{method:'POST',body:JSON.stringify({attemptToken})}),
    startDaily:id=>request(`/api/daily-challenges/${encodeURIComponent(id)}/start`,{method:'POST',body:'{}'}),
    verifyDaily:(id,attemptToken)=>request(`/api/daily-challenges/${encodeURIComponent(id)}/verify`,{method:'POST',body:JSON.stringify({attemptToken})}),
    wallet:()=>request('/api/wallet'),
    withdrawals:()=>request('/api/withdrawals'),
    authenticate:()=>request('/api/auth/telegram',{method:'POST',body:JSON.stringify({initData:tg?.initData||'',startParam:tg?.initDataUnsafe?.start_param||''})})
  };
})();

async function refreshServer(){
  state.profile=(await window.ANGELA_API.me()).user;
  const [tasks,daily,referral]=await Promise.all([window.ANGELA_API.tasks(),window.ANGELA_API.daily(),window.ANGELA_API.referral()]);
  state.tasks=tasks.tasks||[]; state.daily=daily; state.referral=referral;
}
function taskCard(t){
  const done=!!t.completed;
  return `<article class="glass task ${done?'done':''}" data-task="${escapeHtml(t.id)}"><div class="task-icon">${escapeHtml(t.platform||'✦')}</div><div class="task-main"><b>${escapeHtml(t.title)}</b><p>${escapeHtml(t.desc||'Complete this community mission.')}</p><div class="reward">+${fmt(t.reward)} ANGELA Points</div></div><button class="start" ${done?'disabled':''}>${done?'VERIFIED':(t.mode==='checkin'?'CLAIM':(t.mode==='link_visit'?'START MISSION':'VERIFY'))}</button></article>`;
}
function home(){
  const u=tg?.initDataUnsafe?.user; const name=state.profile?.first_name||u?.first_name||'Angel'; const p=state.profile||{};
  layout(`<div class="section-head"><div><div class="eyebrow">Community Network</div><h1 class="title">Welcome back, <span class="gold">${escapeHtml(name)}</span></h1></div><span class="live-dot">● LIVE</span></div>
  <section class="glass hero"><img class="hero-logo" src="${logo}" alt="ANGELA"><div class="eyebrow">ANGELA POINTS</div><div class="points">${fmt(p.points)}</div><div class="delta">Server balance · XP ${fmt(p.xp)}</div>${progress()}<div class="stats"><div class="stat"><small>Points</small><b>${fmt(p.points)}</b></div><div class="stat"><small>XP</small><b>${fmt(p.xp)}</b></div><div class="stat"><small>Referrals</small><b>${fmt(state.referral?.invited)}</b></div></div><button class="cta" data-page="tasks">EARN POINTS&nbsp; →</button></section>
  <section class="glass daily"><div><div class="eyebrow">DAILY ANGEL</div><b>Keep your streak alive</b><p>Check in once every 24 hours. Rewards are recorded by the server.</p></div><button class="small-cta" data-checkin>${state.daily?.challenges?.find(x=>x.id==='daily_checkin')?.completed?'VERIFIED':'CHECK IN'}</button></section>`);
}
function tasksPage(){
  const primary=state.tasks.filter(t=>['TELEGRAM','X','DISCORD','YOUTUBE'].includes(t.platform));
  const secondary=state.tasks.filter(t=>!primary.includes(t));
  const visible=state.tab==='secondary'?secondary:state.tab==='completed'?state.tasks.filter(t=>t.completed):primary;
  const daily=state.daily?.challenges||[];
  layout(`<div class="section-head"><div><div class="eyebrow">Growth Engine</div><h1 class="title">MISSIONS</h1></div><div class="gold">${fmt(state.profile?.points)}</div></div>
  <div class="tabs"><button class="tab ${state.tab==='primary'?'active':''}" data-tab="primary">PRIMARY</button><button class="tab ${state.tab==='secondary'?'active':''}" data-tab="secondary">SECONDARY</button><button class="tab ${state.tab==='completed'?'active':''}" data-tab="completed">COMPLETED</button></div>
  ${visible.length?visible.map(taskCard).join(''):`<section class="glass empty"><div class="empty-icon">✓</div><b>No completed missions yet</b><p>Complete a verified mission and it will appear here.</p></section>`}
  <section class="glass mission-note"><div class="eyebrow">DAILY CHALLENGES</div>${daily.map(taskCard).join('')}</section>
  <section class="glass mission-note"><div class="eyebrow">HOW IT WORKS</div><p>Tap a mission to start it. ANGELA issues a short-lived server attempt, opens the official destination, then allows the reward after the minimum visit time. Each mission can be rewarded once.</p></section>`);
}
function community(){
  layout(`<div class="section-head"><div><div class="eyebrow">Network</div><h1 class="title">COMMUNITY</h1></div></div><section class="glass community-card"><div class="community-top"><div><div class="eyebrow">Your Referral Code</div><div class="rank">${escapeHtml(state.referral?.code||'—')}</div></div><img class="vault-logo" src="${logo}" alt=""></div>${progress()}<div class="stats"><div class="stat"><small>Invited</small><b>${fmt(state.referral?.invited)}</b></div><div class="stat"><small>Qualified</small><b>${fmt(state.referral?.qualified)}</b></div><div class="stat"><small>Points</small><b>${fmt(state.referral?.points)}</b></div></div><div class="ref-box"><div class="eyebrow">YOUR REFERRAL LINK</div><div class="ref-link">${state.referral?.link?`<a href="${escapeHtml(state.referral.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(state.referral.link)}</a>`:'Referral link will appear when the production bot username is configured.'} ${state.referral?.link?'<button data-copy>⧉</button>':''}</div></div></section>`);
}
async function wallet(){
  layout(`<div class="section-head"><div><div class="eyebrow">Rewards</div><h1 class="title">REWARD VAULT</h1></div></div><section class="glass vault"><div class="eyebrow">PRE-LAUNCH</div><b>Wallet is closed</b><p class="micro-note">The ANGELA wallet and withdrawals remain disabled until launch. No token or treasury is assumed before launch.</p><button class="cta" disabled>WALLET OPENS AT LAUNCH</button></section>`);
  try { const data=await window.ANGELA_API.wallet(); const v=data.vesting||{}; layout(`<div class="section-head"><div><div class="eyebrow">Rewards</div><h1 class="title">REWARD VAULT</h1></div></div><section class="glass vault"><div class="vault-total"><div><div class="eyebrow">SERVER POINTS</div><b>${fmt(v.totalPoints)}</b></div><img class="vault-logo" src="${logo}" alt=""></div><div class="money-grid"><div class="money"><small>Vested Points</small><b>${fmt(v.vestedPoints)}</b><em>POINTS</em></div><div class="money available"><small>Available Points</small><b>${fmt(data.withdrawal?.availablePoints)}</b><em>POINTS</em></div><div class="money locked"><small>Locked Points</small><b>${fmt(v.lockedPoints)}</b><em>POINTS</em></div><div class="money"><small>Token</small><b>NOT CREATED</b><em>SOLANA · PRE-LAUNCH</em></div></div><button class="cta" disabled>🔒 WITHDRAWALS OPEN AT LAUNCH</button><p class="micro-note">${escapeHtml(data.launch?.message||'Wallet and withdrawals will open at ANGELA launch.')}</p></section><section class="glass vesting"><div class="section-head"><div class="eyebrow">Vesting Schedule</div><a>SERVER CONTROLLED</a></div><p class="micro-note">Vesting begins only when Wallet is activated after launch.</p></section>`); } catch(e){ toast(e.message||'Wallet unavailable'); }
}
function profile(){ const p=state.profile||{}; layout(`<div class="section-head"><div><div class="eyebrow">Identity</div><h1 class="title">PROFILE</h1></div></div><section class="glass profile-hero"><div class="profile-orb"><img src="${logo}" alt=""></div><div class="profile-name">${escapeHtml(p.first_name||tg?.initDataUnsafe?.user?.first_name||'ANGEL USER')}</div><div class="eyebrow" style="margin-top:5px">STAR ANGEL</div><div class="chips"><span class="chip">XP ${fmt(p.xp)}</span><span class="chip">POINTS ${fmt(p.points)}</span></div><div class="profile-stats"><div><small>Total Points</small><b>${fmt(p.points)}</b></div><div><small>Tasks Completed</small><b>${fmt(state.tasks.filter(x=>x.completed).length)}</b></div><div><small>Referrals</small><b>${fmt(state.referral?.invited)}</b></div><div><small>Wallet</small><b>LOCKED</b></div></div></section>`); }
function core(){ layout(`<section class="glass hero core-page"><div class="eyebrow">ANGELA CORE</div><img class="hero-logo" src="${logo}" alt=""><h1 class="title">THE COMMUNITY CORE</h1><p class="core-copy">Your contribution builds the future. Earn points through verified community actions and prepare for the ANGELA launch.</p><div class="core-orbit"><span>IDENTITY</span><span>MISSIONS</span><span>REWARDS</span><span>COMMUNITY</span></div><button class="cta" data-page="tasks">ENTER MISSIONS&nbsp; →</button></section>`); }
async function go(page){ nav.forEach(n=>n.classList.toggle('active',n.dataset.page===page)); if(page==='home')home(); else if(page==='tasks')tasksPage(); else if(page==='community')community(); else if(page==='wallet')await wallet(); else if(page==='profile')profile(); else core(); }
async function checkin(){ try { const r=await window.ANGELA_API.verifyDaily('daily_checkin'); toast(`+${fmt(r.reward)} points added`,'success'); await refreshServer(); await go('home'); } catch(e){ toast(e.message==='DAILY_ALREADY_COMPLETED'?'Daily check-in already claimed':(e.message||'Check-in failed')); } }
async function verifyTask(id){
  const t=state.tasks.find(x=>x.id===id)||state.daily?.challenges?.find(x=>x.id===id); if(!t||t.completed)return;
  try {
    if(t.mode==='checkin'){ return await checkin(); }
    const start = t.id.startsWith('daily_') ? await window.ANGELA_API.startDaily(id) : await window.ANGELA_API.startTask(id);
    if(t.url) window.open(t.url,'_blank','noopener,noreferrer');
    toast(`Mission started · wait ${fmt(start.attempt?.minSeconds||8)}s`,'info');
    const waitMs=Math.max(0,Number(start.attempt?.minSeconds||8)*1000+250);
    setTimeout(async()=>{
      try {
        const r=t.id.startsWith('daily_') ? await window.ANGELA_API.verifyDaily(id,start.attempt.token) : await window.ANGELA_API.verifyTask(id,start.attempt.token);
        toast(`+${fmt(r.reward||t.reward)} points added`,'success'); await refreshServer(); await go('tasks');
      } catch(e){ toast(e.message==='ACTION_TOO_FAST'?'Please keep the mission open a little longer.':(e.message||'Verification failed')); }
    },waitMs);
  } catch(e){
    toast(e.message==='TASK_ALREADY_COMPLETED'||e.message==='DAILY_ALREADY_COMPLETED'?'Already completed':(e.message||'Mission could not start'));
  }
}
function openMenu(){
  const old=document.querySelector('.quick-menu'); old?.remove();
  const el=document.createElement('div'); el.className='quick-menu';
  el.innerHTML=`<div class="quick-menu-card glass"><div class="section-head"><div><div class="eyebrow">ANGELA MENU</div><h2 class="title">QUICK ACCESS</h2></div><button class="icon-btn" data-close>×</button></div><div class="quick-grid"><button data-page="profile">PROFILE</button><button data-page="core">ANGELA CORE</button><button data-page="tasks">MISSIONS</button><button data-page="community">COMMUNITY</button><button data-page="wallet">REWARD VAULT</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener('click',e=>{ if(e.target===el||e.target.closest('[data-close]')) return el.remove(); const b=e.target.closest('[data-page]'); if(b){el.remove();go(b.dataset.page);} });
}
function showNotifications(){ const p=state.profile||{}; const r=state.referral||{}; const daily=state.daily?.challenges?.find(x=>x.id==='daily_checkin'); const msg=daily?.completed?'Daily check-in claimed today.':`Daily check-in available · +${fmt(daily?.reward||250)} points`; const ref=r.qualified>=3?'Referral milestone reached · +2,500 points awarded.':`${fmt(r.qualified)} / 3 qualified referrals`; toast(`${msg} · ${ref}`,'info'); }
function bind(){ document.querySelector('.icon-btn[aria-label="Menu"]')?.addEventListener('click',openMenu); document.querySelector('.icon-btn[aria-label="Notifications"]')?.addEventListener('click',showNotifications); document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page))); document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;go('tasks')})); document.querySelectorAll('.task .start').forEach(b=>b.addEventListener('click',()=>{const id=b.closest('[data-task]')?.dataset.task;if(id)verifyTask(id)})); document.querySelector('[data-checkin]')?.addEventListener('click',checkin); document.querySelector('[data-copy]')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(state.referral?.link||'');toast('Referral link copied','success')}catch{toast('Copy unavailable','info')}}); }
nav.forEach(n=>n.addEventListener('click',()=>go(n.dataset.page)));
(async()=>{ try { await window.ANGELA_API.authenticate(); await refreshServer(); } catch(e){ toast('Open ANGELA inside Telegram to continue','info'); } await go('home'); })();
