const $ = id => document.getElementById(id);
let rows = [];
let lastResult = null;

const fmt = (x, d=2) => Number.isFinite(x) ? x.toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:d}) : "—";
const pct = (x,d=2) => Number.isFinite(x) ? (x*100).toFixed(d)+"%" : "—";
const num = x => { const n=Number(x); return Number.isFinite(n)?n:NaN; };
const mean = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : NaN;
const variance = a => { const m=mean(a); return a.length>1 ? a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1) : NaN; };
const sd = a => Math.sqrt(variance(a));

function erf(x){const s=x<0?-1:1;x=Math.abs(x);const a1=.254829592,a2=-.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=.3275911,t=1/(1+p*x);return s*(1-(((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x)));}
function normalCDF(x){return .5*(1+erf(x/Math.SQRT2));}
function normalInv(p){
  if(p<=0)return -Infinity;
  if(p>=1)return Infinity;
  let lo=-8,hi=8;
  for(let i=0;i<80;i++){
    const mid=(lo+hi)/2;
    if(normalCDF(mid)<p)lo=mid;else hi=mid;
  }
  return (lo+hi)/2;
}

function card(id,items){$(id).innerHTML=items.map(x=>'<div class="card"><small>'+x.l+'</small><strong>'+x.v+'</strong><span>'+x.s+'</span></div>').join('');}
function escapeHtml(s){return String(s??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));}

function parseCSV(text){
  const lines=text.trim().split(/\r?\n/); if(!lines.length)return [];
  const parseLine=line=>{let out=[],cur="",q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q}else if(ch===','&&!q){out.push(cur.trim());cur="";}else cur+=ch;}out.push(cur.trim());return out;};
  const head=parseLine(lines.shift()).map(x=>x.replace(/^"|"$/g,""));
  return lines.map(line=>{const v=parseLine(line);return Object.fromEntries(head.map((h,i)=>[h,v[i]??""]));}).filter(r=>Object.values(r).some(v=>String(v).trim()!==""));
}

function inferDataset(rawRows){
  if(!rawRows.length) return {rows:rawRows, message:"No rows detected."};
  const cols=Object.keys(rawRows[0]);
  const numericCols=cols.filter(k=>rawRows.some(r=>r[k]!==""&&Number.isFinite(Number(r[k]))));
  const unique=k=>[...new Set(rawRows.map(r=>String(r[k]??"")).filter(Boolean))];
  const binaryCols=numericCols.filter(k=>{const u=[...new Set(rawRows.map(r=>Number(r[k])).filter(Number.isFinite))];return u.length===2&&u.every(v=>v===0||v===1);});
  const idCol=cols.find(k=>/^id$|_id$|user.?id|customer.?id/i.test(k));
  const groupCol=cols.find(k=>/^(group|variant|arm|treatment|experiment.?group|bucket)$/i.test(k))||cols.find(k=>{const u=unique(k);return u.length===2&&u.every(v=>/control|treatment|test|variant|holdout/i.test(v));});
  let out=rawRows.map(r=>({...r}));
  let treatmentCol=null;
  if(groupCol){
    const vals=unique(groupCol), control=vals.find(v=>/control|holdout|baseline/i.test(v))||vals[0], treatment=vals.find(v=>/treatment|test|variant/i.test(v)&&v!==control)||vals.find(v=>v!==control);
    out=out.map(r=>({...r,treatment:String(r[groupCol])===String(treatment)?1:0}));
    treatmentCol=groupCol;
  } else if(binaryCols.length){
    treatmentCol=binaryCols.find(k=>/treat|variant|group|arm|assign/i.test(k))||binaryCols[0];
    out=out.map(r=>({...r,treatment:Number(r[treatmentCol])}));
  }
  const preCol=cols.find(k=>/^pre[_ -]?|pre.?period|baseline/i.test(k));
  const postCol=cols.find(k=>/^post[_ -]?|outcome|after/i.test(k));
  const timeCol=cols.find(k=>/date|time|week|month|day|period/i.test(k));
  const denominator=cols.find(k=>/denominator|denom|exposure|users|impressions/i.test(k));
  const numerator=cols.find(k=>/numerator|num|orders|bookings|conversions/i.test(k));
  const ratioPossible=!!denominator&&!!numerator&&numericCols.includes(denominator)&&numericCols.includes(numerator);
  const outcomeCandidates=numericCols.filter(k=>k!==treatmentCol&&k!==denominator&&k!==numerator);
  const metricCol=binaryCols.find(k=>k!==treatmentCol)||outcomeCandidates.find(k=>/conversion|convert|revenue|booking|gmv|gross|outcome|metric/i.test(k))||outcomeCandidates[0];
  let metric="continuous";
  if(ratioPossible) metric="ratio";
  else if(metricCol&&binaryCols.includes(metricCol)) metric="binary";
  else if(metricCol&&/revenue/i.test(metricCol)) metric="revenue";
  if(treatmentCol){
    $("metric").value=metric;
    $("metricColumn").value=metric==="ratio"?numerator:(metricCol||"");
    $("denominatorColumn").value=denominator||"denominator";
    $("preColumn").value=preCol||"";
    if($("didPre")) $("didPre").value=preCol||"";
    if($("didPost")) $("didPost").value=postCol||"";
    if($("timeColumn")) $("timeColumn").value=timeCol||"";
    if($("cohortColumn")) $("cohortColumn").value=cols.find(k=>/cohort|treatment.?week|first.?treat/i.test(k))||"";
    if($("unitColumn")) $("unitColumn").value=cols.find(k=>/geo|city|region|country|unit/i.test(k))||"";
    if($("tmleTreatment")) $("tmleTreatment").value=treatmentCol;
    if($("tmleOutcome")) $("tmleOutcome").value=metricCol||"";
    const confidence=groupCol||treatmentCol;
    $("status").textContent="Detected "+metric+" experiment · treatment: "+confidence+(metricCol?" · outcome: "+metricCol:"");
  }
  return {rows:out, metric, metricCol, groupCol, treatmentCol, preCol, timeCol, ratioPossible};
}

