// Usage: node scripts/import-quotes.js my-quotes.csv
// CSV header: text,character,season,episode,episodeTitle,tags,tone,situations,verified,source,rank  (rank 1 = most famous for that character; tags/situations separated by |)
// Only import quotes you are licensed/authorized to use and have checked. Rows that fail validation are skipped and reported.
const fs=require('fs'),file=process.argv[2];if(!file){console.log('Give a CSV path');process.exit(1)}
const parse=t=>{const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'&&t[i+1]=='"'){f+='"';i++}else if(c=='"')q=false;else f+=c}else if(c=='"')q=true;else if(c==','){r.push(f);f=''}else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;r.push(f);f='';rows.push(r);r=[]}else f+=c}if(f||r.length){r.push(f);rows.push(r)}return rows.filter(x=>x.join('').trim())};
const [h,...rows]=parse(fs.readFileSync(file,'utf8'));
const db=JSON.parse(fs.readFileSync('data/quotes.json','utf8')),seen=new Set(db.quotes.map(q=>(q.character+q.text).toLowerCase()));
let n=db.quotes.length,added=0;
rows.forEach((r,i)=>{const o=Object.fromEntries(h.map((k,j)=>[k.trim(),(r[j]||'').trim()]));
 const bad=!o.text||!o.character||!(+o.season>0)||!(+o.episode>0)||!o.episodeTitle||seen.has((o.character+o.text).toLowerCase());
 if(bad){console.log('Skipped row',i+2);return}
 seen.add((o.character+o.text).toLowerCase());
 db.quotes.push({id:'q'+String(++n).padStart(4,'0'),text:o.text,character:o.character,season:+o.season,episode:+o.episode,episodeTitle:o.episodeTitle,tags:(o.tags||'').split('|').filter(Boolean),tone:o.tone||'',situations:(o.situations||'').split('|').filter(Boolean),verified:o.verified==='true',rank:+o.rank||999,source:o.source||''});added++});
fs.writeFileSync('data/quotes.json',JSON.stringify(db,null,1));console.log('Added',added,'quotes. Total',db.quotes.length);
