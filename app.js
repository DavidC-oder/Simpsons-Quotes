const $=s=>document.querySelector(s);
const ls=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let E=[],CH=[],ranked=[],shown=0,MODE='list';
const pad=n=>String(n).padStart(2,'0'),code=e=>`S${pad(e.season)}E${pad(e.episode)}`;
const fmt=d=>d?new Date(d+'T00:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}):'an unknown date';
const yr=e=>+(e.airdate||'0').slice(0,4),byId=id=>E.find(e=>e.id===+id);
const match=(e,f)=>(!f.s||e.season==f.s)&&(!f.c||e.characters.includes(f.c))&&(!f.h||e.halloween)&&(!f.t||e.title.toLowerCase().includes(f.t.toLowerCase()))&&(!f.e||(f.e==='classic'?e.season<=10:Math.floor(yr(e)/10)*10==+f.e.slice(1)));
const filtOf=P=>({s:P.get('s')||'',c:P.get('c')||'',e:P.get('e')||'',h:P.get('h')||'',t:P.get('t')||''});
const qs=o=>Object.entries(o).filter(([k,v])=>v).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
async function loadData(){const [d,c]=await Promise.all([fetch('/api/episodes').then(r=>{if(!r.ok)throw 0;return r.json()}),fetch('data/characters.json').then(r=>r.json())]);E=d.episodes||[];CH=c;if(!E.length)throw 0}
function kw(t,pool){const w=(t.toLowerCase().match(/[a-z]{3,}/g)||[]);return pool.map(e=>{const h=(e.title+' '+e.synopsis).toLowerCase();return{id:e.id,s:w.reduce((a,x)=>a+(h.includes(x)?1:0),0)}}).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,25).map(x=>x.id)}
function card(e,best){const f=ls('favs',[]).includes(e.id);return `<article class="card${best?' best':''}${f?' saved':''}${e.halloween?' toh':''}" data-id="${e.id}">${f?'<span class="ribbon">Saved</span>':''}${best?'<span class="badge">Best match</span> ':''}<span class="badge code">${code(e)}</span><h3>${esc(e.title)}</h3><div class="meta">Originally aired ${fmt(e.airdate)}</div><p class="syn">${e.synopsis?esc(e.synopsis):'No synopsis is available for this episode yet.'}</p>${e.wiki&&e.wiki.intro?`<details class="more"><summary>More about this episode</summary><p class="syn">${esc(e.wiki.intro)}</p><a class="src" href="${esc(e.wiki.url)}" target="_blank" rel="noopener">Source: Wikipedia (CC BY-SA)</a></details>`:''}${e.characters.length?`<div class="chars" title="Characters named in the episode synopsis">${e.characters.slice(0,8).map(c=>`<span>${esc(c)}</span>`).join('')}</div>`:''}<div class="acts"><button data-a="copy">Copy</button><button data-a="share">Share</button><button data-a="fav" class="${f?'on':''}">${f?'Saved ✓':'Save'}</button></div></article>`}
const favCount=()=>{const b=$('#favs');if(!b)return;const n=ls('favs',[]).length;b.textContent='Favorites'+(n?` (${n})`:'')};
function render(ids,append,all){const box=$('#results');if(!append){box.innerHTML='';shown=0}
 const size=all?ids.length:MODE==='search'?(shown?3:1):12,next=ids.slice(shown,shown+size);
 box.insertAdjacentHTML('beforeend',next.map((id,i)=>card(byId(id),MODE==='search'&&!shown&&!i)).join(''));shown+=next.length;$('#more').hidden=all||shown>=ids.length}