function renderDatasetProfile(inferred){
  const el=$("datasetProfile"); if(!el)return;
  const items=[
    {l:"Rows",v:rows.length.toLocaleString(),s:"uploaded records"},
    {l:"Experiment group",v:inferred.groupCol||inferred.treatmentCol||"Not detected",s:"control / treatment mapping"},
    {l:"Outcome",v:inferred.metricCol||"Not detected",s:inferred.metric||"metric"},
    {l:"Pre-period",v:inferred.preCol||"Not detected",s:"CUPED / pre-post candidate"},
    {l:"Time",v:inferred.timeCol||"Not detected",s:"rollout / temporal candidate"},
    {l:"Ratio",v:inferred.ratioPossible?"Detected":"Not detected",s:"numerator / denominator candidate"}
  ];
  el.innerHTML=items.map(x=>'<div class="card"><small>'+escapeHtml(x.l)+'</small><strong>'+escapeHtml(x.v)+'</strong><span>'+escapeHtml(x.s)+'</span></div>').join("");
}

function loadUploaded(rawRows,name){
  const inferred=inferDataset(rawRows);
  rows=inferred.rows;
  renderDatasetProfile(inferred);
  if($("scenario")) $("scenario").value="conversion";
  if($("scenarioTitle")) $("scenarioTitle").textContent="Detected dataset";
  if($("scenarioDescription")) $("scenarioDescription").textContent=inferred.treatmentCol
    ? "Experiment structure inferred from your uploaded columns. Review the detected mapping before analysis."
    : "Could not confidently identify a treatment/control column. Add or select a 0/1 treatment assignment.";
  renderAnalysis();
  $("status").textContent=(inferred.treatmentCol?"Detected and loaded ":"Loaded ")+rows.length.toLocaleString()+" rows"+(name?" · "+name:"")+
    (inferred.treatmentCol?" · "+inferred.metric+" analysis suggested":" · manual mapping required");
}

function demo(){
  const r=[]; for(let i=0;i<1600;i++){const t=i%2, pre=80+Math.random()*40, conv=(Math.random()<(.12+(t?.035:0))?1:0), gb=Math.max(0,(t?52:47)+pre*.45+(Math.random()-.5)*35);r.push({treatment:t,conversion:conv,gross_bookings:gb,pre_metric:pre,country:["UK","US","DE","IN"][i%4]});} return r;
}
function getConfig(){
  return {metric:$("metric").value, metricColumn:$("metricColumn").value.trim()||($("metric").value==="binary"?"conversion":"gross_bookings"), denominator:$("denominatorColumn")?.value.trim()||"denominator", pre:$("preColumn").value.trim(), expected:Number($("allocation").value)/100, alpha:Number($("alpha").value), power:Number($("power").value), mde:Number($("mde").value)/100, reps:Number($("bootstrap").value)};
}
function metricLabel(c){return c.metric==="binary"?"Conversion rate":c.metric==="ratio"?"Ratio "+c.metricColumn+" / "+c.denominator:c.metric==="continuous"?"Average "+(c.metricColumn||"metric"):"Average "+(c.metricColumn||"revenue");}
function validate(){
  const c=getConfig(); if(!rows.length)return "Load data first.";
  if(!rows.every(r=>[0,1].includes(Number(r.treatment))))return "treatment must be coded 0/1.";
  const vals=rows.map(r=>num(r[c.metricColumn])); if(vals.some(Number.isNaN))return "Metric column contains missing or non-numeric values.";
  if(c.metric==="binary" && vals.some(v=>![0,1].includes(v)))return "Binary metrics must contain only 0/1.";
  if(c.metric==="ratio" && rows.some(r=>Number.isNaN(num(r[c.denominator]))||num(r[c.denominator])<=0))return "Ratio metrics require a positive numeric denominator column.";
  if(c.pre && rows.some(r=>Number.isNaN(num(r[c.pre]))))return "Pre-period metric contains missing or non-numeric values.";
  return "";
}

