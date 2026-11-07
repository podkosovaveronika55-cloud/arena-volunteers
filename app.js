// Данные обновляются раз в сутки через GitHub Actions.
const MONTHS = window.RATING_DATA?.months || [];
let data = {}, selected = 'all', query = '';
const $ = s => document.querySelector(s);
const fmt = n => new Intl.NumberFormat('ru-RU', {maximumFractionDigits:2}).format(n);
function parse(table) {
  // В текущем листе часы мероприятий находятся в C:Q, а R — готовый итог.
  // Суммируем C:Q, чтобы избежать двойного учёта и не зависеть от формул итога.
  return (table.rows || []).map(row => {
    const c = row.c || [], name = String(c[1]?.v || '').trim().replace(/,+$/, '');
    const hours = c.slice(2,17).reduce((sum, cell) => {
      const raw = cell?.v;
      if (raw == null || raw === '') return sum;
      const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.').trim());
      return sum + (Number.isFinite(n) && n >= 0 ? n : 0);
    },0);
    return {name,hours};
  }).filter(x => x.name);
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(){
  const map = new Map();
  for (const month of MONTHS) for(const p of (data[month.key] || [])) {
    const key = p.name.toLocaleLowerCase('ru');
    if (!map.has(key)) map.set(key,{name:p.name, months:{}, total:0});
    let item=map.get(key); item.months[month.key]=(item.months[month.key]||0)+p.hours; item.total+=p.hours;
  }
  const all=[...map.values()]; const list=all.map(p=>({...p,score:selected==='all'?p.total:(p.months[selected]||0)})).filter(p=>selected==='all'||Object.hasOwn(p.months,selected)).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'ru'));
  let last, rank=0; list.forEach((p,i)=>{if(p.score!==last) rank=i+1; p.rank=rank;last=p.score});
  const shown=list.filter(p=>p.name.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));
  $('#people').textContent=fmt(all.length); $('#hours').textContent=fmt(all.reduce((s,p)=>s+p.total,0));
  const columns=selected==='all'?MONTHS:MONTHS.filter(m=>m.key===selected);
  document.querySelector('thead tr').innerHTML='<th>МЕСТО</th><th>ВОЛОНТЁР</th>'+columns.map(m=>`<th>${escapeHTML(m.label.toUpperCase())}</th>`).join('')+'<th>ВСЕГО ЧАСОВ</th>';
  $('#rows').innerHTML=shown.length?shown.map(p=>`<tr><td><span class="rank ${p.rank<=3&&p.score>0?'top-rank':''}">${String(p.rank).padStart(2,'0')}</span></td><td class="name">${escapeHTML(p.name)}</td>${columns.map(m=>`<td>${fmt(p.months[m.key]||0)} ч</td>`).join('')}<td class="hours">${fmt(p.total)} <small>ч</small></td></tr>`).join(''):`<tr><td colspan="${columns.length+3}" class="empty">Никого не нашли. Попробуйте изменить запрос.</td></tr>`;
  $('#count').textContent=`ПОКАЗАНО ${shown.length} ИЗ ${list.length}`;
  $('#tabs').innerHTML=[{key:'all',label:'Общий рейтинг'},...MONTHS].map(m=>`<button class="${selected===m.key?'selected':''}" data-key="${m.key}">${escapeHTML(m.label)}</button>`).join('');
  document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{selected=b.dataset.key;render()});
}
$('#search').addEventListener('input',e=>{query=e.target.value.trim();render()});
const saved = window.RATING_DATA;
if (saved?.tables && MONTHS.length) {
  for (const m of MONTHS) data[m.key] = parse(saved.tables[m.key] || {rows: []});
  const date = new Date(saved.updatedAt);
  const stamp = Number.isNaN(date.getTime()) ? 'время неизвестно' : new Intl.DateTimeFormat('ru-RU', {timeZone:'Asia/Omsk', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}).format(date) + ' (Омск)';
  $('#status').textContent = 'Обновлено: ' + stamp;
  if (Date.now() - date.getTime() > 48 * 3600 * 1000) { $('#status').textContent += ' · данные могут устареть'; $('.live i').style.background='#f13b21'; }
  render();
} else { $('#status').textContent = 'Нет сохранённых данных'; $('.live i').style.background='#f13b21'; $('#rows').innerHTML='<tr><td colspan="4" class="empty">Данные недоступны. Проверьте обновление на GitHub.</td></tr>'; }
