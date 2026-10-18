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
function contour(raw,normaliseer=true){
  if(raw==null || (Array.isArray(raw)&&!raw.length))return [];
  if(!Array.isArray(raw)||raw.length<3||raw.length>64)throw Error('Een contour heeft 3 tot 64 hoeken nodig.');
  const p=raw.map((a,i)=>{if(!a||typeof a!=='object')throw Error('Ongeldig hoekpunt.');const id=String(a.id ?? defaults[i] ?? 'wand_'+(i+1));if(!idOK(id))throw Error('Ongeldig wandnummer.');return {id,x:number(a.x),y:number(a.y)};});
  if(new Set(p.map(a=>a.id)).size!==p.length)throw Error('Elke wand moet een eigen nummer hebben.');
  if(p.some(a=>Math.abs(a.x)>1000||Math.abs(a.y)>1000))throw Error('Het tekenbereik is maximaal 1000 meter.');
  const minX=normaliseer?Math.min(...p.map(a=>a.x)):0,minY=normaliseer?Math.min(...p.map(a=>a.y)):0;
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
function inside(r,q,boundary=true,tolerance=EPS){const p=points(r);let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[j],b=p[i];if(Math.abs(cross(a,b,q))<tolerance*Math.max(1,Math.hypot(b.x-a.x,b.y-a.y))&&q.x>=Math.min(a.x,b.x)-tolerance&&q.x<=Math.max(a.x,b.x)+tolerance&&q.y>=Math.min(a.y,b.y)-tolerance&&q.y<=Math.max(a.y,b.y)+tolerance)return boundary;if((a.y>q.y)!==(b.y>q.y) && q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
function interior(r){
  const p=points(r),s=area(p);let x=0,y=0;
  p.forEach((a,i)=>{const b=p[(i+1)%p.length],c=a.x*b.y-b.x*a.y;x+=(a.x+b.x)*c;y+=(a.y+b.y)*c;});
  const c={x:x/(6*s),y:y/(6*s)};
  if(inside(r,c))return c;
  for(let i=0;i<p.length;i++){const a=p[(i+p.length-1)%p.length],b=p[i],d=p[(i+1)%p.length],q={x:(a.x+b.x+d.x)/3,y:(a.y+b.y+d.y)/3};if(inside(r,q))return q;}
  return {x:p[0].x,y:p[0].y};
}
function segmentInside(r,a,b,tolerance=EPS){
  if(!inside(r,a,true,tolerance)||!inside(r,b,true,tolerance))return false;
  const dx=b.x-a.x,dy=b.y-a.y,ts=[0,1];
  for(const e of edges(r)){
    const ex=e.b.x-e.a.x,ey=e.b.y-e.a.y,det=dx*ey-dy*ex;
    if(Math.abs(det)<EPS)continue;
    const ax=e.a.x-a.x,ay=e.a.y-a.y,t=(ax*ey-ay*ex)/det,u=(ax*dy-ay*dx)/det;
    if(t>0&&t<1&&u>=-EPS&&u<=1+EPS)ts.push(t);
  }
  ts.sort((a,b)=>a-b);
  for(let i=1;i<ts.length;i++){const t=(ts[i-1]+ts[i])/2;if(!inside(r,{x:a.x+t*dx,y:a.y+t*dy},true,tolerance))return false;}
  return true;
}
function leaning(raw){
  if(raw==null)return {};
  if(typeof raw!=='object'||Array.isArray(raw))throw Error('Ongeldige wandhellingen.');
  const out={};for(const [id,v] of Object.entries(raw)){if(!idOK(id))throw Error('Ongeldig wandnummer.');const n=number(v);if(n<0||n>100)throw Error('Wandinsprong moet tussen 0 en 100 meter liggen.');if(n)out[id]=n;}return out;
}
function position(raw){if(raw==null)return null;const x=number(raw.x),y=number(raw.y);if(x<0||y<0||x>1000||y>1000)throw Error('Huispositie moet binnen 0 tot 1000 meter liggen.');return {x,y};}
function top(r){
  const p=points(r),hs=r.wand_helling||{};if(!Object.keys(hs).length)return p.map(a=>({...a,z:height(r,a.x,a.y)}));
  contour(p,false);
  if(r.dak)throw Error('Combineer een schuine wand nog niet met een hellend plafond.');
  const sign=Math.sign(area(p));
  if(p.some((a,i)=>cross(a,p[(i+1)%p.length],p[(i+2)%p.length])*sign < -EPS))throw Error('Schuine wanden vereisen een convexe contour; splits een L/U-vorm eerst in kamers.');
  if(Object.keys(hs).some(id=>!p.some(a=>a.id===id)))throw Error('Een schuine wand verwijst naar een ontbrekende wand.');
  const lines=p.map((a,i)=>{const b=p[(i+1)%p.length],len=Math.hypot(b.x-a.x,b.y-a.y),n=[-(b.y-a.y)/len*sign,(b.x-a.x)/len*sign];return {n,c:n[0]*a.x+n[1]*a.y+(hs[a.id]||0)};});
  const result=p.map((a,i)=>{const prev=lines[(i+p.length-1)%p.length],cur=lines[i],det=prev.n[0]*cur.n[1]-prev.n[1]*cur.n[0];let x,y;
    if(Math.abs(det)<EPS){if(Math.abs(prev.c-cur.c)>EPS)throw Error('Rechte aansluitende wanden moeten dezelfde insprong hebben.');x=a.x+cur.n[0]*(hs[a.id]||0);y=a.y+cur.n[1]*(hs[a.id]||0);}
    else{x=(prev.c*cur.n[1]-prev.n[1]*cur.c)/det;y=(prev.n[0]*cur.c-prev.c*cur.n[0])/det;}
    return {id:a.id,x,y,z:Number(r.hoogte)};
  });
  contour(result,false);
  if(Math.sign(area(result))!==sign||result.some((a,i)=>{const b=result[(i+1)%p.length],f=p[i],g=p[(i+1)%p.length];return !inside(r,a)||(b.x-a.x)*(g.x-f.x)+(b.y-a.y)*(g.y-f.y)<=EPS;}))throw Error('De wandinsprong maakt het plafond ongeldig of te klein.');
  return result;
}
function wallFrame(r,id){
  const e=edges(r).find(e=>e.id===id);if(!e)return null;
  const p=points(r),ts=top(r),i=p.findIndex(a=>a.id===id);let a=ts[i],b=ts[(i+1)%p.length];
  if(!r.contour?.length&&['west','zuid'].includes(id))[a,b]=[b,a];
  const inset=r.wand_helling?.[id]||0,H=Number(r.hoogte),h=Math.hypot(H,inset),dx=(a.x-e.a.x),dy=(a.y-e.a.y),normal=dx* -e.u[1]+dy*e.u[0];
  const v=inset?[-e.u[1]*normal/h,e.u[0]*normal/h,H/h]:[0,0,1];
  return {...e,v,height:inset?h:Math.max(e.h0,e.h1),inset,topA:a,topB:b,quad:[[e.a.x,e.a.y,0],[e.b.x,e.b.y,0],[b.x,b.y,b.z],[a.x,a.y,a.z]]};
}
function wallRange(r,id,t){
  const f=wallFrame(r,id),ratio=Math.max(0,Math.min(1,t/f.height));
  const a=(f.topA.x-f.a.x)*f.u[0]+(f.topA.y-f.a.y)*f.u[1],b=(f.topB.x-f.a.x)*f.u[0]+(f.topB.y-f.a.y)*f.u[1];
  return [a*ratio,f.lengte+(b-f.lengte)*ratio];
}
function wallPoint(r,id,s,t){
  const f=wallFrame(r,id);t=Math.max(0,Math.min(f.height,t));const [lo,hi]=wallRange(r,id,t);s=Math.max(lo,Math.min(hi,s));
  return [f.a.x+f.u[0]*s+f.v[0]*t,f.a.y+f.u[1]*s+f.v[1]*t,f.v[2]*t];
}
function world(r){const o=r.huis_positie||{x:0,y:0};return {...r,contour:points(r).map(p=>({...p,x:p.x+o.x,y:p.y+o.y}))};}
function properCross(a,b,c,d){const side=(p,q,r)=>{const v=cross(p,q,r),tol=1e-6*Math.max(1,Math.hypot(q.x-p.x,q.y-p.y));return Math.abs(v)<=tol?0:Math.sign(v);};return side(a,b,c)*side(a,b,d)<0&&side(c,d,a)*side(c,d,b)<0;}
function overlap(a,b){
  const p=points(a),q=points(b);
  for(const x of p)if(inside(b,x,false,1e-6))return true;
  for(const x of q)if(inside(a,x,false,1e-6))return true;
  for(let i=0;i<p.length;i++){const x=p[i],y=p[(i+1)%p.length];if(inside(b,{x:(x.x+y.x)/2,y:(x.y+y.y)/2},false,1e-6))return true;
    for(let j=0;j<q.length;j++){const u=q[j],v=q[(j+1)%q.length];if(properCross(x,y,u,v))return true;}}
  for(const [poly,other] of [[p,b],[q,a]])for(let i=0;i<poly.length;i++){const x=poly[i],y=poly[(i+1)%poly.length],z=poly[(i+2)%poly.length],pt={x:(x.x+y.x+z.x)/3,y:(x.y+y.y+z.y)/3};if(inside({contour:poly},pt,false,1e-6)&&inside(other,pt,false,1e-6))return true;}
  return false;
}
function layout(project){
  const rooms=project.ruimtes.filter(r=>r.huis_positie);
  if(rooms.length&&!project.huis)throw Error('Een geplaatste ruimte heeft geen huiscontour.');
  for(let i=0;i<rooms.length;i++){
    const r=world(rooms[i]),p=points(r);
    if(p.some((a,k)=>!segmentInside(project.huis,a,p[(k+1)%p.length],1e-6)))throw Error(`Ruimte “${rooms[i].naam}” valt buiten de huiscontour.`);
    for(let j=0;j<i;j++)if(overlap(r,world(rooms[j])))throw Error(`Ruimtes “${rooms[i].naam}” en “${rooms[j].naam}” overlappen op het huisplan.`);
  }
}
// A straight chord between two boundary points; used only by the drawing editor.
function split(r,a,b){
  if(Math.hypot(a.x-b.x,a.y-b.y)<.05||!segmentInside(r,a,b))throw Error('De scheidingswand moet binnen de kamer liggen en minstens 5 cm lang zijn.');
  const p=points(r),nodes=[],used=new Set(p.map(p=>p.id));let counter=0;
  const fresh=()=>{let id;do{id='wand_snede_'+(++counter);}while(used.has(id));used.add(id);return id;};
  let ai=-1,bi=-1;
  for(let i=0;i<p.length;i++){
    const x=p[i],y=p[(i+1)%p.length],len2=(y.x-x.x)**2+(y.y-x.y)**2,at=[{...x,t:0}];
    for(const [q,kind] of [[a,'a'],[b,'b']])if(on(x,y,q)){const t=((q.x-x.x)*(y.x-x.x)+(q.y-x.y)*(y.y-x.y))/len2;if(t<1-EPS){if(t<EPS)at[0].kind=kind;else at.push({...q,id:fresh(),t,kind});}}
    at.sort((x,y)=>x.t-y.t);for(const n of at){if(n.kind==='a')ai=nodes.length;if(n.kind==='b')bi=nodes.length;nodes.push({id:n.id,x:n.x,y:n.y});}
  }
  if(ai<0||bi<0||ai===bi)throw Error('Kies twee verschillende punten op de kamergrens.');
  if(ai>bi)[ai,bi]=[bi,ai];
  const first=nodes.slice(ai,bi+1),second=[...nodes.slice(bi),...nodes.slice(0,ai+1)];
  first[first.length-1]={...first.at(-1),id:fresh()};second[second.length-1]={...second.at(-1),id:fresh()};
  for(const ps of [first,second])contour(ps,false);
  const sum=Math.abs(area(first))+Math.abs(area(second));if(Math.abs(sum-Math.abs(area(p)))>1e-6)throw Error('Deze snede verdeelt de kamer niet in precies twee geldige delen.');
  return [first,second];
}
function cutAt(r,axis,value){
  const p=points(r),qs=[];
  p.forEach((a,i)=>{const b=p[(i+1)%p.length],da=a[axis]-value,db=b[axis]-value;if(Math.abs(da)<EPS&&Math.abs(db)<EPS)throw Error('De snede ligt op een bestaande wand.');if(da*db<=0&&Math.abs(b[axis]-a[axis])>EPS){const t=(value-a[axis])/(b[axis]-a[axis]),q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};if(!qs.some(v=>Math.hypot(v.x-q.x,v.y-q.y)<EPS))qs.push(q);}});
  if(qs.length!==2)throw Error('Deze snede kruist de contour niet precies twee keer. Kies een andere positie of teken de twee eindpunten zelf.');
  return split(r,...qs);
}

function surfaces(r){
  const p=points(r),vloer=Math.abs(area(p)),d=r.dak,ts=top(r),plafond=Math.abs(area(ts));
  const gradient=d?(d.eind-d.start)/(d.as==='x'?r.lengte:r.breedte):0,factor=Math.hypot(1,gradient);
  const walls=edges(r).map(e=>{const os=(r.openingen||[]).filter(o=>o.muur===e.id),opening=os.reduce((s,o)=>s+o.breedte*o.hoogte*Math.max(1,o.aantal),0),frame=wallFrame(r,e.id),bruto=(e.lengte+Math.hypot(frame.topB.x-frame.topA.x,frame.topB.y-frame.topA.y))/2*(frame.inset?frame.height:(e.h0+e.h1)/2);return {sleutel:e.id,naam:e.naam,soort:'muur',bruto,opening,netto:Math.max(0,bruto-opening),lengte:e.lengte,hoogte:frame.inset?frame.height:Math.max(e.h0,e.h1),openingen:os.reduce((s,o)=>s+Math.max(1,o.aantal),0),hoogte_begin:e.h0,hoogte_eind:e.h1};});
  return [...walls,...['plafond','vloer'].map(s=>({sleutel:s,naam:s==='vloer'?'Vloer':'Plafond',soort:s,bruto:(s==='plafond'?plafond*factor:vloer),opening:0,netto:(s==='plafond'?plafond*factor:vloer),lengte:r.lengte*(s==='plafond'&&d?.as==='x'?factor:1),breedte:r.breedte*(s==='plafond'&&d?.as==='y'?factor:1),hoogte:r.hoogte,openingen:0}))].map(v=>Object.fromEntries(Object.entries(v).map(([k,n])=>[k,typeof n==='number'?Math.sign(n)*Math.floor(Math.abs(n)*1e9+.5)/1e9:n])));
}
export const Vorm={leaning,position,top,wallFrame,wallRange,wallPoint,world,overlap,layout,split,cutAt,number,contour,roof,points,edges,height,inside,interior,segmentInside,area,surfaces,idOK};
globalThis.BouwVorm=Vorm;