function bootstrapDiff(c,t,reps){
  const out=[]; for(let b=0;b<reps;b++){let cm=0,tm=0;for(let i=0;i<c.length;i++)cm+=c[Math.floor(Math.random()*c.length)];for(let i=0;i<t.length;i++)tm+=t[Math.floor(Math.random()*t.length)];out.push(tm/t.length-cm/c.length);} out.sort((a,b)=>a-b);return {lo:out[Math.floor(reps*.025)],hi:out[Math.floor(reps*.975)],se:sd(out)};
}
function ratioTest(c,t,den){
  const cn=c.reduce((s,i)=>s+i.n,0), cd=c.reduce((s,i)=>s+i.d,0), tn=t.reduce((s,i)=>s+i.n,0), td=t.reduce((s,i)=>s+i.d,0);
  const cr=cn/cd,tr=tn/td,diff=tr-cr;
  const varC=c.reduce((s,i)=>s+(i.n-cr*i.d)**2,0)/(cd*cd);
  const varT=t.reduce((s,i)=>s+(i.n-tr*i.d)**2,0)/(td*td);
  const se=Math.sqrt(varC/c.length+varT/t.length),z=se?diff/se:0,p=2*(1-normalCDF(Math.abs(z))),ci=1.96*se;
  return {control:cr,treatment:tr,diff,lift:cr?diff/cr:NaN,se,p,lo:diff-ci,hi:diff+ci};
}
function ratioBootstrap(c,t,reps){
  const out=[];
  for(let b=0;b<reps;b++){let cn=0,cd=0,tn=0,td=0;for(let i=0;i<c.length;i++){const x=c[Math.floor(Math.random()*c.length)];cn+=x.n;cd+=x.d}for(let i=0;i<t.length;i++){const x=t[Math.floor(Math.random()*t.length)];tn+=x.n;td+=x.d}out.push(tn/td-cn/cd)}
  out.sort((a,b)=>a-b);return {lo:out[Math.floor(reps*.025)],hi:out[Math.floor(reps*.975)],se:sd(out)};
}
function continuousTest(c,t){
  const cm=mean(c),tm=mean(t),diff=tm-cm, se=Math.sqrt(variance(c)/c.length+variance(t)/t.length), z=se?diff/se:0, p=2*(1-normalCDF(Math.abs(z))), ci=1.96*se;
  return {control:cm,treatment:tm,diff,lift:cm?diff/cm:NaN,se,p,lo:diff-ci,hi:diff+ci};
}
function binaryTest(c,t){
  const cm=mean(c),tm=mean(t),diff=tm-cm,se=Math.sqrt(cm*(1-cm)/c.length+tm*(1-tm)/t.length),z=se?diff/se:0,p=2*(1-normalCDF(Math.abs(z))),ci=1.96*se;
  return {control:cm,treatment:tm,diff,lift:cm?diff/cm:NaN,se,p,lo:diff-ci,hi:diff+ci};
}

