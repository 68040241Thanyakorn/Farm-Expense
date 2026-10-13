'use strict';
const API = 'https://farm-expense-backend.onrender.com';
const POND_KEY = 'farmExpensePonds';
const TX_KEY = 'farmExpenseTransactions';
const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const COLORS = ['#4cbcc1','#e9b7af','#f5c66b','#a4c5e7','#b7d8a2','#c9b5e7','#f2a7ca','#7bc9aa'];
const $ = id => document.getElementById(id);
function readArray(key) { try { const x=JSON.parse(localStorage.getItem(key)||'[]'); return Array.isArray(x)?x:[]; } catch {return [];} }
function pondId(p) { return String(p.id ?? p.pondNumber); }
function monthLabel(ym) { const [y,m]=ym.split('-').map(Number); return `${TH_MONTHS[m-1]} ${y+543}`; }
function currentMonth() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function previousMonth(ym) { const [y,m]=ym.split('-').map(Number); const d=new Date(y,m-2,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function money(n) { return Number(n||0).toLocaleString('th-TH',{maximumFractionDigits:2}); }
function getPonds(){return readArray(POND_KEY);}
function getTxs(){return readArray(TX_KEY);}
function validMonth(s){return /^\d{4}-(0[1-9]|1[0-2])$/.test(s||'');}
const query=new URLSearchParams(location.search);
const monthPicker=$('month-picker');
const pondPicker=$('pond-picker');
let chatHistory=[];
function populateFilters(){
  const ponds=getPonds();
  const months=new Set([currentMonth(),...getTxs().map(t=>String(t.date||'').slice(0,7)).filter(validMonth)]);
  const chosenMonth=validMonth(query.get('month'))?query.get('month'):currentMonth();
  months.add(chosenMonth);
  for(const ym of [...months].sort().reverse()){const option=new Option(monthLabel(ym),ym);monthPicker.add(option);}
  monthPicker.value=chosenMonth;
  pondPicker.add(new Option('ทุกบ่อ (รวมทั้งหมด)','all'));
  for(const p of ponds.sort((a,b)=>Number(a.pondNumber)-Number(b.pondNumber))){pondPicker.add(new Option(`บ่อที่ ${p.pondNumber} : ${p.fishSpecies}`,pondId(p)));}
  const selected=query.get('pond');
  pondPicker.value=ponds.some(p=>pondId(p)===selected)?selected:'all';
}
function selectedData(){
  const ponds=getPonds();const allTxs=getTxs();const id=pondPicker.value;const month=monthPicker.value;
  const chosenPonds=id==='all'?ponds:ponds.filter(p=>pondId(p)===id);
  const ids=new Set(chosenPonds.map(pondId));
  const transactions=allTxs.filter(t=>ids.has(String(t.pondId)) && String(t.date||'').startsWith(month));
  const previousTransactions=allTxs.filter(t=>ids.has(String(t.pondId)) && String(t.date||'').startsWith(previousMonth(month)));
  return {ponds,chosenPonds,transactions,previousTransactions,allTransactions:allTxs,month,selectedPond:id};
}
function totals(items){let income=0,expense=0;const cats={};for(const t of items){const n=Number(t.amount);if(!Number.isFinite(n)||n<0)continue;if(t.type==='income')income+=n;else if(t.type==='expense'){expense+=n;const c=String(t.category||'อื่น ๆ');cats[c]=(cats[c]||0)+n;}}return {income,expense,profit:income-expense,categories:cats};}
function renderDonut(categories){const el=$('expense-donut'),list=$('category-list');list.replaceChildren();const pairs=Object.entries(categories).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);const total=pairs.reduce((s,[,v])=>s+v,0);if(!total){el.style.background='#eee';list.textContent='ยังไม่มีข้อมูลค่าใช้จ่ายในเดือนนี้';list.className='category-list empty';return;}list.className='category-list';let angle=0;const stops=[];pairs.forEach(([name,value],i)=>{const next=angle+value/total*100;stops.push(`${COLORS[i%COLORS.length]} ${angle}% ${next}%`);angle=next;const row=document.createElement('div');row.className='category-row';const label=document.createElement('span');label.textContent=`● ${name}`;label.style.color=COLORS[i%COLORS.length];const amount=document.createElement('strong');amount.textContent=`${money(value)} ฿`;row.append(label,amount);list.append(row);});el.style.background=`conic-gradient(${stops.join(',')})`;}
function updateUrl(){const url=new URL(location.href);url.searchParams.set('month',monthPicker.value);url.searchParams.set('pond',pondPicker.value);history.replaceState(null,'',url);$('nav-summary').href=`index8.html?${url.searchParams.toString()}`;}
async function post(path,payload){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);try{const res=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||`HTTP ${res.status}`);return data;}finally{clearTimeout(timer);}}
function render(){updateUrl();const data=selectedData();const t=totals(data.transactions);const prev=totals(data.previousTransactions);$('welcome-month').textContent=`ประจำเดือน${monthLabel(data.month)}`;$('pond-title').textContent=data.selectedPond==='all'?'ข้อมูลทุกบ่อรวมกัน':`บ่อที่ ${data.chosenPonds[0]?.pondNumber||'-'} : ${data.chosenPonds[0]?.fishSpecies||'-'}`;$('profit').textContent=`${money(t.profit)} บาท`;$('income-expense').textContent=`รายรับ ${money(t.income)} • รายจ่าย ${money(t.expense)} บาท`;$('profit-card').classList.toggle('loss',t.profit<0);$('change').textContent=prev.income+prev.expense>0?`${t.profit-prev.profit>=0?'+':''}${money(t.profit-prev.profit)} ฿`:'—';renderDonut(t.categories);$('recommendation').textContent='กำลังวิเคราะห์ข้อมูล...';chatHistory=[];$('chat-messages').replaceChildren();addMessage('assistant','ถามได้เลย เช่น บ่อไหนกำไรมากที่สุด หรือค่าอาหารปลาเดือนนี้เท่าไร?');const payload={...data};post('/api/analysis',payload).then(result=>{$('recommendation').textContent=result.advice||'ยังไม่มีคำแนะนำ';}).catch(err=>{$('recommendation').textContent='ไม่สามารถเชื่อมต่อ AI Server ได้ กรุณาลองใหม่อีกครั้ง';console.error(err);});}

function addMessage(role, content) {
  const msg = document.createElement('div');
  msg.className = `message ${role}`;
  msg.textContent = content;
  $('chat-messages').append(msg);
  msg.scrollIntoView({ block: 'nearest' });
}

$('chat-form').addEventListener('submit', async event => {
  event.preventDefault();

  const input = $('chat-input');
  const question = input.value.trim();
  if (!question) return;

  input.value = '';
  addMessage('user', question);
  $('send-button').disabled = true;
  $('chat-status').textContent = 'AI กำลังตอบ...';

  try {
    const result = await post('/api/ask', {
      ...selectedData(),
      question,
      history: chatHistory.slice(-10)
    });

    addMessage('assistant', result.answer);
    chatHistory.push(
      { role: 'user', content: question },
      { role: 'assistant', content: result.answer }
    );
    $('chat-status').textContent = '';

  } catch (err) {
    console.error('AI Chat Error:', err);
    addMessage('assistant', `ยังตอบไม่ได้: ${err.message}`);
    $('chat-status').textContent =
      'ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่อีกครั้ง';

  } finally {
    $('send-button').disabled = false;
    input.focus();
  }
});

monthPicker.addEventListener('change', render);
pondPicker.addEventListener('change', render);

populateFilters();
render();