const go=(t,f)=>{t=(t||'').trim();if(!t&&!Object.values(f).some(Boolean))return;if(t){const r=ls('recent',[]).filter(x=>x!==t);r.unshift(t);sv('recent',r.slice(0,6))}location.href='results.html?'+qs({q:t,...f})};
document.addEventListener('click',async e=>{const t=e.target;
 if(t.dataset.s)return go(t.dataset.s,homeF());
 const a=t.dataset.a;if(!a)return;const c=t.closest('.card'),ep=byId(c.dataset.id),txt=`${ep.title} (${code(ep)}), aired ${fmt(ep.airdate)}. ${ep.synopsis.slice(0,220)}`;
 if(a==='copy'){try{await navigator.clipboard.writeText(txt);t.textContent='Copied!'}catch{prompt('Copy:',txt)}}
 if(a==='share'){if(navigator.share)navigator.share({text:txt}).catch(()=>{});else{try{await navigator.clipboard.writeText(txt);t.textContent='Copied!'}catch{}}}
 if(a==='fav'){let f=ls('favs',[]);const on=!f.includes(ep.id);f=on?[...f,ep.id]:f.filter(x=>x!==ep.id);sv('favs',f);c.classList.toggle('saved',on);t.classList.toggle('on',on);t.textContent=on?'Saved ✓':'Save';const r=c.querySelector('.ribbon');if(r)r.remove();if(on)c.insertAdjacentHTML('afterbegin','<span class="ribbon">Saved</span>');favCount()}});
const homeF=()=>$('#season')?{s:$('#season').value,c:$('#char').value,e:$('#era').value,h:$('#hall').checked?'1':'',t:$('#title').value.trim()}:{};
async function home(){try{await loadData()}catch{$('#status').textContent="Couldn't load the episode database. Please refresh in a moment.";return}
 const seasons=[...new Set(E.map(e=>e.season))].sort((a,b)=>a-b),have=new Set(E.flatMap(e=>e.characters)),decs=[...new Set(E.map(e=>Math.floor(yr(e)/10)*10).filter(Boolean))].sort();
 $('#season').innerHTML='<option value="">All seasons</option>'+seasons.map(s=>`<option value="${s}">Season ${s}</option>`).join('');
 $('#char').innerHTML='<option value="">All characters</option>'+CH.filter(c=>have.has(c.name)).map(c=>`<option>${esc(c.name)}</option>`).join('');
 $('#era').innerHTML='<option value="">All eras</option><option value="classic">Classic era (Seasons 1-10)</option>'+decs.map(d=>`<option value="d${d}">${d}s</option>`).join('');
 $('#seasons').innerHTML=seasons.map(s=>`<a class="chip" title="Season ${s}" href="results.html?s=${s}">${s}</a>`).join('');
 $('#go').onclick=()=>go($('#q').value,homeF());
 $('#char').onchange=e=>{const v=e.target.value;if(v){loadFont(v);setTimeout(()=>fx(v),250)}};
 if(E.filter(e=>e.wiki).length<E.length*.1)$('#status').textContent='Heads up: detailed episode descriptions are not loaded yet, so searches use short TV-guide blurbs. Run the "Update episodes" GitHub Action to fix this.';
 $('#q').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();go($('#q').value,homeF())}});
 $('#pick').onclick=()=>{location.href='results.html?'+qs({random:1,...homeF()})};
 $('#favs').onclick=()=>location.href='results.html?fav=1';
 const rr=()=>{const r=ls('recent',[]);$('#recent').innerHTML=r.map(t=>`<button class="chip" data-s="${esc(t)}">${esc(t)}</button>`).join('')||'<span class="meta">Nothing yet.</span>';$('#clr').hidden=!r.length};
 $('#clr').onclick=()=>{sv('recent',[]);rr()};rr();favCount()}