function powerMDE(){
  const c=getConfig(), n=rows.length, alloc=c.expected, nc=Math.max(1,Math.round(n*(1-alloc))),nt=Math.max(1,n-nc), alpha=c.alpha, zA=normalInv(1-alpha/2),zP=normalInv(c.power);
  const baseline=Number($("baseline").value)/100, sdv=Number($("baselineSd").value), ratio=Math.sqrt(1/nc+1/nt);
  let mde;
  if(c.metric==="binary"){const v=baseline*(1-baseline);mde=(zA*Math.sqrt(v*ratio*ratio)+zP*Math.sqrt(v*ratio*ratio));}
  else mde=(zA+zP)*sdv*ratio;
  const target=c.mde||mde;
  const effectText=c.metric==="binary"?pct(mde)+" absolute":"+"+fmt(mde)+" metric units";
  card("powerResults",[{"l":"Observed total N","v":n.toLocaleString(),"s":"current dataset"},{"l":"Target power","v":pct(c.power),"s":"two-sided test"},{"l":"Approx. MDE","v":effectText,"s":c.metric==="binary"?"absolute difference":"continuous metric"},{"l":"Target MDE","v":c.metric==="binary"?pct(target):fmt(target),"s":"from configuration"}]);
  $("powerNote").innerHTML=c.metric==="binary"?"Binary approximation uses the baseline conversion rate. For planning, verify with a dedicated power package when rates are extreme.":"Continuous approximation uses the baseline standard deviation and a normal-theory two-sample design.";
}

function renderAnalysis(){
  const err=validate(); if(err){$("status").textContent=err;return;}
  const c=getConfig(), controlRows=rows.filter(r=>Number(r.treatment)===0), treatmentRows=rows.filter(r=>Number(r.treatment)===1);
  const controls=c.metric==="ratio"?controlRows.map(r=>({n:num(r[c.metricColumn]),d:num(r[c.denominator])})):controlRows.map(r=>num(r[c.metricColumn]));
  const treats=c.metric==="ratio"?treatmentRows.map(r=>({n:num(r[c.metricColumn]),d:num(r[c.denominator])})):treatmentRows.map(r=>num(r[c.metricColumn]));
  const res=c.metric==="binary"?binaryTest(controls,treats):c.metric==="ratio"?ratioTest(controls,treats,c.denominator):continuousTest(controls,treats); lastResult={config:c,res,controls,treats};
  const expected=rows.length*c.expected, imbalance=Math.abs(treats.length-expected)/expected;
  card("health",[{l:"Control N",v:controls.length.toLocaleString(),s:"users/units"},{l:"Treatment N",v:treats.length.toLocaleString(),s:"users/units"},{l:"Allocation",v:pct(treats.length/rows.length,1),s:"treatment share"},{l:"SRM",v:imbalance>.1?"Review":"Pass",s:imbalance>.1?"allocation differs from expected":"allocation within 10% of expected"}]);
  const unit=c.metric==="binary"?"rate":c.metric==="ratio"?"ratio":(c.metricColumn||"metric");
  card("effect",[{l:"Control",v:c.metric==="binary"?pct(res.control):fmt(res.control),s:unit+" baseline"},{l:"Treatment",v:c.metric==="binary"?pct(res.treatment):fmt(res.treatment),s:unit+" observed"},{l:"Absolute effect",v:c.metric==="binary"?fmt(res.diff*100)+" pp":fmt(res.diff),s:"treatment − control"},{l:"Relative lift",v:pct(res.lift,1),s:"relative to control"}]);
  $("controlBar").style.width=(c.metric==="binary"?Math.max(0,res.control*100):Math.max(0,Math.min(100,res.control/(Math.max(res.control,res.treatment)||1)*100)))+"%";
  $("treatmentBar").style.width=(c.metric==="binary"?Math.max(0,res.treatment*100):Math.max(0,Math.min(100,res.treatment/(Math.max(res.control,res.treatment)||1)*100)))+"%";
  $("controlValue").textContent=c.metric==="binary"?pct(res.control):fmt(res.control);
  $("treatmentValue").textContent=c.metric==="binary"?pct(res.treatment):fmt(res.treatment);
  const boot=c.metric==="ratio"?ratioBootstrap(controls,treats,c.reps):bootstrapDiff(controls,treats,c.reps);
  card("inference",[{l:"95% normal CI",v:c.metric==="binary"?fmt(res.lo*100)+" to "+fmt(res.hi*100)+" pp":fmt(res.lo)+" to "+fmt(res.hi),s:"normal approximation"},{l:"95% bootstrap CI",v:c.metric==="binary"?fmt(boot.lo*100)+" to "+fmt(boot.hi*100)+" pp":fmt(boot.lo)+" to "+fmt(boot.hi),s:c.reps+" resamples"},{l:"p-value",v:res.p.toFixed(4),s:"two-sided normal test"},{l:"Inference",v:res.p< c.alpha?"Evidence of non-zero effect":"Inconclusive at configured alpha",s:"not a ship/no-ship rule"}]);
  cuped(c); segments(c); renderDecision(c,res,boot); powerMDE(); didModule(); staggeredModule(); syntheticModule(); tmleModule(); renderSequentialMonitoring();
  $("status").textContent="Loaded "+rows.length.toLocaleString()+" rows · "+metricLabel(c)+".";
}

