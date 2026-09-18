import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const expected=JSON.parse(await readFile(new URL('../docs/data/knowledge.json',import.meta.url),'utf8')).items;
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1512,height:982},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('.local',{recursive:true});
try{
 await page.goto('http://127.0.0.1:4173/renew/');
 await page.locator('.graph-node[data-id="F06"]').waitFor();
 assert.equal(await page.locator('#node-list button').count(),expected.length);
 if(expected.some(n=>n.id==='F123')){
  await page.locator('#search').fill('강선우');
  assert.equal(await page.locator('#node-list button').count(),2);
  await page.locator('#node-list button[data-id="F123"]').click();
  await page.locator('#detail summary').filter({hasText:'명단 100명'}).click();
  assert.equal(await page.locator('#detail details li').count(),100);
  await page.locator('#node-list button[data-id="F124"]').click();
  await page.locator('#detail summary').filter({hasText:'명단 102명'}).click();
  assert.equal(await page.locator('#detail details li').count(),102);
  assert.match(await page.locator('#detail').innerText(),/공식 회원대장 원본과 대조하지 못했다/);
  await page.locator('#reset-filters').click();
 }
 if(expected.some(n=>n.id==='F101')){
  await page.locator('#search').fill('MKULTRA');
  assert.equal(await page.locator('#node-list button').count(),6);
  await page.locator('#node-list button[data-id="F101"]').click();
  assert.match(await page.locator('#detail').innerText(),/1953년 4월 13일/);
  assert.match(await page.locator('#detail .source-card').getAttribute('href'),/intelligence.senate.gov/);
  await page.locator('#reset-filters').click();
 }
 if(expected.some(n=>n.id==='F41')){
  await page.locator('#search').fill('우리법연구회');
  assert.equal(await page.locator('#node-list button').count(),60);
  await page.locator('#node-list button[data-id="F41"]').click();
  assert.match(await page.locator('#detail').innerText(),/2010년/);
  assert.match(await page.locator('#detail').innerText(),/현재 회원/);
  assert.equal(await page.locator('#detail .source-card').count(),2);
  await page.screenshot({path:'.local/woorilaw.png',fullPage:true});
  await page.locator('#reset-filters').click();
 }
 await page.locator('.graph-node[data-id="F01"]').click();
 assert.match(await page.locator('#detail').innerText(),/제네시스 미션/);
 assert.equal(await page.locator('#detail .source-card').count(),1);
 assert.match(await page.locator('#detail .source-card').getAttribute('href'),/whitehouse.gov/);
 await page.screenshot({path:'.local/desktop.png',fullPage:true});
 assert.equal(await page.locator('[data-status]').count(),0);
 await page.locator('#search').fill('Neuralink');
 assert(await page.locator('#node-list button').count()>0);
 await page.locator('#node-list button[data-id="F12"]').click();
 assert.match(await page.locator('#detail').innerText(),/PRIME/);
 await page.locator('#search').fill('결과없음_9x9');
 assert.match(await page.locator('#message').innerText(),/표시할 지식이 없습니다/);
 await page.locator('#reset-filters').click();
 assert.equal(await page.locator('#node-list button').count(),expected.length);
 const before=await page.locator('#viewport').getAttribute('transform');
 await page.locator('#zoom-in').click();
 assert.notEqual(await page.locator('#viewport').getAttribute('transform'),before);
 await page.locator('#fit').click();
 await page.goto('http://127.0.0.1:4173/renew/#C16');
 await page.locator('#detail h2').filter({hasText:'핵융합과 플라즈마'}).waitFor();
 assert.equal(await page.locator('.graph-node[data-id="C16"]').count(),0);
 assert.match(page.url(),/#F06$/);
 await page.goto('http://127.0.0.1:4173/renew/#F13');
 await page.locator('#detail h2').filter({hasText:'23andMe'}).waitFor();
 assert.equal(await page.locator('#detail .source-card').count(),2);
 await page.locator('.graph-node[data-id="F01"]').focus();await page.keyboard.press('Enter');
 assert.match(await page.locator('#detail h2').innerText(),/제네시스/);
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:4173/renew/?mobile-check#F01');await page.locator('#detail h2').filter({hasText:'제네시스'}).waitFor();
 await page.waitForFunction(()=>document.querySelector('#graph').dataset.layoutWidth===String(document.querySelector('#graph-host').clientWidth));
 await page.screenshot({path:'.local/mobile.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('.graph-node[data-id="F06"]').click();
 assert.match(await page.locator('#detail h2').innerText(),/핵융합/);
 await page.route('**/data/graph.json',route=>route.fulfill({status:500,body:'error'}));
 await page.reload();await page.getByRole('button',{name:'다시 불러오기'}).waitFor();
 await page.unroute('**/data/graph.json');await page.getByRole('button',{name:'다시 불러오기'}).click();
 await page.locator('.graph-node[data-id="F06"]').waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: verified-only graph, excluded C16 deep link, source links, search/empty state, zoom, keyboard selection, mobile layout/click, fetch failure/retry.');
}finally{await browser.close();}
