const $=s=>document.querySelector(s);
const CHARS=["All Characters","Homer Simpson","Marge Simpson","Bart Simpson","Lisa Simpson","Maggie Simpson","Mr. Burns","Smithers","Moe Szyslak","Barney Gumble","Ned Flanders","Milhouse Van Houten","Nelson Muntz","Principal Skinner","Superintendent Chalmers","Ralph Wiggum","Chief Wiggum","Comic Book Guy","Krusty the Clown","Sideshow Bob","Grandpa Simpson","Lenny","Carl","Apu"];
const SUGG=["My boss is being an idiot","I'm exhausted and don't want to work","I just went on a terrible date","My favorite team lost again","I did something incredibly stupid","I want to insult my friend"];
let Q=[],ranked=[],shown=0;
const ls=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const byId=id=>Q.find(q=>q.id===id);
const kw=(t,pool)=>{const w=t.toLowerCase().match(/[a-z']{3,}/g)||[];return pool.map(q=>{const h=[...q.tags,...q.situations,q.tone,q.text].join(' ').toLowerCase();return{id:q.id,s:w.reduce((a,x)=>a+(h.includes(x)?1:0),0)}}).sort((a,b)=>b.s-a.s).map(x=>x.id)};
const pool=()=>{const c=$('#char').value;return Q.filter(q=>c==='All Characters'||q.character===c)};
function card(q,best){const f=ls('favs',[]).includes(q.id);return `<article class="card${best?' best':''}" data-id="${q.id}">${best?'<span class="badge">Best match</span> ':''}${q.verified?'':'<span class="badge u">Unverified</span>'}<blockquote>“${esc(q.text)}”</blockquote><div class="meta"><b>${esc(q.character)}</b> · Season ${q.season}, Episode ${q.episode} · “${esc(q.episodeTitle)}”</div><div class="acts"><button data-a="copy">Copy Quote</button><button data-a="share">Share</button><button data-a="fav">${f?'♥ Saved':'♡ Save'}</button></div></article>`}
function render(ids,append){const box=$('#results');if(!append){box.innerHTML='';shown=0}
 const next=ids.slice(shown,shown+(shown?3:1));box.insertAdjacentHTML('beforeend',next.map((id,i)=>card(byId(id),!shown&&!i)).join(''));shown+=next.length;$('#more').hidden=shown>=ids.length}
async function search(text){text=(text||$('#q').value).trim();if(!text)return;$('#q').value=text;
 const r=ls('recent',[]).filter(x=>x!==text);r.unshift(text);sv('recent',r.slice(0,6));recent();
 $('#status').textContent='Searching Springfield…';const p=pool();if(!p.length){ranked=[];render([]);$('#status').textContent='No quotes for that character yet. Try All Characters.';return}
 try{const res=await fetch('/api/match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({situation:text,character:$('#char').value})});
  const d=await res.json();ranked=(d.ids||[]).filter(id=>p.some(q=>q.id===id));if(!ranked.length)throw 0}catch{ranked=kw(text,p)}
 $('#status').textContent='';render(ranked)}
function recent(){$('#recent').innerHTML=ls('recent',[]).map(t=>`<button class="chip" data-s="${esc(t)}">${esc(t)}</button>`).join('')||'<span class="meta">Nothing yet.</span>'}
document.addEventListener('click',async e=>{const t=e.target,s=t.dataset.s;if(s)return search(s);
 const a=t.dataset.a;if(!a)return;const q=byId(t.closest('.card').dataset.id),txt=`“${q.text}” — ${q.character}, ${q.episodeTitle} (S${q.season}E${q.episode})`;
 if(a==='copy'){try{await navigator.clipboard.writeText(txt);t.textContent='Copied!'}catch{prompt('Copy:',txt)}}
 if(a==='share'){if(navigator.share)navigator.share({text:txt}).catch(()=>{});else{try{await navigator.clipboard.writeText(txt);t.textContent='Copied!'}catch{}}}
 if(a==='fav'){let f=ls('favs',[]);f=f.includes(q.id)?f.filter(x=>x!==q.id):[...f,q.id];sv('favs',f);t.textContent=f.includes(q.id)?'♥ Saved':'♡ Save'}});
(async()=>{try{Q=(await (await fetch('data/quotes.json')).json()).quotes}catch{$('#status').textContent='Could not load quotes.';return}
 $('#char').innerHTML=CHARS.map(c=>`<option>${c}</option>`).join('');$('#sugg').innerHTML=SUGG.map(t=>`<button class="chip" data-s="${t}">${t}</button>`).join('');
 $('#go').onclick=()=>search();$('#more').onclick=()=>render(ranked,true);
 $('#q').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();search()}});
 $('#rand').onclick=()=>{const p=pool();if(p.length){ranked=[p[Math.random()*p.length|0].id];render(ranked)}};
 $('#favs').onclick=()=>{const f=ls('favs',[]).filter(byId);ranked=f;$('#status').textContent=f.length?'':'No favorites yet.';render(f)};
 $('#qotd').innerHTML=card(Q[Math.floor(Date.now()/864e5)%Q.length]);recent()})();