function cuped(c){
  if(c.metric==="ratio"){$("cuped").innerHTML='<div class="card"><strong>Not applied</strong><span>Ratio metrics need a dedicated ratio-adjustment design; CUPED is disabled here rather than adjusting the numerator alone.</span></div>';return;}
  if(!c.pre){$("cuped").innerHTML='<div class="card"><strong>Not configured</strong><span>Add a pre-period metric to estimate a CUPED-style adjusted effect.</span></div>';return;}
  const all=rows, x=all.map(r=>num(r[c.pre])), y=all.map(r=>num(r[c.metricColumn])), mx=mean(x),my=mean(y),vx=mean(x.map(v=>(v-mx)**2)),cov=mean(x.map((v,i)=>(v-mx)*(y[i]-my))),theta=vx?cov/vx:0, adj=y.map((v,i)=>v-theta*(x[i]-mx)), ac=mean(adj.filter((_,i)=>Number(all[i].treatment)===0)),at=mean(adj.filter((_,i)=>Number(all[i].treatment)===1));
  card("cuped",[{l:"Raw effect",v:c.metric==="binary"?fmt((mean(rows.filter(r=>Number(r.treatment)===1).map(r=>num(r[c.metricColumn])))-mean(rows.filter(r=>Number(r.treatment)===0).map(r=>num(r[c.metricColumn]))))*100)+" pp":fmt(mean(rows.filter(r=>Number(r.treatment)===1).map(r=>num(r[c.metricColumn])))-mean(rows.filter(r=>Number(r.treatment)===0).map(r=>num(r[c.metricColumn])))),s:"before adjustment"},{l:"Adjusted effect",v:c.metric==="binary"?fmt((at-ac)*100)+" pp":fmt(at-ac),s:"CUPED-style estimate"},{l:"Theta",v:fmt(theta,3),s:"pre-period adjustment coefficient"}]);
}

function segments(c){
  const key="country"; if(!rows.some(r=>r[key])){$("segments").innerHTML='<tr><td colspan="6">Add a country column to explore segments.</td></tr>';return;}
  const groups=[...new Set(rows.map(r=>r[key]))];$("segments").innerHTML=groups.map(g=>{const a=rows.filter(r=>r[key]===g),cc=a.filter(r=>!Number(r.treatment)).map(r=>num(r[c.metricColumn])),tt=a.filter(r=>Number(r.treatment)).map(r=>num(r[c.metricColumn])),cm=mean(cc),tm=mean(tt),d=tm-cm;return '<tr><td>'+escapeHtml(g)+'</td><td>'+ (c.metric==="binary"?pct(cm):fmt(cm))+'</td><td>'+ (c.metric==="binary"?pct(tm):fmt(tm))+'</td><td>'+ (cm?pct(d/cm,1):"—")+'</td><td>'+fmt(d)+'</td><td>'+a.length+'</td></tr>';}).join("");
}

function renderDecision(c,res,boot){
  const unit=c.metric==="binary"?"percentage points":(c.metricColumn||"metric units"), direction=res.diff>=0?"higher":"lower";
  $("decision").innerHTML='<strong>Observed result:</strong> treatment is '+Math.abs(res.diff).toFixed(c.metric==="binary"?4:2)+' '+unit+' '+direction+' than control, a '+pct(res.lift,1)+' relative change. The bootstrap 95% interval is '+(c.metric==="binary"?fmt(boot.lo*100)+" to "+fmt(boot.hi*100)+" pp":fmt(boot.lo)+" to "+fmt(boot.hi))+'.<br><br><span class="muted">Decision note: combine this estimate with power, guardrails, experiment integrity, business value and pre-specified decision criteria. ExperimentLab does not automatically recommend shipping.</span>';
}