const FONTS={moe:'Rye',bart:'Permanent+Marker',burns:'Cinzel:wght@700',cbg:'Bangers',bob:'Playfair+Display:ital,wght@1,700',marge:'Pacifico',krusty:'Chewy',ned:'Pacifico',nelson:'Luckiest+Guy',apu:'Titan+One',news:'Oswald:wght@700'};
const FX={
"Homer Simpson":{cls:'homer',v:[['rain'],['stamp',"D'oh!"],['words','Mmm... donuts','rise']]},
"Bart Simpson":{cls:'bart',v:[['stamp','Ay, caramba!'],['words','Eat my shorts!','fall'],['words','Cowabunga!','rise']]},
"Lisa Simpson":{cls:'lisa',v:[['notes'],['stamp','Honor roll!'],['words','A+','fall']]},
"Maggie Simpson":{cls:'lisa',v:[['notes'],['stamp','*suck suck*'],['words','Pacifier!','rise']]},
"Marge Simpson":{cls:'marge',v:[['stamp','Hrrrmm.'],['words','Homeeer!','rise'],['confetti',['#4fa3e0','#ffffff','#2a6fb0']]]},
"Mr. Burns":{cls:'burns',v:[['stamp','Excellent...'],['words','Smithers!','rise'],['words','Release the hounds!','fall']]},
"Principal Skinner":{cls:'skinner',v:[['fire'],['stamp','Steamed hams!'],['words','Seymour!','rise']]},
"Comic Book Guy":{cls:'cbg',v:[['stamp','Worst. Search. Ever.'],['stamp','Ahem. Actually...'],['words','Actually...','fall']]},
"Sideshow Bob":{cls:'bob',v:[['stamp','Thwack!'],['stamp','Foiled again!'],['words','Curses!','fall']]},
"Ralph Wiggum":{cls:'ralph',v:[['balloons'],['stamp',"I'm learnding!"],['words','I choo-choo-choose you!','rise']]},
"Kent Brockman":{cls:'news',v:[['banner','This just in!'],['banner','Breaking news'],['banner','Kent Brockman, Eyewitness News']]},
"Krusty the Clown":{cls:'krusty',v:[['stamp','Hey hey!'],['confetti',['#ffd60a','#d62828','#1E88E5']],['words','Ha ha!','rise']]},
"Ned Flanders":{cls:'ned',v:[['stamp','Hi-diddly-ho!'],['words','Okily-dokily!','rise'],['confetti',['#7bd47b','#a06cd5','#ffffff']]]},
"Nelson Muntz":{cls:'nelson',v:[['stamp','Ha-ha!'],['words','Ha-ha!','fall'],['words','Smell ya later!','rise']]},
"Apu":{cls:'apu',v:[['stamp','Thank you, come again!'],['words','Kwik-E-Mart','fall'],['confetti',['#d62828','#1e5bb8','#ffffff']]]},
"Moe Szyslak":{cls:'moe',v:[['stamp',"Moe's Tavern"],['stamp','Last call!'],['words','Beer nuts!','rise']]}};
const GEN={cls:'',v:[['confetti'],['rain'],['notes']]};
const loadFont=c=>{const f=FONTS[(FX[c]||{}).cls];if(f&&!document.getElementById('f-'+f)){const l=document.createElement('link');l.id='f-'+f;l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family='+f+'&display=swap';document.head.appendChild(l)}};
function fx(c){if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;const d=FX[c]||GEN;let i=Math.floor(Math.random()*3);
 try{if(+sessionStorage.getItem('fx-'+c)===i&&sessionStorage.getItem('fx-'+c)!==null)i=(i+1)%3;sessionStorage.setItem('fx-'+c,i)}catch{}
 const [t,x,y]=d.v[i],cls=d.cls,o=document.createElement('div'),R=(a,b)=>a+Math.random()*(b-a),col=Array.isArray(x)?x:['#ff7eb6','#1E88E5','#FBE78F','#7ed957'];o.className='fx';
 if(t==='rain')for(let n=0;n<16;n++)o.insertAdjacentHTML('beforeend',`<i class="donut" style="left:${R(0,92)}%;--s:${R(34,60)}px;--r:${R(-40,40)}deg;animation:fall ${R(1.6,2.8)}s ${R(0,1)}s ease-in both"></i>`);
 if(t==='notes')for(let n=0;n<14;n++)o.insertAdjacentHTML('beforeend',`<b style="left:${R(0,92)}%;font-size:${R(2,3.6)}rem;animation:rise ${R(2,3)}s ${R(0,.8)}s ease-out both">${'♪♫♩♬'[n%4]}</b>`);
 if(t==='balloons')for(let n=0;n<10;n++)o.insertAdjacentHTML('beforeend',`<i class="bln" style="left:${R(2,90)}%;background:#d62828;animation:rise ${R(2.4,3.4)}s ${R(0,.8)}s ease-out both"></i>`);
 if(t==='confetti')for(let n=0;n<40;n++)o.insertAdjacentHTML('beforeend',`<i class="cf" style="left:${R(0,98)}%;background:${col[n%col.length]};animation:fall ${R(1.4,2.6)}s ${R(0,1)}s ease-in both"></i>`);
 if(t==='words'){const max=Math.max(5,92-String(x).length*4);for(let n=0;n<9;n++)o.insertAdjacentHTML('beforeend',`<b class="w wc-${cls}" style="left:${R(0,max)}%;font-size:${R(1.4,2.5)}rem;animation:${y==='fall'?'fall':'rise'} ${R(2.2,3.4)}s ${R(0,1)}s ${y==='fall'?'ease-in':'ease-out'} both">${esc(x)}</b>`)}
 if(t==='stamp')o.innerHTML=`<div class="stamp st-${cls}">${esc(x)}</div>`;
 if(t==='banner')o.innerHTML=`<div class="banner st-${cls}">${esc(x)}</div>`;
 if(t==='fire')o.innerHTML='<div class="flames"></div>';
 document.body.appendChild(o);setTimeout(()=>o.remove(),4200)}
const nameIn=q=>{for(const c of CH)if(c.aliases.some(a=>new RegExp('(^|[^a-z])'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z])','i').test(q)))return c.name};
async function results(){const P=new URLSearchParams(location.search),t0=Date.now(),f=filtOf(P),q=P.get('q')||'',fav=P.get('fav'),rnd=P.get('random');let ids=[],title,fail=false;
 try{await loadData()}catch{$('#loader').hidden=true;$('#err').hidden=false;return}
 const k=f.c||(q&&nameIn(q));if(k)loadFont(k);
 const pool=E.filter(e=>match(e,f));MODE='list';
 if(fav){ids=ls('favs',[]).filter(byId);title='Your Favorites'}
 else if(rnd){MODE='random';title='Your Random Episode'}
 else if(q){MODE='search';title='Your Episode Matches';
  try{const r=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q,filters:f})});if(!r.ok)throw 0;ids=((await r.json()).ids||[]).filter(byId)}catch{fail=true;ids=kw(q,pool)}}
 else{ids=pool.map(e=>e.id);title=f.s&&!f.c&&!f.e&&!f.h&&!f.t?'Season '+f.s:'Browse Episodes'}
 await wait(Math.max(0,(fav?1000:1900)-(Date.now()-t0)));
 $('#loader').hidden=true;favCount();ranked=ids;
 if(!fav&&k&&(FX[k]||f.c))fx(k);
 if(MODE==='random'){if(!pool.length)return noMatch('No episodes match those filters.');let last=null,seen=[];
  const pick=()=>{let left=pool.filter(e=>!seen.includes(e.id)&&e.id!==last);if(!left.length){seen=[];left=pool.filter(e=>e.id!==last||pool.length===1)}const e=left[Math.random()*left.length|0];seen.push(e.id);last=e.id;return e};
  $('#out').hidden=false;$('#ttl').textContent=title;$('#results').innerHTML=card(pick(),true);$('#more').hidden=false;$('#more').textContent='Pick Another Episode';
  $('#more').onclick=()=>{$('#results').innerHTML=card(pick(),true)};return}
 if(!ids.length){if(fav){$('#out').hidden=false;$('#ttl').textContent=title;$('#status').textContent='No favorites yet. Save an episode and it will show up here.';return}
  return noMatch(q?null:'No episodes match those filters.')}
 $('#out').hidden=false;$('#ttl').textContent=title;if(fail)$('#status').textContent='Smart search is unavailable right now, so these are basic matches.';
 $('#more').textContent=MODE==='search'?'Find More Episodes':'Show More Episodes';
 render(ids,false,!!fav);$('#more').onclick=()=>render(ranked,true);}
function noMatch(msg){const d=$('#doh');d.hidden=false;if(msg)d.querySelector('p').textContent=msg}
document.body.dataset.page==='home'?home():results();
