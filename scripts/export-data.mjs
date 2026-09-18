import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/export-data.mjs <renew/사실확인 directory>');
const read = async name => JSON.parse((await readFile(path.join(source, name), 'utf8')).replace(/^\uFEFF/, ''));
const [input, sourceMap, postInput] = await Promise.all([read('검증항목.json'), read('출처목록.json'), read('게시글검토목록.json')]);
const supplement = JSON.parse(await readFile(path.join(root,'research','verified-supplement.json'),'utf8'));
for (const post of supplement.posts || []) {
 if (postInput.some(p=>p.id===post.id)) throw new Error(`Supplement post ID collision: ${post.id}`);
 postInput.push(post);
}
for (const claim of supplement.claims) {
 if (input.claims.some(c=>c.id===claim.id)) throw new Error(`Supplement claim ID collision: ${claim.id}`);
 input.claims.push(claim);
}
for (const [id, value] of Object.entries(supplement.sources)) {
 if (id in sourceMap) throw new Error(`Supplement source ID collision: ${id}`);
 sourceMap[id]=value;
}
input.checked_at=[input.checked_at,supplement.checked_at].sort().at(-1);
const colors = ['#9fa8ff', '#59dac9', '#edb46f', '#e797c3', '#83b9fa', '#c4d87b', '#b998eb'];
const confirmed = input.claims.filter(c => c.id.startsWith('F') && ['확인', '문헌상 확인'].includes(c.status));
const topics = [...new Set(confirmed.map(c => c.topic))].map((label, i) => ({ id: `topic-${i + 1}`, type: 'topic', label, color: colors[i % colors.length] }));
const shortTitles = {
 F01:'제네시스 미션',F02:'TAE 합병계약',F03:'USS Defiant',F04:'HELIOS 레이저',F05:'Starshield',F06:'핵융합과 플라즈마',F07:'AI와 전력 수요',F08:'달 현지 자원 활용',F09:'FLOAT 달 운송',F10:'워프스피드',F11:'줄기세포의 분류',F12:'Neuralink BCI',F13:'23andMe 정보 침해',F14:'STCU 탈퇴 지시',F15:'발포어 선언',F16:'함무라비 법전',F17:'미 육군 창설',F18:'성조기 채택',F19:'1946년 개기월식',F20:'두 복음서의 계보',
 F21:'TAE의 과거 이사 관계',F22:'희토류 무역 합의',F23:'MH370 수색 자료',F24:'헬름스의 1945년 편지',F25:'2026년 1월 G4 관측',F26:'2026년 1월 S4 관측',F27:'2026년 목성의 충',F28:'2026년 1월 겨울폭풍',F29:'NIF 핵융합 점화',F30:'우르남무 법전',F31:'함무라비의 처벌 규정',F32:'인간 배아 모델 연구',F33:'하딩의 라디오 연설',F34:'2007년 가자 정치 연표',F35:'금융그룹의 가족 소유',F36:'EMA의 백신 안전성 평가',
 F37:'부시 가족의 인물 구분',F38:'헤르초그의 가족 기록',F39:'록펠러의 부모 기록',F40:'히틀러 유해의 신원 연구'
};
const knowledge = confirmed.map(c => ({
 id:c.id, title:c.title || shortTitles[c.id] || c.claim, topicId:topics.find(t => t.label === c.topic).id,
 category:'verified',
 status:c.status, claim:c.claim, verification:c.fact, limitations:c.limit,
 sourceIds:c.sources, postIds:c.posts, checkedAt:c.checked_at,
 ...(c.members?{members:c.members}: {})
}));
const edges = knowledge.map(k => ({ id:`topic:${k.id}`, source:k.topicId, target:k.id, type:'topic', label:'같은 주제', basis:[k.topicId] }));
for (let i=0;i<knowledge.length;i++) for (let j=i+1;j<knowledge.length;j++) {
 const a=knowledge[i], b=knowledge[j];
 for (const [field,type,label] of [['sourceIds','shared_source','같은 검증 출처'],['postIds','shared_post','같은 수집 원문']]) {
  const basis=a[field].filter(id=>b[field].includes(id));
  if (basis.length) edges.push({id:`${type}:${a.id}:${b.id}`,source:a.id,target:b.id,type,label,basis});
 }
}
const metadata = {schemaVersion:'1.0.0',checkedAt:input.checked_at,scope:'확인 또는 문헌상 확인으로 판정한 항목만 공개합니다. 각 검증자료의 해석 한계는 유지합니다.',language:'ko',relationshipNotice:'연결은 주제·출처·원문 공유를 뜻하며, 인과관계나 주장 전체의 사실성을 뜻하지 않습니다.'};
const usedSources=new Set(knowledge.flatMap(k=>k.sourceIds)), usedPosts=new Set(knowledge.flatMap(k=>k.postIds)), publishedIds=new Set(knowledge.map(k=>k.id));
const sources = Object.entries(sourceMap).filter(([id])=>usedSources.has(id)).map(([id,s])=>({id,title:s[0],url:s[1],type:s[2],publishedAt:s[3]}));
const posts = postInput.filter(p=>usedPosts.has(p.id)).map(p=>({id:p.id,title:p.title,postedAt:p.posted_at,url:p.original_url,materialStatus:p.material_status,knowledgeIds:knowledge.filter(k=>k.postIds.includes(p.id)).map(k=>k.id)}));
const graph = {...metadata,nodes:[...topics,...knowledge.map(k=>({id:k.id,type:'knowledge',label:k.title,topicId:k.topicId,category:k.category,status:k.status}))],edges};
const out=path.join(root,'docs','data');
await mkdir(out,{recursive:true});
for (const [file,data] of Object.entries({'graph.json':graph,'knowledge.json':{...metadata,items:knowledge},'sources.json':{schemaVersion:'1.0.0',items:sources},'posts.json':{schemaVersion:'1.0.0',items:posts}})) {
 await writeFile(path.join(out,file),JSON.stringify(data,null,2)+'\n');
}
console.log(`Exported ${knowledge.length} knowledge nodes, ${topics.length} topics, ${edges.length} relationships, ${sources.length} sources, ${posts.length} posts.`);