function didModule(){
  const pre=$("didPre").value.trim(), post=$("didPost").value.trim(); if(!pre||!post){$("didResult").textContent="Configure pre/post outcome columns to run DiD.";return;}
  const c=getConfig(), groups={cpre:[],cpost:[],tpre:[],tpost:[]};
  rows.forEach(r=>{const t=Number(r.treatment);const preV=num(r[pre]),postV=num(r[post]);if(Number.isNaN(preV)||Number.isNaN(postV))return;if(t){groups.tpre.push(preV);groups.tpost.push(postV)}else{groups.cpre.push(preV);groups.cpost.push(postV)}});
  const did=(mean(groups.tpost)-mean(groups.tpre))-(mean(groups.cpost)-mean(groups.cpre));
  $("didResult").innerHTML='<strong>DiD estimate:</strong> '+fmt(did)+' '+(c.metric==="binary"?"absolute outcome units":"metric units")+'.<br><span class="muted">Formula: (Treatment post − Treatment pre) − (Control post − Control pre). This simple module assumes parallel trends and a clean treatment timing structure.</span>';
}
function staggeredModule(){
  const time=$("timeColumn").value.trim(); if(!time){$("staggeredResult").textContent="Provide a time column plus first-treatment period to use the staggered design explorer.";return;}
  const cohort=$("cohortColumn").value.trim(); if(!cohort){$("staggeredResult").textContent="Provide a first-treatment cohort column.";return;}
  const cohorts=[...new Set(rows.map(r=>r[cohort]).filter(x=>x!==""&&x!=="control"))];$("staggeredResult").innerHTML='<strong>Design check:</strong> detected '+cohorts.length+' treatment cohorts. Use cohort/event-time plots and cohort-specific effects rather than a single naive two-way fixed-effects estimate when treatment timing varies.<br><span class="muted">ExperimentLab currently provides a design diagnostic here; cohort-specific estimators are the next inference layer.</span>';
}
function syntheticModule(){
  const unit=$("unitColumn").value.trim(), time=$("timeColumn").value.trim(); if(!unit||!time){$("syntheticResult").textContent="Provide unit and time columns to configure a synthetic-control analysis.";return;}
  $("syntheticResult").innerHTML='<strong>Configured:</strong> '+escapeHtml(unit)+' as unit and '+escapeHtml(time)+' as time. Synthetic control requires a treated unit, donor pool, pre-treatment period and an outcome column. The next step is donor-weight optimisation and pre-period fit diagnostics.';
}
function tmleModule(){
  const treatment=$("tmleTreatment").value.trim(), outcome=$("tmleOutcome").value.trim(), covars=$("tmleCovariates").value.trim(); if(!treatment||!outcome||!covars){$("tmleResult").textContent="Configure treatment, binary outcome and covariates for the TMLE setup.";return;}
  $("tmleResult").innerHTML='<strong>TMLE setup:</strong> treatment='+escapeHtml(treatment)+', outcome='+escapeHtml(outcome)+', covariates='+escapeHtml(covars)+'.<br><span class="muted">The browser MVP documents the estimand and required nuisance models; production TMLE should use cross-fitting, positivity checks and influence-curve based uncertainty.</span>';
}

function downloadHTML(){
  const c=getConfig(); const title="ExperimentLab Report — "+new Date().toLocaleString();
  const body=document.querySelector("main").innerHTML; const html='<!doctype html><html><head><meta charset="utf-8"><title>'+title+'</title><style>body{font:14px Arial;max-width:1000px;margin:40px auto;line-height:1.5;color:#17202a}h1,h2{margin-top:28px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}.card{display:inline-block;vertical-align:top;width:22%;padding:12px;border:1px solid #ddd;margin:4px}.card small,.muted{color:#667}</style></head><body><h1>'+title+'</h1><p><b>Metric:</b> '+escapeHtml(metricLabel(c))+' · <b>N:</b> '+rows.length+'</p>'+body+'</body></html>';const blob=new Blob([html],{type:"text/html"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="experimentlab-report.html";a.click();URL.revokeObjectURL(url);
}
function printPDF(){window.print();}

function load(data,name){rows=data; $("status").textContent="Loaded "+rows.length.toLocaleString()+" rows"+(name?" · "+name:"")+"."; renderAnalysis();}
$("metric").addEventListener("change",()=>{const b=$("metric").value==="binary";$("baseline").value=b?"10":"50";$("baselineSd").disabled=b;$("baselineSd").value=b?"":"20";renderAnalysis();});
["metricColumn","denominatorColumn","preColumn","allocation","alpha","power","mde","bootstrap","baseline","baselineSd","didPre","didPost","timeColumn","cohortColumn","unitColumn","tmleTreatment","tmleOutcome","tmleCovariates"].forEach(id=>$(id).addEventListener("change",renderAnalysis));
$("file").addEventListener("change",e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=()=>loadUploaded(parseCSV(r.result),f.name);r.readAsText(f);}});
$("loadDemo").onclick=()=>load(demo(),"demo-experiment.csv");
$("dropzone").addEventListener("dragover",e=>e.preventDefault());$("dropzone").addEventListener("drop",e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){const r=new FileReader();r.onload=()=>loadUploaded(parseCSV(r.result),f.name);r.readAsText(f);}});
$("downloadHTML").onclick=downloadHTML;$("printPDF").onclick=printPDF;if($("runPower")) $("runPower").onclick=powerMDE;
load(demo(),"demo-experiment.csv");

