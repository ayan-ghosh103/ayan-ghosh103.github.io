const $=id=>document.getElementById(id);
let segments=[];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function seed(i){const x=Math.sin(i*12.9898)*43758.5453;return x-Math.floor(x)}
function normal(i){let u=Math.max(seed(i),1e-9),v=Math.max(seed(i+991),1e-9);return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function money(x){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(x)}
function num(x){return new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(x)}

function buildPopulation(){
 const n=1200; segments=[];
 for(let i=0;i<n;i++){
   const z=normal(i), propensity=clamp(.08+.055*z+.025*Math.sin(i/31),.01,.45);
   const uplift=clamp(.01+.055*(.5+.5*Math.sin(i/17))-.015*propensity+normal(i+17)*.012,-.04,.16);
   segments.push({propensity,uplift});
 }
}
function score(s,precision){
 const noise=Math.sqrt((100-precision)/100)*.075;
 return clamp(s.propensity+normal(Math.round(s.propensity*1e5)+Math.round(s.uplift*1e5)+33)*noise,.001,.6);
}
function evaluate(threshold,precision,capacity,cost,value){
 const scored=segments.map(s=>({...s,score:score(s,precision),net:s.uplift*value-cost}));
 const positive=scored.filter(s=>s.net>0).sort((a,b)=>b.net-a.net);
 const scoreCut=threshold/100;
 let candidates=scored.filter(s=>s.score>=scoreCut).sort((a,b)=>b.net-a.net);
 const max=Math.floor(scored.length*capacity/100);
 candidates=candidates.slice(0,max);
 const rate=candidates.length/scored.length;
 const scale=Number($("population").value)/scored.length;
 const inc=candidates.reduce((a,s)=>a+s.uplift,0)*scale;
 const gross=inc*value, spend=candidates.length*scale*cost, net=gross-spend;
 return {scored,candidates,rate,inc,gross,spend,net,roi:spend?net/spend:0,positiveShare:positive.length/scored.length};
}
function renderScatter(data){
 const el=$("scatter");el.innerHTML='<span class="axis-x">Propensity →</span><span class="axis-y">Incremental effect ↑</span>';
 data.scored.forEach((s,i)=>{const p=document.createElement("i");p.className="point";p.style.left=(s.score/.6*96+2)+"%";p.style.bottom=(clamp((s.uplift+.04)/.20,0,1)*92+3)+"%";el.appendChild(p)});
}
function renderBars(r){
 const max=Math.max(r.gross,r.spend,Math.abs(r.net),1);
 const rows=[["Incremental value",r.gross],["Intervention cost",r.spend],["Net value",r.net]];
 $("bars").innerHTML=rows.map(([label,v])=>'<div class="bar"><label>'+label+' · '+money(v)+'</label><div class="bar-track"><div class="bar-fill" style="width:'+clamp(Math.abs(v)/max*100,2,100)+'%"></div></div></div>').join("");
 $("economicsText").textContent='ROI '+(r.roi*100).toFixed(1)+'% · '+(r.rate*100).toFixed(1)+'% of the population targeted · '+(r.positiveShare*100).toFixed(1)+'% have positive simulated net value before capacity constraints.';
}
function renderComparison(precision,cost,value,capacity){
 const thresholds=[25,40,55,70,85];
 const rows=thresholds.map(t=>{const r=evaluate(t,precision,capacity,cost,value);return {t,r}});
 $("comparison").innerHTML='<table><thead><tr><th>Threshold</th><th>Targeted</th><th>Incremental conversions</th><th>Incremental value</th><th>Spend</th><th>Net value</th><th>ROI</th></tr></thead><tbody>'+
 rows.map(x=>'<tr><td>'+x.t+'</td><td>'+num(x.r.rate*Number($("population").value))+'</td><td>'+num(x.r.inc)+'</td><td>'+money(x.r.gross)+'</td><td>'+money(x.r.spend)+'</td><td>'+money(x.r.net)+'</td><td>'+(x.r.roi*100).toFixed(1)+'%</td></tr>').join("")+'</tbody></table>';
}
function recalc(){
 const threshold=Number($("threshold").value),precision=Number($("precision").value),capacity=Number($("capacity").value),cost=Number($("cost").value),value=Number($("value").value);
 $("thresholdOut").textContent=threshold;$("precisionOut").textContent=precision+"%";$("capacityOut").textContent=capacity+"%";
 const r=evaluate(threshold,precision,capacity,cost,value);
 $("eligible").textContent=num(r.rate*Number($("population").value));
 $("incremental").textContent=num(r.inc);
 $("incrementalValue").textContent=money(r.gross);
 $("netValue").textContent=money(r.net);
 const positive=r.net>0;
 $("policy").textContent=positive?"TARGET BY EXPECTED NET VALUE":"DO NOT INTERVENE";
 $("policyReason").textContent=positive
 ? "The selected policy produces positive simulated incremental value after intervention cost, subject to the capacity constraint."
 : "Under the current unit economics, the intervention cost exceeds simulated incremental value for the selected policy.";
 renderScatter(r);renderBars(r);renderComparison(precision,cost,value,capacity);
}
function reset(){ $("population").value=100000;$("cost").value=2.10;$("value").value=18.40;$("threshold").value=55;$("precision").value=78;$("capacity").value=35;recalc()}
["threshold","precision","capacity"].forEach(id=>$(id).addEventListener("input",recalc));
["population","cost","value"].forEach(id=>$(id).addEventListener("change",recalc));
$("recalculate").onclick=recalc;$("reset").onclick=reset;
buildPopulation();recalc();