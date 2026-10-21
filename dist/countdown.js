const DAY = 86400000;
export const MIN_DATE = '1900-01-01';
export const MAX_DATE = '2199-12-31';
export function ordinal(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < MIN_DATE || value > MAX_DATE) throw new Error('Choose a valid date between 1900 and 2199.');
  const [y,m,d] = value.split('-').map(Number);
  const t = Date.UTC(y,m-1,d);
  if (new Date(t).toISOString().slice(0,10) !== value) throw new Error('Choose a valid calendar date.');
  return t / DAY;
}
export function iso(day) { return new Date(day * DAY).toISOString().slice(0,10); }
export function localToday(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function weekday(day) { return ((day + 4) % 7 + 7) % 7; }
export function addDays(value,n) { return iso(ordinal(value)+n); }
export function formatDate(value,options = {}) { return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric',...options,timeZone:'UTC'}).format(new Date(value + 'T12:00:00Z')); }
export function normalize(settings) {
  if (!settings || typeof settings !== 'object') throw new Error('These countdown settings could not be read.');
  ordinal(settings.retirementDate);
  const weekdays = [...new Set((settings.weekdays || []).filter(x => Number.isInteger(x) && x >= 0 && x <= 6))].sort();
  if (!weekdays.length) throw new Error('Choose at least one working weekday.');
  const daysOff = (settings.daysOff || []).map((r,i) => {
    const start = ordinal(r.start), end = ordinal(r.end || r.start);
    if (end < start) throw new Error('The end of a time-off range must be on or after its start.');
    return {id:String(r.id || `day-${i}`),type:r.type === 'holiday' ? 'holiday' : 'pto',label:String(r.label || (r.type === 'holiday' ? 'Holiday' : 'Time off')).slice(0,80),start:iso(start),end:iso(end)};
  });
  return {version:1,name:String(settings.name || '').trim().slice(0,40),retirementDate:settings.retirementDate,dateMeaning:settings.dateMeaning === 'last-workday' ? 'last-workday' : 'first-retired',includeToday:settings.includeToday !== false,weekdays,daysOff,startedOn:settings.startedOn ? iso(ordinal(settings.startedOn)) : localToday()};
}
export function exclusions(settings) { return settings.daysOff.map(r=>({...r,from:ordinal(r.start),to:ordinal(r.end)})); }
export function dayKind(day, settings, ranges = exclusions(settings)) {
  if (!settings.weekdays.includes(weekday(day))) return 'weekend';
  const matches = ranges.filter(r => day >= r.from && day <= r.to);
  if (matches.some(r=>r.type==='holiday')) return 'holiday';
  if (matches.length) return 'pto';
  return 'work';
}
export function firstRetiredDay(settings) { return ordinal(settings.retirementDate) + (settings.dateMeaning === 'last-workday' ? 1 : 0); }
export function countBetween(from,to,settings) {
  const ranges = exclusions(settings), result = {work:0,weekend:0,holiday:0,pto:0};
  for (let d=from;d<to;d++) result[dayKind(d,settings,ranges)]++;
  return result;
}
export function calculate(raw,today = localToday()) {
  const s=normalize(raw), now=ordinal(today), end=firstRetiredDay(s), from=now+(s.includeToday?0:1);
  const counts=countBetween(from,Math.max(from,end),s);
  const totalStart=Math.min(ordinal(s.startedOn),from);
  const total=countBetween(totalStart,Math.max(totalStart,end),s).work;
  const ranges=exclusions(s);
  let last=end-1;
  while(last>=ordinal(MIN_DATE) && dayKind(last,s,ranges)!=='work') last--;
  const lastWorking=last>=ordinal(MIN_DATE)?iso(last):null;
  const status=now>=end?'retired':now===last?'last-day':now>last?'coasting':'counting';
  return {settings:s,today,end,firstRetired:iso(end),remaining:counts.work,counts,total,completed:Math.max(0,total-counts.work),percent:total?Math.max(0,Math.min(100,Math.round((total-counts.work)/total*100))):100,lastWorking,status,calendarDays:Math.max(0,end-now)};
}
export function monthBefore(day) {
  const d=new Date(day*DAY), year=d.getUTCFullYear(), month=d.getUTCMonth();
  const last=new Date(Date.UTC(year,month,0)).getUTCDate();
  return Date.UTC(year,month-1,Math.min(d.getUTCDate(),last))/DAY;
}
export function milestone(c) {
  if(c.status==='last-day') return {key:'last-day',title:'Your last working day!',message:'Look at you. You made it. Here’s to everything that comes next.',grand:true};
  if(c.status==='retired') return {key:'retired',title:'Hello, next chapter.',message:'Your time is officially yours. Let the wonderfully unhurried days begin.',grand:true};
  if(ordinal(c.today)===c.end-7) return {key:'one-week',title:'One week to go!',message:'One last little stretch. A whole new kind of Monday is waiting.'};
  if(ordinal(c.today)===monthBefore(c.end)) return {key:'one-month',title:'One month to go!',message:'That someday feeling? It’s getting very close.'};
  if([100,50,20,10,5].includes(c.remaining)) return {key:`work-${c.remaining}`,title:`${c.remaining} workdays to go!`,message:'A little less work. A little more possibility.'};
  return null;
}
