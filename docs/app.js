const $ = selector => document.querySelector(selector);
const NS = 'http://www.w3.org/2000/svg';
const state = {topic:null,query:'',selected:null,showLinks:false,visible:[],camera:{x:0,y:0,k:1}};
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
 if(reveal){state.topic=null;state.query='';$('#search').value='';render();}else{updateHighlight();showDetail();document.querySelectorAll('#node-list button').forEach(b=>b.classList.toggle('selected',b.dataset.id===id));}
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
function layout(){
 const host=$('#graph-host'),w=host.clientWidth,h=host.clientHeight;
 const activeTopics=topics.filter(t=>state.visible.some(n=>n.topicId===t.id));
 // Deterministic positions keep the same data reproducible; no remote layout service.
 const largest=Math.max(0,...activeTopics.map(t=>state.visible.filter(n=>n.topicId===t.id).length));
 const expanded=activeTopics.length===1&&largest>24;
 const gridCols=Math.ceil(Math.sqrt(largest));
 const W=Math.max(w,800,expanded?gridCols*160+100:0),H=Math.max(h,660,expanded?Math.ceil(largest/gridCols)*85+170:0),nodes=[];
 activeTopics.forEach((t,i)=>{
  const cols=activeTopics.length<=2?activeTopics.length:2;
  const rows=Math.ceil(activeTopics.length/cols);
  const tx=W*(.23+(i%cols)*.53),ty=H*((Math.floor(i/cols)+.5)/rows);
  nodes.push({id:t.id,type:'topic',x:tx,y:ty,ax:tx,ay:ty});
  const members=state.visible.filter(n=>n.topicId===t.id);
  // Large collections open from their topic hub instead of crowding the overview.
  if(members.length>24&&activeTopics.length>1)return;
  if(expanded){
   Object.assign(nodes[nodes.length-1],{x:W/2,y:55,ax:W/2,ay:55});
   members.forEach((n,j)=>{const x=100+(j%gridCols)*160,y=145+Math.floor(j/gridCols)*85;nodes.push({id:n.id,type:'knowledge',x,y,ax:x,ay:y});});
   return;
  }
  members.forEach((n,j)=>{const angle=j*2*Math.PI/members.length+.45;const radius=members.length>8?135:105;nodes.push({id:n.id,type:'knowledge',x:tx+Math.cos(angle)*radius,y:ty+Math.sin(angle)*radius,ax:tx+Math.cos(angle)*radius,ay:ty+Math.sin(angle)*radius});});
 });
 for(let iteration=0;iteration<200;iteration++){
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
   const a=nodes[i],b=nodes[j];let dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)<135&&Math.abs(dy)<56){if(!dx)dx=.1;if(!dy)dy=.1;const pushX=135-Math.abs(dx),pushY=56-Math.abs(dy);if(pushX<pushY*1.8){const p=Math.sign(dx)*pushX*.2;a.x-=p;b.x+=p;}else{const p=Math.sign(dy)*pushY*.23;a.y-=p;b.y+=p;}}
  }
  for(const n of nodes){const pull=n.type==='topic'?.06:.012;n.x+=(n.ax-n.x)*pull;n.y+=(n.ay-n.y)*pull;n.x=Math.max(78,Math.min(W-78,n.x));n.y=Math.max(38,Math.min(H-62,n.y));}
 }
 positions=new Map(nodes.map(n=>[n.id,n]));state.world={width:W,height:H};fit();$('#graph').dataset.layoutWidth=String(w);
}
function fit(){
 const host=$('#graph-host');if(!state.world)return;
 const k=Math.min(host.clientWidth/state.world.width,host.clientHeight/state.world.height)*.94;
 state.camera={x:(host.clientWidth-state.world.width*k)/2,y:(host.clientHeight-state.world.height*k)/2,k};applyCamera();
}
function draw(){
 const edgeGroup=$('#edges'),nodeGroup=$('#nodes');edgeGroup.replaceChildren();nodeGroup.replaceChildren();
 const links=graph.edges.filter(e=>positions.has(e.source)&&positions.has(e.target)&&(e.type==='topic'||state.showLinks||e.source===state.selected||e.target===state.selected));
 for(const e of links){const a=positions.get(e.source),b=positions.get(e.target);const line=svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:`graph-edge ${e.type==='topic'?'':'related'}`,'data-source':e.source,'data-target':e.target});line.append(svg('title',{}));line.firstChild.textContent=`${e.label} (${e.basis.join(', ')})`;edgeGroup.append(line);}
 for(const p of positions.values()){
  const n=p.type==='topic'?topics.find(t=>t.id===p.id):knowledgeMap.get(p.id);const r=p.type==='topic'?11:6;
  const g=svg('g',{class:`graph-node ${p.type}`,transform:`translate(${p.x},${p.y})`,tabindex:'0',role:'button','aria-label':p.type==='topic'?`${n.label} 주제 선택`:`${n.title}, ${n.status}`,'data-id':p.id});
  const color=p.type==='topic'?n.color:colors[n.category];
  g.append(svg('circle',{r:22,fill:'transparent'}),svg('circle',{r:r+7,class:'node-ring'}),svg('circle',{r,fill:color,stroke:color,'stroke-width':1,'fill-opacity':p.type==='topic'?.16:.9}));
  if(p.type==='topic')g.append(svg('circle',{r:3,fill:color}));
  const text=svg('text',{y:r+20});
  const hiddenMembers=p.type==='topic'?state.visible.filter(k=>k.topicId===n.id&&!positions.has(k.id)).length:0;
  text.textContent=p.type==='topic'?`${n.label}${hiddenMembers?` · ${hiddenMembers}개 펼치기`:''}`:n.title.replace(/ · 2010 명단$/,'');g.append(text);
  const title=svg('title',{});title.textContent=p.type==='topic'?n.label:`${n.id} · ${n.claim} [${n.status}]`;g.append(title);
  const activate=()=>{if(p.type==='topic'){state.topic=state.topic===n.id?null:n.id;render();}else select(n.id);};
  g.addEventListener('click',()=>{if(!dragMoved)activate();});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});nodeGroup.append(g);
 }
 updateHighlight();applyCamera();
}
function updateHighlight(){
 document.querySelectorAll('.graph-node').forEach(g=>{g.classList.toggle('selected',g.dataset.id===state.selected);g.setAttribute('aria-pressed',String(g.dataset.id===state.selected));});
 document.querySelectorAll('.graph-edge').forEach(e=>e.classList.toggle('highlight',e.dataset.source===state.selected||e.dataset.target===state.selected));
 // Rebuild visible relationship edges when selection changes, without moving the map.
 const group=$('#edges');group.querySelectorAll('.related').forEach(e=>e.remove());
 for(const e of graph.edges.filter(e=>e.type!=='topic'&&positions.has(e.source)&&positions.has(e.target)&&(state.showLinks||e.source===state.selected||e.target===state.selected))){const a=positions.get(e.source),b=positions.get(e.target);const line=svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:`graph-edge related ${e.source===state.selected||e.target===state.selected?'highlight':''}`});const title=svg('title',{});title.textContent=`${e.label}: ${e.basis.join(', ')}`;line.append(title);group.append(line);}
}
function applyCamera(){const c=state.camera;$('#viewport').setAttribute('transform',`translate(${c.x},${c.y}) scale(${c.k})`);$('#graph').classList.toggle('overview',innerWidth<=600&&c.k<.75);document.querySelectorAll('.graph-node text').forEach(t=>t.style.fontSize=`${(t.parentElement.classList.contains('topic')?14:12)/c.k}px`);}
function zoom(factor,cx=$('#graph-host').clientWidth/2,cy=$('#graph-host').clientHeight/2){const c=state.camera,k=Math.max(.25,Math.min(3.5,c.k*factor));const ratio=k/c.k;state.camera={x:cx-(cx-c.x)*ratio,y:cy-(cy-c.y)*ratio,k};applyCamera();}
let dragging=null,dragMoved=false;
$('#graph').addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};dragMoved=false;});
window.addEventListener('pointermove',e=>{if(!dragging)return;if(Math.hypot(e.clientX-dragging.startX,e.clientY-dragging.startY)>4)dragMoved=true;state.camera.x+=e.clientX-dragging.x;state.camera.y+=e.clientY-dragging.y;dragging.x=e.clientX;dragging.y=e.clientY;applyCamera();});
window.addEventListener('pointerup',()=>{dragging=null;});window.addEventListener('pointercancel',()=>{dragging=null;dragMoved=false;});
$('#graph').addEventListener('wheel',e=>{e.preventDefault();const rect=$('#graph').getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),e.clientX-rect.left,e.clientY-rect.top);},{passive:false});
$('#zoom-in').onclick=()=>zoom(1.25);$('#zoom-out').onclick=()=>zoom(.8);$('#fit').onclick=fit;
$('#toggle-links').onclick=()=>{if(!graph)return;state.showLinks=!state.showLinks;$('#toggle-links').setAttribute('aria-pressed',String(state.showLinks));updateHighlight();};
$('#search').addEventListener('input',e=>{if(!graph)return;state.query=e.target.value;render();});
$('#reset-filters').onclick=()=>{if(!graph)return;state.topic=null;state.query='';$('#search').value='';render();};
window.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();}});
window.addEventListener('hashchange',()=>{if(knowledgeMap){const id=hashId();select(knowledgeMap.has(id)?id:(knowledgeMap.has('F06')?'F06':knowledge[0]?.id),{reveal:true,history:!knowledgeMap.has(id),scroll:false});}});
let resizeTimer;new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(graph){layout();draw();}},120);}).observe($('#graph-host'));
load();
