const $=s=>document.querySelector(s);
const CHARS=["All Characters","Homer Simpson","Marge Simpson","Bart Simpson","Lisa Simpson","Maggie Simpson","Mr. Burns","Smithers","Moe Szyslak","Barney Gumble","Ned Flanders","Milhouse Van Houten","Nelson Muntz","Principal Skinner","Superintendent Chalmers","Ralph Wiggum","Chief Wiggum","Comic Book Guy","Krusty the Clown","Sideshow Bob","Grandpa Simpson","Lenny","Carl","Apu"];
let Q=[],ranked=[],shown=0;
const ls=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const byId=id=>Q.find(q=>q.id===id);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const kw=(t,pool)=>{const w=t.toLowerCase().match(/[a-z']{3,}/g)||[];return pool.map(q=>{const h=[...q.tags,...q.situations,q.tone,q.text].join(' ').toLowerCase();return{id:q.id,r:q.rank||999,s:w.reduce((a,x)=>a+(h.includes(x)?1:0),0)}}).sort((a,b)=>b.s-a.s||a.r-b.r).map(x=>x.id)};
const loadQ=async()=>{Q=(await (await fetch('data/quotes.json')).json()).quotes};
function card(q,best){const f=ls('favs',[]).includes(q.id);return `<article class="card${best?' best':''}${f?' saved':''}" data-id="${q.id}">${f?'<span class="ribbon">Saved</span>':''}${best?'<span class="badge">Best match</span>':''}<blockquote>“${esc(q.text)}”</blockquote><div class="meta"><b>${esc(q.character)}</b> · Season ${q.season}, Episode ${q.episode} · “${esc(q.episodeTitle)}”</div><div class="acts"><button data-a="copy">Copy Quote</button><button data-a="share">Share</button><button data-a="fav" class="${f?'on':''}">${f?'Saved ✓':'Save'}</button></div></article>`}
const favCount=()=>{const b=$('#favs');if(!b)return;const n=ls('favs',[]).length;b.textContent='Favorites'+(n?` (${n})`:'')};
function render(ids,append,all){const box=$('#results');if(!append){box.innerHTML='';shown=0}
 const next=all?ids:ids.slice(shown,shown+(shown?3:1));box.insertAdjacentHTML('beforeend',next.map((id,i)=>card(byId(id),!shown&&!i&&!all)).join(''));shown+=next.length;$('#more').hidden=all||shown>=ids.length}
const go=(t,c)=>{t=(t||'').trim();if(!t&&(!c||c==='All Characters'))return;if(t){const r=ls('recent',[]).filter(x=>x!==t);r.unshift(t);sv('recent',r.slice(0,6))}location.href='results.html?q='+encodeURIComponent(t)+'&c='+encodeURIComponent(c||'All Characters')};
document.addEventListener('click',async e=>{const t=e.target;
 if(t.dataset.s)return go(t.dataset.s,$('#char')?.value);
 const a=t.dataset.a;if(!a)return;const c=t.closest('.card'),q=byId(c.dataset.id),txt=`“${q.text}” — ${q.character}, ${q.episodeTitle} (S${q.season}E${q.episode})`;
 if(a==='copy'){try{await navigator.clipboard.writeText(txt);t.textContent='Copied!'}catch{prompt('Copy:',txt)}}
 if(a==='share'){if(navigator.share)navigator.share({text:txt}).catch(()=>{});else{try{await navigator.clipboard.writeText(txt);t.textContent='Copied!'}catch{}}}
 if(a==='fav'){let f=ls('favs',[]);const on=!f.includes(q.id);f=on?[...f,q.id]:f.filter(x=>x!==q.id);sv('favs',f);c.classList.toggle('saved',on);t.classList.toggle('on',on);t.textContent=on?'Saved ✓':'Save';const r=c.querySelector('.ribbon');if(r)r.remove();if(on)c.insertAdjacentHTML('afterbegin','<span class="ribbon">Saved</span>');favCount()}});
async function home(){try{await loadQ()}catch{return}
 const have=new Set(Q.map(q=>q.character)),list=[...CHARS.filter(c=>c==='All Characters'||have.has(c)),...[...have].filter(c=>!CHARS.includes(c)).sort()];
 $('#char').innerHTML=list.map(c=>`<option>${c}</option>`).join('');
 $('#go').onclick=()=>go($('#q').value,$('#char').value);
 $('#q').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();go($('#q').value,$('#char').value)}});
 $('#favs').onclick=()=>location.href='results.html?fav=1';
 $('#qotd').innerHTML=card(Q[Math.floor(Date.now()/864e5)%Q.length]);
 const rr=()=>{const r=ls('recent',[]);$('#recent').innerHTML=r.map(t=>`<button class="chip" data-s="${esc(t)}">${esc(t)}</button>`).join('')||'<span class="meta">Nothing yet.</span>';$('#clr').hidden=!r.length};
 $('#clr').onclick=()=>{sv('recent',[]);rr()};rr();favCount()}
