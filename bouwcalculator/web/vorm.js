/* Pure room geometry: inside measurements, simple polygon and one planar ceiling.
 * Mirrored by bouw/vorm.py. No dependencies, rendering or pricing logic here. */
const EPS=1e-8;
const defaults=['noord','oost','zuid','west'];
const names={noord:'Wand noord',oost:'Wand oost',zuid:'Wand zuid',west:'Wand west'};
const number=v=>{if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(String(v).trim().replace(',','.')))throw Error('Gebruik eindige getallen voor de ruimtevorm.');const n=Number(String(v).replace(',','.'));if(!Number.isFinite(n))throw Error('Gebruik eindige getallen voor de ruimtevorm.');return n;};
const idOK=id=>/^(noord|oost|zuid|west|wand_[a-z0-9_-]{1,40})$/.test(id);
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function on(a,b,p){return Math.abs(cross(a,b,p))<EPS && p.x>=Math.min(a.x,b.x)-EPS && p.x<=Math.max(a.x,b.x)+EPS && p.y>=Math.min(a.y,b.y)-EPS && p.y<=Math.max(a.y,b.y)+EPS;}
function intersects(a,b,c,d){const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);return (ab1*ab2<0 && cd1*cd2<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);}
function area(p){return p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0)/2;}
function contour(raw){
  if(raw==null || (Array.isArray(raw)&&!raw.length))return [];
  if(!Array.isArray(raw)||raw.length<3||raw.length>64)throw Error('Een contour heeft 3 tot 64 hoeken nodig.');
  const p=raw.map((a,i)=>{if(!a||typeof a!=='object')throw Error('Ongeldig hoekpunt.');const id=String(a.id ?? defaults[i] ?? 'wand_'+(i+1));if(!idOK(id))throw Error('Ongeldig wandnummer.');return {id,x:number(a.x),y:number(a.y)};});
  if(new Set(p.map(a=>a.id)).size!==p.length)throw Error('Elke wand moet een eigen nummer hebben.');
  if(p.some(a=>Math.abs(a.x)>1000||Math.abs(a.y)>1000))throw Error('Het tekenbereik is maximaal 1000 meter.');
  const minX=Math.min(...p.map(a=>a.x)),minY=Math.min(...p.map(a=>a.y));
  p.forEach(a=>{a.x=Math.round((a.x-minX)*1e6)/1e6;a.y=Math.round((a.y-minY)*1e6)/1e6;});
  if(p.some(a=>a.x>1000||a.y>1000))throw Error('Het tekenbereik is maximaal 1000 meter.');
  for(let i=0;i<p.length;i++){
    const a=p[i],b=p[(i+1)%p.length],c=p[(i+2)%p.length];
    if(Math.hypot(b.x-a.x,b.y-a.y)<.05-EPS)throw Error('Elke wand moet minstens 5 cm lang zijn.');
    if(Math.abs(cross(a,b,c))<EPS && (b.x-a.x)*(c.x-b.x)+(b.y-a.y)*(c.y-b.y)<0)throw Error('Wanden mogen niet terug over zichzelf lopen.');
    for(let j=i+1;j<p.length;j++){if(j===i+1||(i===0&&j===p.length-1))continue;if(intersects(a,b,p[j],p[(j+1)%p.length]))throw Error('De contour kruist of raakt zichzelf.');}
  }
  if(Math.abs(area(p))<.01-EPS)throw Error('De ruimte moet minstens 0,01 m² groot zijn.');
  return p;
}
function roof(raw){
  if(raw==null)return null;
  if(!raw||!['x','y'].includes(raw.as))throw Error('Kies X of Y voor de plafondhelling.');
  const start=number(raw.start),eind=number(raw.eind);
  if(Math.min(start,eind)<.1||Math.max(start,eind)>100)throw Error('Plafondhoogten moeten tussen 0,10 en 100 meter liggen.');
  return {as:raw.as,start,eind};
}
function points(r){return r.contour?.length?r.contour:[{id:'noord',x:0,y:0},{id:'oost',x:r.lengte,y:0},{id:'zuid',x:r.lengte,y:r.breedte},{id:'west',x:0,y:r.breedte}];}
function height(r,x,y){if(!r.dak)return Number(r.hoogte);const d=r.dak,t=d.as==='x'?x/r.lengte:y/r.breedte;return d.start+(d.eind-d.start)*t;}
function edges(r){
  const p=points(r);
  return p.map((a,i)=>{let b=p[(i+1)%p.length];if(!r.contour?.length && ['zuid','west'].includes(a.id))[a,b]=[b,a];const lengte=Math.hypot(b.x-a.x,b.y-a.y);return {id:p[i].id,naam:r.contour?.length?'Wand '+(i+1):names[p[i].id],a,b,lengte,u:[(b.x-a.x)/lengte,(b.y-a.y)/lengte,0],h0:height(r,a.x,a.y),h1:height(r,b.x,b.y)};});
}
function inside(r,q){const p=points(r);let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[j],b=p[i];if(on(a,b,q))return true;if((a.y>q.y)!==(b.y>q.y) && q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
function interior(r){
  const p=points(r),s=area(p);let x=0,y=0;
  p.forEach((a,i)=>{const b=p[(i+1)%p.length],c=a.x*b.y-b.x*a.y;x+=(a.x+b.x)*c;y+=(a.y+b.y)*c;});
  const c={x:x/(6*s),y:y/(6*s)};
  if(inside(r,c))return c;
  for(let i=0;i<p.length;i++){const a=p[(i+p.length-1)%p.length],b=p[i],d=p[(i+1)%p.length],q={x:(a.x+b.x+d.x)/3,y:(a.y+b.y+d.y)/3};if(inside(r,q))return q;}
  return {x:p[0].x,y:p[0].y};
}
function segmentInside(r,a,b){
  if(!inside(r,a)||!inside(r,b))return false;
  const dx=b.x-a.x,dy=b.y-a.y,ts=[0,1];
  for(const e of edges(r)){
    const ex=e.b.x-e.a.x,ey=e.b.y-e.a.y,det=dx*ey-dy*ex;
    if(Math.abs(det)<EPS)continue;
    const ax=e.a.x-a.x,ay=e.a.y-a.y,t=(ax*ey-ay*ex)/det,u=(ax*dy-ay*dx)/det;
    if(t>0&&t<1&&u>=-EPS&&u<=1+EPS)ts.push(t);
  }
  ts.sort((a,b)=>a-b);
  for(let i=1;i<ts.length;i++){const t=(ts[i-1]+ts[i])/2;if(!inside(r,{x:a.x+t*dx,y:a.y+t*dy}))return false;}
  return true;
}
function surfaces(r){
  const p=points(r),vloer=Math.abs(area(p)),d=r.dak;
  const gradient=d?(d.eind-d.start)/(d.as==='x'?r.lengte:r.breedte):0,factor=Math.hypot(1,gradient);
  const walls=edges(r).map(e=>{const os=(r.openingen||[]).filter(o=>o.muur===e.id),opening=os.reduce((s,o)=>s+o.breedte*o.hoogte*Math.max(1,o.aantal),0),bruto=e.lengte*(e.h0+e.h1)/2;return {sleutel:e.id,naam:e.naam,soort:'muur',bruto,opening,netto:Math.max(0,bruto-opening),lengte:e.lengte,hoogte:Math.max(e.h0,e.h1),openingen:os.reduce((s,o)=>s+Math.max(1,o.aantal),0),hoogte_begin:e.h0,hoogte_eind:e.h1};});
  return [...walls,...['plafond','vloer'].map(s=>({sleutel:s,naam:s==='vloer'?'Vloer':'Plafond',soort:s,bruto:vloer*(s==='plafond'?factor:1),opening:0,netto:vloer*(s==='plafond'?factor:1),lengte:r.lengte*(s==='plafond'&&d?.as==='x'?factor:1),breedte:r.breedte*(s==='plafond'&&d?.as==='y'?factor:1),hoogte:r.hoogte,openingen:0}))].map(v=>Object.fromEntries(Object.entries(v).map(([k,n])=>[k,typeof n==='number'?Math.sign(n)*Math.floor(Math.abs(n)*1e9+.5)/1e9:n])));
}
export const Vorm={number,contour,roof,points,edges,height,inside,interior,segmentInside,area,surfaces,idOK};
globalThis.BouwVorm=Vorm;