/* ExperimentLab scenario + sequential monitoring layer */
const scenarioPresets = {
  conversion:{label:"Conversion experiment",metric:"binary",column:"conversion",pre:"pre_metric",description:"Binary outcome such as conversion, activation or retention."},
  gross_bookings:{label:"Gross Bookings experiment",metric:"continuous",column:"gross_bookings",pre:"pre_gross_bookings",description:"Average Gross Bookings per eligible user."},
  revenue:{label:"Revenue experiment",metric:"revenue",column:"revenue",pre:"pre_revenue",description:"Average revenue per eligible user."},
  ratio:{label:"Ratio metric",metric:"ratio",column:"numerator",denominator:"denominator",pre:"pre_ratio_numerator",description:"Ratio of aggregated numerator to denominator; do not treat row-level ratios as the primary estimand without a deliberate design."},
  geo:{label:"Geo experiment",metric:"continuous",column:"gross_bookings",unit:"geo",description:"Geo-level treatment with clustered/aggregate inference considerations."},
  staggered:{label:"Staggered rollout",metric:"continuous",column:"gross_bookings",time:"week",cohort:"treatment_week",description:"Different units receive treatment at different times."},
  prepost:{label:"Pre/post intervention",metric:"continuous",column:"outcome",pre:"pre_outcome",description:"Intervention measured with a pre/post design, typically paired with a comparison group for DiD."}
};

function scenarioData(type){
  const r=[];
  if(type==="geo"){
    const geos=["IN-1","IN-2","IN-3","IN-4","IN-5","IN-6","IN-7","IN-8"];
    for(let g=0;g<geos.length;g++) for(let w=1;w<=8;w++){
      const t=g<4?1:0, pre=45+Math.random()*10, gb=Math.max(0,(t?58:52)+pre*.2+(Math.random()-.5)*10);
      r.push({treatment:t,conversion:Number(Math.random()<(.1+(t?.02:0))),gross_bookings:gb,revenue:gb*.32+Math.random()*4,numerator:gb*.12,denominator:100+Math.random()*20,pre_metric:pre,pre_gross_bookings:pre,pre_revenue:pre,week:w,country:geos[g],geo:geos[g]});
    }
    return r;
  }
  for(let i=0;i<2400;i++){
    const week=i%12, cohort=type==="staggered"?(i%3===0?"4":i%3===1?"7":"10"):"";
    const t=type==="staggered"?week>=Number(cohort||99):i%2, pre=80+Math.random()*30;
    const conversion=Number(Math.random()<(.10+(t?.025:0)));
    const gb=Math.max(0,(t?56:51)+pre*.35+(Math.random()-.5)*28);
    const revenue=Math.max(0,(t?18:16)+pre*.12+(Math.random()-.5)*12);
    const numerator=Math.max(0,(t?5.8:5.1)+Math.random()*2), denominator=80+Math.random()*40;
    const post=type==="prepost"?(pre+(t?6:1)+(Math.random()-.5)*5):gb;
    r.push({treatment:t?1:0,conversion,gross_bookings:gb,revenue,numerator,denominator,pre_metric:pre,pre_gross_bookings:pre,pre_revenue:pre,pre_ratio_numerator:pre,outcome:post,post_outcome:post,week,treatment_week:cohort,country:["UK","US","DE","IN"][i%4]});
  }
  return r;
}

function applyScenario(type){
  const s=scenarioPresets[type]||scenarioPresets.conversion;
  const metricEl=$("metric"), col=$("metricColumn"), den=$("denominatorColumn"), pre=$("preColumn");
  if(metricEl) metricEl.value=s.metric;
  if(col) col.value=s.column;
  if(den) den.value=s.denominator||"denominator";
  if(pre) pre.value=s.pre||"";
  if($("scenarioDescription")) $("scenarioDescription").textContent=s.description;
  if($("scenarioViewDescription")) $("scenarioViewDescription").textContent=s.description;
  if($("scenarioTitle")) $("scenarioTitle").textContent=s.label;
  load(scenarioData(type),s.label.toLowerCase().replace(/ /g,"-")+".csv");
}

