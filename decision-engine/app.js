const $=id=>document.getElementById(id);
let customers=[];let parsed={};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function seed(i){const x=Math.sin(i*12.9898+78.233)*43758.5453;return x-Math.floor(x)}
function normal(i){let u=Math.max(seed(i),1e-9),v=Math.max(seed(i+991),1e-9);return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function money(x){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(x)}
function num(x){return new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(x)}
function percent(x){return (x*100).toFixed(1)+"%"}
function extract(text){
 const raw=text.trim();
 const t=raw.toLowerCase().replace(/,/g,"");
 const numberAfter=(patterns)=>{
   for(const re of patterns){const m=t.match(re);if(m)return {value:Number(m[1]),unit:m[2]||""};}
   return null;
 };
 const scale=(x)=>x.unit&&/^k|thousand$/.test(x.unit)?x.value*1000:x.unit&&/^m|million$/.test(x.unit)?x.value*1000000:x.value;
 const currency=(patterns)=>{
   for(const re of patterns){const m=t.match(re);if(m)return Number(m[1]);}
   return null;
 };
 const populationRaw=numberAfter([
   /(?:have|serve|reach|manage|population of|base of|base has|customer base has|customers|users|cases)[^0-9]{0,35}(\d+(?:\.\d+)?)\s*(k|thousand|m|million)?/,
   /(\d+(?:\.\d+)?)\s*(k|thousand|m|million)?\s*(?:customers|users|cases)/
 ]);
 const cost=currency([
   /(?:costs?|costing|price(?:s)?|spend(?:ing)?)[^$₹€£0-9]{0,20}[$₹€£]?\s*(\d+(?:\.\d+)?)/,
   /[$₹€£]\s*(\d+(?:\.\d+)?)[^a-z]{0,12}(?:offer|voucher|incentive|intervention)/
 ]);
 const value=currency([
   /(?:worth|value(?:d)?|saves?|revenue|margin|profit)[^$₹€£0-9]{0,25}[$₹€£]?\s*(\d+(?:\.\d+)?)/,
   /[$₹€£]\s*(\d+(?:\.\d+)?)[^a-z]{0,15}(?:per|each|incremental)\s*(?:customer|order|conversion|save|case)/
 ]);
 const budgetRaw=numberAfter([
   /(?:budget|available budget|can spend|have to spend)[^0-9]{0,20}[$₹€£]?\s*(\d+(?:\.\d+)?)\s*(k|thousand|m|million)?/,
   /[$₹€£]\s*(\d+(?:\.\d+)?)\s*(k|thousand|m|million)?\s*(?:budget|available)/
 ]);
 const cap=numberAfter([
   /(?:at most|max(?:imum)?|capacity|reach|contact|target)[^0-9]{0,25}(\d+(?:\.\d+)?)\s*%/,
   /(\d+(?:\.\d+)?)\s*%\s*(?:of|customers|users|cases)/
 ]);
 const scenario=/support|case|agent|automation/.test(t)?"support":/retention|churn|save|retain/.test(t)?"retention":/voucher|incentive|offer|order/.test(t)?"voucher":"custom";
 const objective=/roi|return/.test(t)?"roi":/revenue|value|margin|profit/.test(t)?"value":/conversion|order|save|retain/.test(t)?"incremental":"value";
 return {
   scenario,objective,
   population:populationRaw?scale(populationRaw):null,
   cost,value,
   budget:budgetRaw?scale(budgetRaw):null,
   capacity:cap?cap.value:null,
   _has:raw.length>5,
   _raw:raw
 };
}
function renderExtraction(){
 const fields=[["Population",parsed.population?num(parsed.population):null],["Intervention cost",parsed.cost!=null?money(parsed.cost):null],["Outcome value",parsed.value!=null?money(parsed.value):null],["Budget",parsed.budget!=null?money(parsed.budget):null],["Capacity",parsed.capacity!=null?parsed.capacity+"%":null],["Scenario",parsed.scenario==="custom"?"Needs classification":parsed.scenario]];
 const missing=fields.filter(x=>x[1]==null);
 $("extractionStatus").innerHTML=parsed._has?'<span class="status-good">Brief parsed. Review the assumptions below.</span>':'<span class="status-warn">Waiting for a business brief…</span>';
 $("extracted").innerHTML=parsed._has?fields.map(x=>'<div class="extract-row"><b>'+x[0]+'</b><strong>'+ (x[1]??"Missing") +'</strong></div>').join(""):"";
 $("missing").innerHTML=fields.map(x=>'<div class="required '+(x[1]==null?"missing":"")+'"><b>'+x[0]+'</b><span>'+(x[1]==null?"Need this to calculate the policy":"Extracted from your brief")+'</span></div>').join("");
 $("questions").innerHTML=parsed._has&&missing.length?'<div class="question"><b>Before I can calculate:</b> Please provide '+missing.map(x=>x[0].toLowerCase()).join(", ")+' in the controls below or add it to the brief.</div>':"";
}
function buildCustomers(){
 customers=[];
 for(let i=0;i<1400;i++){
  const propensity=clamp(.05+.30*(.5+.5*Math.sin(i/37))+normal(i)*.055,.01,.65);
  const uplift=clamp(.01+.09*(.5+.5*Math.sin(i/19+1.4))-.025*propensity+normal(i+41)*.012,-.05,.16);
  const value=20+70*(.5+.5*Math.sin(i/53))+normal(i+10)*7;
  customers.push({id:"C-"+String(i+1).padStart(5,"0"),propensity,uplift,value});
 }
}
function evaluate(){
 const pop=Number($("population").value)||100000,cost=Number($("cost").value)||0,value=Number($("value").value)||0,budget=Number($("budget").value)||0,cap=(Number($("capacity").value)||100)/100,threshold=Number($("threshold").value)/100,quality=Number($("quality").value)/100;
 const noise=(1-quality)*.12;
 const scored=customers.map((c,i)=>({...c,score:clamp(c.propensity+normal(i+88)*noise,.001,.8)}));
 let candidates=scored.filter(c=>c.score>=threshold).map(c=>({...c,net:c.uplift*value-cost})).sort((a,b)=>b.net-a.net);
 const maxByCap=Math.floor(scored.length*cap),maxByBudget=cost>0?Math.floor(budget/cost/(pop/scored.length)):maxByCap;
 const max=Math.max(0,Math.min(maxByCap,maxByBudget));
 candidates=candidates.slice(0,max);
 const scale=pop/scored.length;
 const inc=candidates.reduce((a,c)=>a+c.uplift,0)*scale;
 const gross=inc*value,spend=candidates.length*scale*cost,net=gross-spend;
 return {scored,candidates,inc,gross,spend,net,roi:spend?net/spend:0,scale};
}
function renderScatter(r){
 const el=$("scatter");el.innerHTML='<span class="axis axis-x">Likelihood →</span><span class="axis axis-y">Incremental effect ↑</span>';
 r.scored.forEach((c,i)=>{const p=document.createElement("i");p.className="point"+(r.candidates.some(x=>x.id===c.id)?" target":"");p.style.left=(c.score/.8*95+2)+"%";p.style.bottom=(clamp((c.uplift+.05)/.21,0,1)*91+4)+"%";el.appendChild(p)});
}
function renderSensitivity(){
 const base=Number($("cost").value),value=Number($("value").value),pop=Number($("population").value),budget=Number($("budget").value),cap=Number($("capacity").value),threshold=Number($("threshold").value),quality=Number($("quality").value);
 const vals=[.5,.75,1,1.25,1.5,1.75,2].map(x=>base*x);
 const old=Number($("cost").value);
 const out=vals.map(v=>{ $("cost").value=v; const r=evaluate(); return {v,net:r.net}}); $("cost").value=old;
 const max=Math.max(...out.map(x=>Math.abs(x.net)),1);
 $("sensitivity").innerHTML=out.map(x=>'<div class="sens-col" title="Cost '+money(x.v)+'"><div class="sens-bar" style="height:'+Math.max(2,Math.abs(x.net)/max*88)+'%"></div><div class="sens-label">'+money(x.v).replace(".00","")+'</div></div>').join("");
}
function renderComparison(r){
 const pop=Number($("population").value),cost=Number($("cost").value),value=Number($("value").value),budget=Number($("budget").value),cap=Number($("capacity").value),quality=Number($("quality").value);
 const policies=[["Target everyone",0],["Propensity",.35],["Uplift",null],["Economic policy",null]];
 const rows=policies.map(([name,cut],idx)=>{
  let selected;
  if(idx===0) selected=r.scored.map(c=>({...c,net:c.uplift*value-cost})).sort((a,b)=>b.net-a.net).slice(0,Math.min(Math.floor(r.scored.length*cap),cost?Math.floor(budget/cost/(pop/r.scored.length)):999999));
  else if(idx===1) selected=r.scored.sort((a,b)=>b.score-a.score).slice(0,Math.min(Math.floor(r.scored.length*cap),cost?Math.floor(budget/cost/(pop/r.scored.length)):999999));
  else if(idx===2) selected=r.scored.sort((a,b)=>b.uplift-a.uplift).slice(0,Math.min(Math.floor(r.scored.length*cap),cost?Math.floor(budget/cost/(pop/r.scored.length)):999999));
  else selected=r.candidates;
  const inc=selected.reduce((a,c)=>a+c.uplift,0)*(pop/r.scored.length),gross=inc*value,sp=selected.length*(pop/r.scored.length)*cost,net=gross-sp;
  return '<tr><td><b>'+name+'</b></td><td>'+num(selected.length*(pop/r.scored.length))+'</td><td>'+num(inc)+'</td><td>'+money(gross)+'</td><td>'+money(sp)+'</td><td>'+money(net)+'</td><td>'+percent(sp?net/sp:0)+'</td></tr>';
 });
 $("comparison").innerHTML='<table><thead><tr><th>Policy</th><th>Targeted</th><th>Incremental</th><th>Value</th><th>Spend</th><th>Net value</th><th>ROI</th></tr></thead><tbody>'+rows.join("")+'</tbody></table>';
}
function renderCustomers(r){
 const filter=$("segment").value;
 let rows=r.scored.filter(c=>filter==="all"||filter==="high"&&c.score>.45||filter==="incremental"&&c.uplift>.06||filter==="economic"&&(c.uplift*Number($("value").value)-Number($("cost").value)>0)).slice(0,18);
 $("customersTable").innerHTML='<table><thead><tr><th>Customer</th><th>Likelihood</th><th>Incremental effect</th><th>Outcome value</th><th>Expected net value</th><th>Action</th></tr></thead><tbody>'+rows.map(c=>{const net=c.uplift*Number($("value").value)-Number($("cost").value);return '<tr><td>'+c.id+'</td><td>'+percent(c.score)+'</td><td>'+percent(c.uplift)+'</td><td>'+money(c.value)+'</td><td>'+money(net)+'</td><td><b>'+(r.candidates.some(x=>x.id===c.id)?"INTERVENE":"HOLD")+'</b></td></tr>'}).join("")+'</tbody></table>';
}
function recalc(){
 $("thresholdOut").textContent=$("threshold").value;$("qualityOut").textContent=$("quality").value+"%";
 const r=evaluate(),positive=r.net>0;
 $("targeted").textContent=num(r.candidates.length*r.scale);$("incremental").textContent=num(r.inc);$("gross").textContent=money(r.gross);$("spend").textContent=money(r.spend);$("net").textContent=money(r.net);
 $("policy").textContent=positive?"TARGET BY EXPECTED ECONOMIC VALUE":"DO NOT INTERVENE";
 $("badge").textContent=positive?"POSITIVE POLICY VALUE":"NEGATIVE POLICY VALUE";
 $("policyReason").textContent=positive?"Ranks eligible customers by expected incremental value after intervention cost, then applies budget and capacity constraints.":"Under these economics, the intervention destroys expected value at the selected policy. Change cost, value or targeting assumptions to test the break-even point.";
 $("economics").textContent="ROI "+percent(r.roi)+" · Budget used "+money(r.spend)+" / "+money(Number($("budget").value))+" · Capacity "+percent(r.candidates.length/r.scored.length)+" of population.";
 renderScatter(r);renderSensitivity();renderComparison(r);renderCustomers(r);
}
function applyParsed(){
 if(!parsed._has)return;
 if(parsed.population)$("population").value=parsed.population;
 if(parsed.cost!=null)$("cost").value=parsed.cost;
 if(parsed.value!=null)$("value").value=parsed.value;
 if(parsed.budget!=null)$("budget").value=parsed.budget;
 if(parsed.capacity!=null)$("capacity").value=parsed.capacity;
 if(parsed.scenario!=="custom")$("scenario").value=parsed.scenario;
 recalc();renderExtraction();
}
$("briefInput").addEventListener("input",e=>{parsed=extract(e.target.value);parsed._has=e.target.value.trim().length>10;renderExtraction()});
document.querySelectorAll("[data-example]").forEach(b=>b.onclick=()=>{$("briefInput").value=b.dataset.example;parsed=extract(b.dataset.example);parsed._has=true;renderExtraction();applyParsed()});
$("applyBrief").onclick=applyParsed;$("recalculate").onclick=recalc;$("reset").onclick=()=>{ $("briefInput").value="";parsed={};$("population").value=100000;$("cost").value=4;$("value").value=60;$("budget").value=150000;$("capacity").value=30;$("threshold").value=45;$("quality").value=82;renderExtraction();recalc()};
["threshold","quality"].forEach(id=>$(id).addEventListener("input",recalc));
["population","cost","value","budget","capacity"].forEach(id=>$(id).addEventListener("change",recalc));
$("segment").addEventListener("change",recalc);
buildCustomers();renderExtraction();recalc();