const $ = selector => document.querySelector(selector);
const NS = 'http://www.w3.org/2000/svg';
const state = {topic:null,query:'',selected:null,showLinks:true,viewKey:'',visible:[],camera:{x:0,y:0,k:1}};
let graph,knowledge,sources,posts,topics,knowledgeMap,sourceMap,postMap,positions=new Map();
const categories={verified:'확인된 정보'};
const colors={verified:'#c6f28a'};
function hashId(){try{return decodeURIComponent(location.hash.slice(1));}catch{return '';}}
function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function svg(tag,attrs){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
function safeLink(url){try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function link(url,className){const a=el('a',className);const safe=safeLink(url);if(safe){a.href=safe;a.target='_blank';a.rel='noopener noreferrer';}return a;}
function section(title){const s=el('section','detail-section');s.append(el('h3','',title));return s;}
function msg(text,retry=false){const m=$('#message');m.replaceChildren(el('span','',text));m.hidden=false;if(retry){const b=el('button','','다시 불러오기');b.onclick=load;m.append(b);}}

async function fetchJSON(file){const response=await fetch(new URL(`./data/${file}.json`,import.meta.url));if(!response.ok)throw new Error(`${file}: HTTP ${response.status}`);return response.json();}
async function load(){
 try{
  msg('지식 지도를 불러오고 있습니다.');
  const [g,k,s,p]=await Promise.all(['graph','knowledge','sources','posts'].map(fetchJSON));
  if(g.schemaVersion!=='1.0.0'||!Array.isArray(g.nodes)||!Array.isArray(g.edges)||!Array.isArray(k.items)||!Array.isArray(s.items)||!Array.isArray(p.items))throw new Error('Unsupported data format');
  graph=g;knowledge=k.items;sources=s.items;posts=p.items;topics=g.nodes.filter(n=>n.type==='topic');
  knowledgeMap=new Map(knowledge.map(n=>[n.id,n]));sourceMap=new Map(sources.map(n=>[n.id,n]));postMap=new Map(posts.map(n=>[n.id,n]));
  if(knowledgeMap.size!==knowledge.length||knowledge.some(n=>!topics.some(t=>t.id===n.topicId)||!categories[n.category]||n.sourceIds.some(id=>!sourceMap.has(id))||n.postIds.some(id=>!postMap.has(id))))throw new Error('Invalid data references');
  $('#checked-at').textContent=g.checkedAt;
  $('#verified-count').textContent=knowledge.length;
  $('#message').hidden=true;
  const hash=hashId();
  state.selected=knowledgeMap.has(hash)?hash:(knowledgeMap.has('F06')?'F06':knowledge[0]?.id);
  if(hash && !knowledgeMap.has(hash))window.history.replaceState(null,'',state.selected?`#${state.selected}`:location.pathname+location.search);
  render();
 }catch(error){console.error(error);msg('데이터를 불러오지 못했습니다. 인터넷 연결과 data 폴더를 확인해 주세요.',true);}
}
function matches(node){
 const q=state.query.toLocaleLowerCase('ko');
 const haystack=[node.id,node.title,node.claim,node.verification,node.status,...(node.members||[]).map(m=>`${m.name} ${m.party}`),...node.sourceIds.map(id=>sourceMap.get(id)?.title||'')].join(' ').toLocaleLowerCase('ko');
 return node.category==='verified'&&(!state.topic||node.topicId===state.topic)&&(!q||haystack.includes(q));
}
function render(){
 state.visible=knowledge.filter(matches);
 const topicBox=$('#topics');topicBox.replaceChildren();
 const all=el('button','','전체 주제');all.setAttribute('aria-pressed',String(!state.topic));all.onclick=()=>{state.topic=null;render();};topicBox.append(all);
 for(const t of topics){const b=el('button');b.setAttribute('aria-pressed',String(state.topic===t.id));const dot=el('i','dot');dot.style.background=t.color;b.append(dot,el('span','',t.label),el('span','',String(knowledge.filter(k=>k.topicId===t.id).length)));b.onclick=()=>{state.topic=state.topic===t.id?null:t.id;render();};topicBox.append(b);}
 $('#list-count').textContent=`${state.visible.length}개`;
 $('#graph-count').textContent=`${state.visible.length}개 지식`;
 $('#toggle-links').setAttribute('aria-pressed',String(state.showLinks));
 if(!state.visible.some(n=>n.id===state.selected))state.selected=state.visible[0]?.id||null;
 const list=$('#node-list');list.replaceChildren();
 for(const n of state.visible){const b=el('button',n.id===state.selected?'selected':'');b.dataset.id=n.id;b.append(el('span','node-id',n.id),el('span','',n.title));b.onclick=()=>select(n.id);list.append(b);}
 if(!state.visible.length){list.append(el('p','empty-text','검색 결과가 없습니다. 검색어나 주제를 바꿔보세요.'));msg('표시할 지식이 없습니다. 검색어나 주제를 변경해 주세요.');}
 else $('#message').hidden=true;
 layout();draw();showDetail();
}
function select(id,{reveal=false,scroll=true,history=true}={}){
 const n=knowledgeMap.get(id);if(!n)return;
 state.selected=id;
 if(reveal||!positions.has(id)){if(reveal){state.query='';$('#search').value='';}state.topic=null;render();}else{updateHighlight();showDetail();document.querySelectorAll('#node-list button').forEach(b=>b.classList.toggle('selected',b.dataset.id===id));}
 if(history)window.history.replaceState(null,'',`#${encodeURIComponent(id)}`);
 if(scroll&&window.innerWidth<=940)$('#detail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}
function relatedTo(id){return graph.edges.filter(e=>e.type!=='topic'&&(e.source===id||e.target===id));}
function showDetail(){
 const panel=$('#detail');panel.replaceChildren();
 const n=knowledgeMap.get(state.selected);
 if(!n){panel.append(el('p','detail-placeholder','지식 노드를 선택하면 검증자료와 출처가 여기에 표시됩니다.'));return;}
 const topic=topics.find(t=>t.id===n.topicId);
 const top=el('div','detail-top');top.append(el('span','','KNOWLEDGE NOTE'),el('span','',n.id));panel.append(top);
 const badge=el('span',`badge ${n.category}`);badge.append(el('i',`dot ${n.category}`),document.createTextNode(n.status));panel.append(badge,el('h2','',n.title));
 if(n.category!=='verified')panel.append(el('p','claim-label','검토 대상 주장 · 사실로 확정된 내용이 아닙니다'));
 panel.append(el('p','claim',n.claim));
 const meta=el('div','meta');meta.append(el('span','',topic.label),el('span','','·'),el('span','',`검토 ${n.checkedAt}`));panel.append(meta);
 const evidence=section(n.category==='pending'?'확인에 필요한 자료':'검증자료');evidence.append(el('p','',n.verification));
 if(n.sourceIds.length){
  for(const id of n.sourceIds){const source=sourceMap.get(id);const card=link(source.url,'source-card');const head=el('div','source-meta');head.append(el('span','',`출처 ${id}`),el('span','','↗'));card.append(head,el('strong','',source.title),el('small','',`${source.type} · ${source.publishedAt}`));evidence.append(card);}
 }else evidence.append(el('p','empty-text','직접 자료 확보가 필요합니다. 외부 근거 대조를 완료한 항목이 아닙니다.'));
 panel.append(evidence);
 if(n.members?.length){const roster=el('details');roster.append(el('summary','',`해당 자료에 기재된 명단 ${n.members.length}명 · 당시 소속`));const list=el('ul');for(const m of n.members)list.append(el('li','',`${m.name} · ${m.party}`));roster.append(list);panel.append(roster);}
 const limits=section('해석의 범위');limits.classList.add('limits');limits.append(el('p','',n.limitations));panel.append(limits);
 const relations=relatedTo(n.id);const ids=[...new Set(relations.map(e=>e.source===n.id?e.target:e.source))];
 if(ids.length){const related=section(`연결된 지식 ${ids.length}`);for(const id of ids){const next=knowledgeMap.get(id);const labels=[...new Set(relations.filter(e=>e.source===id||e.target===id).map(e=>e.label))];const b=el('button','related-button');const text=el('span','',next.title);text.append(el('small','',`${categories[next.category]} · ${labels.join(' / ')}`));b.append(text,el('span','','↗'));b.onclick=()=>select(id,{reveal:true,scroll:false});related.append(b);}panel.append(related);}
 const original=el('details');original.append(el('summary','',`수집 원문 ${n.postIds.length}개`));for(const id of n.postIds){const p=postMap.get(id);const a=link(p.url,'post-link');a.textContent=`${id} · ${p.title} ↗`;original.append(a);}panel.append(original);
 panel.scrollTop=0;
}

let simulationFrame=0,energy=0,links=[],nodeElements=new Map(),edgeElements=[],dragging=null,dragMoved=false;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function layout(){
 cancelAnimationFrame(simulationFrame);
 const active=topics.filter(t=>state.visible.some(n=>n.topicId===t.id));
 const ids=new Set([...active,...state.visible].map(n=>n.id));
 links=graph.edges.filter(e=>ids.has(e.source)&&ids.has(e.target));
 const degree=new Map();for(const e of links){degree.set(e.source,(degree.get(e.source)||0)+1);degree.set(e.target,(degree.get(e.target)||0)+1);}
 const old=positions;positions=new Map();
 active.forEach((t,i)=>{
  const angle=i*2*Math.PI/active.length,cx=Math.cos(angle)*300,cy=Math.sin(angle)*300;
  const members=state.visible.filter(n=>n.topicId===t.id);
  const add=(id,type,x,y,r)=>{const prev=old.get(id);positions.set(id,{id,type,x:prev?.x??x,y:prev?.y??y,vx:0,vy:0,r,degree:degree.get(id)||1,color:t.color});};
  add(t.id,'topic',cx,cy,14+Math.sqrt(members.length)*2);
  members.forEach((n,j)=>{const a=j*2.399963,r=35+Math.sqrt(j+1)*18;add(n.id,'knowledge',cx+Math.cos(a)*r,cy+Math.sin(a)*r,Math.min(10,4+Math.sqrt(degree.get(n.id)||1)*.6));});
 });
 for(let i=0;i<220;i++)step(1-i/250);
 $('#graph-page').textContent='노드 드래그 · 연결을 따라 자유롭게 탐색';
 $('#map-back').hidden=!state.topic&&!state.query;
 $('#graph-count').textContent=state.visible.length+'개 지식';
}
function step(alpha){
 const nodes=[...positions.values()];
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  const a=nodes[i],b=nodes[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<.01){dx=.1;dy=.1;d=.142;}
  const gap=a.r+b.r+12,repel=Math.min(4,900/(d*d))*alpha+(d<gap?(gap-d)*.12:0);
  const fx=dx/d*repel,fy=dy/d*repel;a.vx-=fx;a.vy-=fy;b.vx+=fx;b.vy+=fy;
 }
 for(const e of links){const a=positions.get(e.source),b=positions.get(e.target),dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy));const strength=e.type==='topic'?.018:.012/Math.sqrt(Math.max(a.degree,b.degree));const force=(d-(e.type==='topic'?100:75))*strength*alpha;const fx=dx/d*force,fy=dy/d*force;a.vx+=fx;a.vy+=fy;b.vx-=fx;b.vy-=fy;}
 for(const n of nodes){if(n===dragging?.node){n.vx=n.vy=0;continue;}n.vx=(n.vx-n.x*.0008*alpha)*.78;n.vy=(n.vy-n.y*.0008*alpha)*.78;n.x+=n.vx;n.y+=n.vy;}
}
function runSimulation(){
 cancelAnimationFrame(simulationFrame);energy=1;
 const tick=()=>{step(energy);paintPositions();energy*=.965;if(energy>.025||dragging?.node)simulationFrame=requestAnimationFrame(tick);else updateLabels();};
 if(reducedMotion()){for(let i=0;i<70;i++)step(1-i/80);paintPositions();updateLabels();}else simulationFrame=requestAnimationFrame(tick);
}
function fit(){
 const nodes=[...positions.values()];if(!nodes.length)return;
 const host=$('#graph-host'),minX=Math.min(...nodes.map(n=>n.x-n.r))-90,maxX=Math.max(...nodes.map(n=>n.x+n.r))+90,minY=Math.min(...nodes.map(n=>n.y-n.r))-60,maxY=Math.max(...nodes.map(n=>n.y+n.r))+70;
 const k=Math.min(host.clientWidth/(maxX-minX),(host.clientHeight-75)/(maxY-minY),1.6);
 state.camera={x:host.clientWidth/2-(minX+maxX)/2*k,y:(host.clientHeight-65)/2-(minY+maxY)/2*k,k};applyCamera();
}
function draw(){
 $('#edges').replaceChildren();$('#nodes').replaceChildren();nodeElements=new Map();edgeElements=[];
 for(const e of links){const a=positions.get(e.source);const line=svg('line',{class:'graph-edge '+(e.type==='topic'?'':'related'),stroke:a.color});const title=svg('title',{});title.textContent=e.label+': '+e.basis.join(', ');line.append(title);$('#edges').append(line);edgeElements.push({e,line});}
 for(const p of positions.values()){
  const n=p.type==='topic'?topics.find(t=>t.id===p.id):knowledgeMap.get(p.id);
  const g=svg('g',{class:'graph-node '+p.type,tabindex:'0',role:'button','aria-label':p.type==='topic'?n.label+' 주제 선택':n.title+', '+n.status,'data-id':p.id});
  g.append(svg('circle',{r:Math.max(12,p.r+3),fill:'transparent'}),svg('circle',{r:p.r+5,class:'node-ring'}),svg('circle',{r:p.r,fill:p.color,stroke:p.color,'stroke-width':1}));
  const text=svg('text',{y:p.r+17});const chars=Array.from(p.type==='topic'?n.label:n.title);for(let i=0;i<2&&chars.length;i++){const span=svg('tspan',{x:0,dy:i?16:0});span.textContent=chars.splice(0,18).join('')+(i===1&&chars.length?'…':'');text.append(span);}g.append(text);
  const title=svg('title',{});title.textContent=p.type==='topic'?n.label:n.id+' · '+n.title;g.append(title);
  const activate=()=>{if(p.type==='topic'){state.topic=state.topic===p.id?null:p.id;render();}else select(p.id);};
  g.addEventListener('click',()=>{if(!dragMoved)activate();});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
  g.addEventListener('mouseenter',()=>g.classList.add('hovered'));g.addEventListener('mouseleave',()=>g.classList.remove('hovered'));
  nodeElements.set(p.id,g);$('#nodes').append(g);
 }
 paintPositions();updateHighlight();fit();
}
function paintPositions(){
 for(const [id,g]of nodeElements){const p=positions.get(id);g.setAttribute('transform',`translate(${p.x},${p.y})`);}
 for(const {e,line}of edgeElements){const a=positions.get(e.source),b=positions.get(e.target);for(const [key,value]of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y}))line.setAttribute(key,value);}
}
function updateHighlight(){
 const neighbors=new Set(relatedTo(state.selected).flatMap(e=>[e.source,e.target]));
 for(const [id,g]of nodeElements){g.classList.toggle('selected',id===state.selected);g.classList.toggle('neighbor',neighbors.has(id));g.setAttribute('aria-pressed',String(id===state.selected));}
 for(const {e,line}of edgeElements){const selected=e.source===state.selected||e.target===state.selected;line.classList.toggle('highlight',selected);line.style.display=e.type==='topic'||state.showLinks||selected?'':'none';}
 updateLabels();
}
function applyCamera(){const c=state.camera;$('#viewport').setAttribute('transform',`translate(${c.x},${c.y}) scale(${c.k})`);updateLabels();}
function updateLabels(){
 const k=state.camera.k,occupied=[];
 const entries=[...nodeElements].sort(([a],[b])=>{const priority=id=>id===state.selected?0:positions.get(id).type==='topic'?1:2;return priority(a)-priority(b);});
 for(const [id,g]of entries){const p=positions.get(id),t=g.querySelector('text');t.style.fontSize=(p.type==='topic'?13:12)/k+'px';t.setAttribute('y',p.r+16/k);t.querySelectorAll('tspan').forEach((span,i)=>span.setAttribute('dy',i?16/k:0));g.classList.remove('label-visible');if(id!==state.selected&&p.type!=='topic'&&k<1.3)continue;
 g.classList.add('label-visible');const r=t.getBoundingClientRect();if(id!==state.selected&&occupied.some(a=>r.left<a.right+8&&r.right>a.left-8&&r.top<a.bottom+6&&r.bottom>a.top-6))g.classList.remove('label-visible');else occupied.push(r);
 }
}
function zoom(factor,cx=$('#graph-host').clientWidth/2,cy=$('#graph-host').clientHeight/2){const c=state.camera,k=Math.max(.08,Math.min(5,c.k*factor)),ratio=k/c.k;state.camera={x:cx-(cx-c.x)*ratio,y:cy-(cy-c.y)*ratio,k};applyCamera();}
$('#graph').addEventListener('pointerdown',e=>{
 if(e.button!==0||dragging)return;const node=positions.get(e.target.closest('.graph-node')?.dataset.id);
 dragging={pointerId:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,node};dragMoved=false;
 (e.target.closest('.graph-node')||$('#graph')).setPointerCapture(e.pointerId);
});
$('#graph').addEventListener('pointermove',e=>{
 if(!dragging||e.pointerId!==dragging.pointerId)return;
 if(Math.hypot(e.clientX-dragging.startX,e.clientY-dragging.startY)>4)dragMoved=true;
 if(!dragMoved)return;
 const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;
 if(dragging.node){dragging.node.x+=dx/state.camera.k;dragging.node.y+=dy/state.camera.k;paintPositions();runSimulation();}
 else{state.camera.x+=dx;state.camera.y+=dy;applyCamera();}
 dragging.x=e.clientX;dragging.y=e.clientY;
});
function endDrag(e){if(!dragging||e.pointerId!==dragging.pointerId)return;const movedNode=dragMoved&&dragging.node;dragging=null;if(movedNode)runSimulation();}
$('#graph').addEventListener('pointerup',endDrag);$('#graph').addEventListener('pointercancel',endDrag);$('#graph').addEventListener('lostpointercapture',endDrag);
$('#graph').addEventListener('wheel',e=>{e.preventDefault();const rect=$('#graph').getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),e.clientX-rect.left,e.clientY-rect.top);},{passive:false});
$('#zoom-in').onclick=()=>zoom(1.25);$('#zoom-out').onclick=()=>zoom(.8);$('#fit').onclick=fit;
$('#toggle-links').onclick=()=>{if(!graph)return;state.showLinks=!state.showLinks;$('#toggle-links').setAttribute('aria-pressed',String(state.showLinks));updateHighlight();};
$('#map-back').onclick=()=>{state.topic=null;state.query='';$('#search').value='';render();};
$('#search').addEventListener('input',e=>{if(!graph)return;state.query=e.target.value;render();});
$('#reset-filters').onclick=()=>{if(!graph)return;state.topic=null;state.query='';$('#search').value='';render();};
window.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();}});
window.addEventListener('hashchange',()=>{if(knowledgeMap){const id=hashId();select(knowledgeMap.has(id)?id:(knowledgeMap.has('F06')?'F06':knowledge[0]?.id),{reveal:true,history:!knowledgeMap.has(id),scroll:false});}});
let resizeTimer;new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(graph){fit();}},120);}).observe($('#graph-host'));
load();
