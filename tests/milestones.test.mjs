import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const RealDate=Date, instant=new RealDate(2026,9,21,12).getTime();
globalThis.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[instant]));} static now(){return instant;}};
const KEY='hello-someday.settings.v1', SEEN='hello-someday.celebrations.v1';
const base={version:1,name:'Milestone test',retirementDate:'2026-10-21',dateMeaning:'last-workday',includeToday:true,weekdays:[1,2,3,4,5],daysOff:[],startedOn:'2026-10-01'};
let run=0;
async function app({settings=null,seen={},reduced=false,hidden=false}={}){
  const dom=new JSDOM(html,{url:'https://test.invalid/',pretendToBeVisual:true}),w=dom.window;
  for(const name of ['window','document','localStorage','location','navigator'])Object.defineProperty(globalThis,name,{value:name==='window'?w:w[name],configurable:true});
  let invisible=hidden;
  Object.defineProperty(w.document,'hidden',{get:()=>invisible,configurable:true});
  Object.defineProperty(w.document,'visibilityState',{get:()=>invisible?'hidden':'visible',configurable:true});
  if(settings)w.localStorage.setItem(KEY,JSON.stringify(settings));w.localStorage.setItem(SEEN,JSON.stringify(seen));
  const pending=new Map();let id=0,now=0;
  globalThis.setInterval=()=>0;globalThis.setTimeout=(fn,ms=0)=>{pending.set(++id,{fn,at:now+ms});return id;};globalThis.clearTimeout=id=>pending.delete(id);
  globalThis.matchMedia=()=>({matches:reduced,addEventListener(){}});globalThis.confirm=()=>true;
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
  const $=s=>w.document.querySelector(s),click=s=>$(s).click(),submit=s=>$(s).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  async function advance(ms=1000){await Promise.resolve();const until=now+ms;let guard=0;while(true){const next=[...pending].filter(([,t])=>t.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;if(++guard>100)throw new Error('Timer loop');pending.delete(next[0]);now=next[1].at;next[1].fn();await Promise.resolve();}now=until;await Promise.resolve();}
  await import(`../dist/app.js?milestones=${++run}`);
  return{w,$,click,submit,advance,storage:()=>Object.fromEntries(Object.entries(w.localStorage)),seen:()=>JSON.parse(w.localStorage.getItem(SEEN)||'{}'),visible(){invisible=false;w.document.dispatchEvent(new w.Event('visibilitychange'));}};
}
test('last-day onboarding automatically opens a celebration without preview',async()=>{const h=await app();h.click('#start-button');h.$('#retirement-date').value='2026-10-21';h.$('#date-meaning').value='last-workday';h.submit('#settings-form');await h.advance();assert.equal(h.$('#days-number').textContent,'1');assert.equal(h.$('#celebration-dialog').open,true);assert.equal(h.$('#celebration-title').textContent,'Your last working day!');assert.equal(h.w.document.querySelectorAll('.confetto').length,170);});
test('editing a future retirement to today triggers the last-day celebration',async()=>{const h=await app({settings:{...base,retirementDate:'2027-01-01'}});await h.advance();h.click('#settings-button');h.$('#retirement-date').value='2026-10-21';h.submit('#settings-form');await h.advance();assert.equal(h.$('#celebration-dialog').open,true);});
test('a milestone blocked by an open settings dialog is retried after close',async()=>{const h=await app();h.click('#start-button');h.$('#retirement-date').value='2026-10-21';h.$('#date-meaning').value='last-workday';h.submit('#settings-form');h.click('#settings-button');await h.advance();assert.equal(h.$('#celebration-dialog').open,false);assert.equal(Object.keys(h.seen()).length,0);h.$('#settings-dialog').close();await h.advance();assert.equal(h.$('#celebration-dialog').open,true);});
test('a background-tab milestone waits until the app is visible',async()=>{const h=await app({settings:base,hidden:true});await h.advance();assert.equal(h.$('#celebration-dialog').open,false);assert.equal(Object.keys(h.seen()).length,0);h.visible();await h.advance();assert.equal(h.$('#celebration-dialog').open,true);});
test('a recorded milestone stays once-only across closing, visibility, and reload',async()=>{const h=await app({settings:base});await h.advance();assert.equal(h.$('#celebration-dialog').open,true);h.$('#celebration-dialog').close();await h.advance();h.visible();await h.advance();assert.equal(h.$('#celebration-dialog').open,false);assert.equal(h.seen()['2026-10-21|last-workday|last-day'],true);const r=await app({settings:base,seen:h.seen()});await r.advance();assert.equal(r.$('#celebration-dialog').open,false);});
test('preview does not consume a pending automatic milestone',async()=>{const h=await app({settings:base,hidden:true});h.click('#preview-button');await h.advance();assert.equal(Object.keys(h.seen()).length,0);h.$('#celebration-dialog').close();h.visible();await h.advance();assert.equal(h.$('#celebration-title').textContent,'Your last working day!');assert.equal(h.seen()['2026-10-21|last-workday|last-day'],true);});
test('reduced motion still shows and records an automatic last-day message',async()=>{const h=await app({settings:base,reduced:true});await h.advance();assert.equal(h.$('#celebration-dialog').open,true);assert.equal(h.w.document.querySelectorAll('.confetto').length,0);assert.equal(h.seen()['2026-10-21|last-workday|last-day'],true);});
test('month, week and workday milestones trigger automatically',async()=>{for(const [date,key] of [['2026-11-21','one-month'],['2026-10-28','one-week'],['2026-11-04','work-10']]){const s={...base,retirementDate:date,dateMeaning:'first-retired'},h=await app({settings:s});await h.advance();assert.equal(h.$('#celebration-dialog').open,true,key);assert.equal(h.seen()[`${date}|first-retired|${key}`],true,key);}});
test('an already-seen last-day key does not suppress a different milestone',async()=>{const h=await app({settings:{...base,dateMeaning:'first-retired'},seen:{'2026-10-21|last-workday|last-day':true}});await h.advance();assert.equal(h.$('#celebration-dialog').open,true);assert.equal(h.seen()['2026-10-21|first-retired|retired'],true);});
test('reported QA sequence still permits automatic final-day and retirement celebrations after preview',async()=>{
  let h=await app();h.click('#start-button');h.$('#person-name').value='QA Test';h.$('#retirement-date').value='2026-10-30';h.submit('#settings-form');await h.advance();
  async function dismiss(){if(h.$('#celebration-dialog').open)h.$('#celebration-dialog').close();await h.advance();}
  async function addOff(type,start,end){h.click('[data-view="timeoff"]');h.click('#add-timeoff');h.$('#off-type').value=type;h.$('#off-start').value=start;h.$('#off-end').value=end;h.submit('#timeoff-form');await h.advance();await dismiss();}
  await addOff('holiday','2026-10-22','2026-10-22');await addOff('pto','2026-10-22','2026-10-25');
  h=await app({settings:JSON.parse(h.storage()[KEY]),seen:h.seen()});await h.advance();await dismiss();
  h.click('#settings-button');h.$('#date-meaning').value='last-workday';h.submit('#settings-form');await h.advance();await dismiss();
  const beforePreview=JSON.stringify(h.seen());h.click('#preview-button');await h.advance();await dismiss();assert.equal(JSON.stringify(h.seen()),beforePreview);
  h.click('[data-view="timeoff"]');const pto=JSON.parse(h.storage()[KEY]).daysOff.find(x=>x.type==='pto');h.click(`[data-edit="${pto.id}"]`);h.$('#off-end').value='2026-10-26';h.submit('#timeoff-form');await h.advance();await dismiss();
  h.click('#settings-button');h.$('#retirement-date').value='2026-10-21';h.submit('#settings-form');await h.advance(0);
  assert.equal(h.$('#celebration-dialog').open,true);assert.equal(h.$('#celebration-title').textContent,'Your last working day!');assert.equal(h.$('#days-number').textContent,'1');await dismiss();
  h.click('#settings-button');h.$('#date-meaning').value='first-retired';h.submit('#settings-form');await h.advance(0);
  assert.equal(h.$('#celebration-dialog').open,true);assert.equal(h.$('#days-number').textContent,'0');assert.equal(h.seen()['2026-10-21|first-retired|retired'],true);
  const preserved=JSON.parse(h.storage()[KEY]);assert.equal(preserved.name,'QA Test');assert.equal(preserved.daysOff.length,2);assert.equal(preserved.daysOff.find(x=>x.type==='pto').end,'2026-10-26');
});
