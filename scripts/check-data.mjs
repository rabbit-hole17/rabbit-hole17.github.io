import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../docs/data');
const read=async name=>JSON.parse(await readFile(path.join(root,`${name}.json`),'utf8'));
const [g,k,s,p]=await Promise.all(['graph','knowledge','sources','posts'].map(read));
for(const [name,items]of [['nodes',g.nodes],['edges',g.edges],['knowledge',k.items],['sources',s.items],['posts',p.items]])assert.equal(new Set(items.map(x=>x.id)).size,items.length,`${name}: duplicate id`);
const ids=new Set(g.nodes.map(n=>n.id)),sources=new Set(s.items.map(n=>n.id)),posts=new Set(p.items.map(n=>n.id));
for(const n of k.items){assert(ids.has(n.id));assert(ids.has(n.topicId));assert.equal(n.category,'verified','Unverified knowledge must not be published');assert(['확인','문헌상 확인'].includes(n.status));assert(n.claim&&n.verification&&n.limitations);n.sourceIds.forEach(id=>assert(sources.has(id)));n.postIds.forEach(id=>assert(posts.has(id)));assert(n.sourceIds.length>0);}
const byId=new Map(k.items.map(n=>[n.id,n]));
for(const n of g.nodes.filter(n=>n.type==='knowledge')){assert.equal(n.category,'verified');assert(byId.has(n.id));}
for(const post of p.items){assert(post.knowledgeIds.length>0);post.knowledgeIds.forEach(id=>assert(byId.has(id),'Post references unpublished knowledge'));}
assert(k.items.length>0,'Published knowledge must not be empty');
const usedSources=new Set(k.items.flatMap(n=>n.sourceIds)),usedPosts=new Set(k.items.flatMap(n=>n.postIds));
for(const post of p.items)assert.deepEqual(new Set(post.knowledgeIds),new Set(k.items.filter(n=>n.postIds.includes(post.id)).map(n=>n.id)),'Post and knowledge links must agree');
assert.equal(usedSources.size,s.items.length,'Only referenced sources should be published');
assert.equal(usedPosts.size,p.items.length,'Only referenced posts should be published');
for(const e of g.edges){assert(ids.has(e.source)&&ids.has(e.target));assert(e.source!==e.target);assert(e.basis.length);if(e.type==='topic')assert.equal(byId.get(e.target).topicId,e.source);else{const field=e.type==='shared_source'?'sourceIds':'postIds';for(const id of e.basis)assert(byId.get(e.source)[field].includes(id)&&byId.get(e.target)[field].includes(id));}}
for(const x of [...s.items,...p.items])assert.equal(new URL(x.url).protocol,'https:');
assert.equal(g.nodes.filter(n=>n.type==='knowledge').length,k.items.length);
assert(!JSON.stringify([g,k,s,p]).includes('D:\\'));
console.log(`PASS: ${k.items.length} knowledge records, ${g.edges.length} grounded edges, ${s.items.length} sources; no broken references or local paths.`);
