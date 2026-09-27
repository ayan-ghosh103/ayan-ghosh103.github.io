const $=id=>document.getElementById(id);
const fmt=n=>new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(n);
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n);
function seed(i){const x=Math.sin(i*91.17+17.3)*43758.5453;return x-Math.floor(x)}
const effects=[-0.2,-0.1,0.0,0.1,0.0,0.2,0.4,0.7,1.0,1.3,1.6,1.9,2.0,2.1,2.0,2.2,2.3,2.4,2.35];
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab,.tab-panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active")});
function renderEvent(){const el=$("eventChart");el.innerHTML="";effects.forEach((v,i)=>{const p=document.createElement("i");p.style.left=(i/(effects.length-1)*96+2)+"%";p.style.bottom=(50+v*10)+"%";p.title=(i-6)+" days: "+v.toFixed(1)+" pp";el.appendChild(p)})}
function evalPrompt(){const strict=Number($("judgeStrict").value);$("judgeOut").textContent=strict+"%";const v=$("promptVersion").selectedIndex;const base=[92.4,89.7,94.1,3.8];const shifts=[[0,0,0,0],[1.2,1.5,.7,-.8],[2.1,2.0,1.8,-1.3],[2.6,2.7,2.2,-1.8]][v];$("faith").textContent=(base[0]+shifts[0]-(strict-90)*.02).toFixed(1)+"%";$("relevance").textContent=(base[1]+shifts[1]).toFixed(1)+"%";$("citation").textContent=(base[2]+shifts[2]).toFixed(1)+"%";$("halluc").textContent=Math.max(1.4,base[3]+shifts[3]+(100-strict)*.03).toFixed(1)+"%"}
$("judgeStrict").oninput=evalPrompt;$("promptVersion").onchange=evalPrompt;$("runEval").onclick=evalPrompt;
function causal(){const e=$("estimator").value;$("estimatorLabel").textContent=e;renderEvent()}
$("runCausal").onclick=causal;
const costs=[.10,.15,.21,.30,.40,.50,.75,1.00],values=[1.31,1.26,1.18,1.10,.98,.84,.61,.34];
$("costSensitivity").innerHTML=costs.map((c,i)=>'<div class="bars"><div><span>'+money(c)+'/resolution</span><b style="width:'+Math.round(values[i]/1.31*100)+'%"></b><em>'+money(values[i])+'</em></div></div>').join("");
function policy(){const budget=Number($("trafficBudget").value),effect=Number($("minEffect").value);$("trafficOut").textContent=budget+"%";$("effectOut").textContent=effect.toFixed(1)+" pp";const share=Math.max(0,Math.min(budget,Math.round(74-effect*5)));const value=1.22*(share/68);$("routeShare").textContent=share+"%";$("routeValue").textContent="$"+value.toFixed(2)+"M";$("routeRule").textContent="Route if expected incremental contribution − AI cost > 0 and CATE ≥ "+effect.toFixed(1)+" pp, subject to latency and traffic constraints."; $("routeCostValue").textContent="$"+(0.36*share/68).toFixed(2)+"M";$("economicCoverage").textContent=share+"%"}
$("trafficBudget").oninput=policy;$("minEffect").oninput=policy;renderEvent();policy();evalPrompt();