const FX={"Homer Simpson":["rain"],"Bart Simpson":["stamp","Ay, caramba!"],"Lisa Simpson":["notes"],"Mr. Burns":["stamp","Excellent...","dark"],"Principal Skinner":["fire"],"Comic Book Guy":["stamp","Worst. Search. Ever."],"Sideshow Bob":["stamp","Thwack!"],"Ralph Wiggum":["balloons"],"Kent Brockman":["banner","This just in!"],"Marge Simpson":["stamp","Hrrrmm."]};
function fx(c){if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;const [t,x,k]=FX[c]||["confetti"],o=document.createElement('div'),R=(a,b)=>a+Math.random()*(b-a),col=['#ff7eb6','#1E88E5','#FBE78F','#7ed957'];o.className='fx';
 if(t==='rain')for(let i=0;i<16;i++)o.insertAdjacentHTML('beforeend',`<i class="donut" style="left:${R(0,92)}%;--s:${R(34,60)}px;--r:${R(-40,40)}deg;animation:fall ${R(1.6,2.8)}s ${R(0,1)}s ease-in both"></i>`);
 if(t==='notes')for(let i=0;i<14;i++)o.insertAdjacentHTML('beforeend',`<b style="left:${R(0,92)}%;font-size:${R(2,3.6)}rem;animation:rise ${R(2,3)}s ${R(0,.8)}s ease-out both">${'♪♫♩♬'[i%4]}</b>`);
 if(t==='balloons')for(let i=0;i<10;i++)o.insertAdjacentHTML('beforeend',`<i class="bln" style="left:${R(2,90)}%;background:#d62828;animation:rise ${R(2.4,3.4)}s ${R(0,.8)}s ease-out both"></i>`);
 if(t==='confetti')for(let i=0;i<40;i++)o.insertAdjacentHTML('beforeend',`<i class="cf" style="left:${R(0,98)}%;background:${col[i%4]};animation:fall ${R(1.4,2.6)}s ${R(0,1)}s ease-in both"></i>`);
 if(t==='stamp')o.innerHTML=`<div class="stamp ${k||''}">${x}</div>`;
 if(t==='banner')o.innerHTML=`<div class="banner">${x}</div>`;
 if(t==='fire')o.innerHTML='<div class="flames"></div>';
 document.body.appendChild(o);setTimeout(()=>o.remove(),3800)}
async function results(){const P=new URLSearchParams(location.search),t0=Date.now(),fav=P.get('fav'),text=P.get('q')||'',ch=P.get('c')||'All Characters';let ids=[],title;
 try{await loadQ()}catch{$('#loader p').textContent='Could not load quotes.';return}
 if(fav){ids=ls('favs',[]).filter(byId);title='Your Favorites'}
 else{const p=Q.filter(q=>ch==='All Characters'||q.character===ch);title=ch==='All Characters'?'Your Simpsons Quote':(text?'Your ':'Top ')+ch+(text?' Quote':' Quotes');
  if(!text)ids=p.sort((a,b)=>(a.rank||999)-(b.rank||999)).map(q=>q.id);
  else try{const r=await fetch('/api/match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({situation:text,character:ch})});ids=((await r.json()).ids||[]).filter(id=>p.some(q=>q.id===id));if(!ids.length)throw 0}catch{ids=kw(text,p)}}
 await wait(Math.max(0,(fav?1100:2000)-(Date.now()-t0)));
 $('#loader').hidden=true;$('#out').hidden=false;$('#ttl').textContent=title;ranked=ids;favCount();
 if(!ids.length)$('#status').textContent=fav?'No favorites yet. Save a quote and it will show up here.':'No quotes found for that.';
 render(ids,false,!!fav);$('#more').onclick=()=>render(ranked,true);
 if(!fav&&ch!=='All Characters'&&ids.length)fx(ch)}
document.body.dataset.page==='home'?home():results();