function normalTail(z){return 1-normalCDF(z);}
function sequentialLook(){
  const mode=$("experimentState")?.value||"running", look=Number($("lookNumber")?.value||1), planned=Math.max(1,Number($("plannedLooks")?.value||5));
  const info=Math.min(1,Math.max(.01,Number($("informationFraction")?.value||look/planned)));
  const c=getConfig(); if(!lastResult)return;
  if(mode==="concluded"){
    return {mode,look,planned,info,alpha:c.alpha,boundary:c.alpha,zBoundary:normalInv(1-c.alpha/2),adjustedP:lastResult.res.p,nominalP:lastResult.res.p,decision:lastResult.res.p<c.alpha?"Crosses final alpha boundary":"Does not cross final alpha boundary"};
  }
  const z=Math.abs(lastResult.res.se?lastResult.res.diff/lastResult.res.se:0);
  const zFinal=normalInv(1-c.alpha/2);
  const zBoundary=zFinal/Math.sqrt(info);
  const adjustedAlpha=2*normalTail(zBoundary);
  return {mode,look,planned,info,alpha:c.alpha,boundary:adjustedAlpha,zBoundary,adjustedP:lastResult.res.p,decision:z>=zBoundary?"Boundary crossed — confirm stopping rule and pre-specified decision process":"Boundary not crossed — continue to planned look",nominalP:lastResult.res.p};
}
function renderSequentialMonitoring(){
  const s=sequentialLook(); if(!s||!$("sequential"))return;
  const label=s.mode==="running"?"RUNNING EXPERIMENT":"EXPERIMENT CONCLUDED";
  const advice=s.mode==="running"?"Monitoring view: nominal p-values are shown for diagnostics, but the sequential boundary is the decision threshold. Do not repeatedly apply the final 0.05 threshold.":"Final analysis: use the pre-specified final alpha and planned analysis population.";
  $("sequential").innerHTML='<div class="monitor-head"><strong>'+label+'</strong><span>Look '+s.look+' of '+s.planned+' · information fraction '+(s.info*100).toFixed(0)+'%</span></div><div class="cards"><div class="card"><small>Nominal p-value</small><strong>'+s.nominalP?.toFixed(4)+'</strong><span>diagnostic only while running</span></div><div class="card"><small>Sequential alpha</small><strong>'+s.boundary.toFixed(4)+'</strong><span>approx. O’Brien–Fleming-style boundary</span></div><div class="card"><small>Z boundary</small><strong>'+s.zBoundary.toFixed(2)+'</strong><span>two-sided</span></div><div class="card"><small>Monitoring status</small><strong>'+s.decision+'</strong><span>'+advice+'</span></div></div>';
}

if($("scenario")) $("scenario").addEventListener("change",e=>applyScenario(e.target.value));
["experimentState","lookNumber","plannedLooks","informationFraction"].forEach(id=>{if($(id)) $(id).addEventListener("change",renderSequentialMonitoring);});

function renderScenarioTimeline(){
  const el=$("scenarioTimeline"); if(!el)return;
  const type=$("scenario")?.value||"conversion";
  const labels={conversion:["Design","Randomize","Monitor","Conclude"],gross_bookings:["Baseline","Randomize","Monitor GB","Conclude"],revenue:["Baseline","Randomize","Monitor revenue","Conclude"],ratio:["Define numerator","Define denominator","Monitor ratio","Conclude"],geo:["Select geos","Assign geos","Monitor clusters","Conclude"],staggered:["Define cohorts","Roll out","Event time","Conclude"],prepost:["Pre-period","Intervention","Post-period","Estimate DiD"]};
  const current=($("experimentState")?.value==="concluded")?3:Math.min(2,Number($("lookNumber")?.value||1)-1);
  el.innerHTML=(labels[type]||labels.conversion).map((x,i)=>'<div class="timeline-step '+(i<=current?"done":"")+'"><b>0'+(i+1)+'</b><span>'+x+'</span></div>').join("");
}
const originalApplyScenario=applyScenario;
applyScenario=function(type){ originalApplyScenario(type); renderScenarioTimeline(); };
const originalRenderSequentialMonitoring=renderSequentialMonitoring;
renderSequentialMonitoring=function(){ originalRenderSequentialMonitoring(); renderScenarioTimeline(); };
if($("downloadHTML2")) $("downloadHTML2").onclick=downloadHTML;
if($("printPDF2")) $("printPDF2").onclick=printPDF;
if($("loadDemo")) $("loadDemo").onclick=()=>load(scenarioData($("scenario")?.value||"conversion"),"demo-experiment.csv");
renderScenarioTimeline();
