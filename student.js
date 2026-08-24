let me, tytChart, aytChart;

function labelsFor(type){
  const names=type==="TYT"?["Türkçe","Sosyal","Matematik","Fen"]:["Matematik","Edebiyat","Tarih-1","Coğrafya-1"];
  ["l1","l2","l3","l4"].forEach((id,i)=>{document.getElementById(id).firstChild.nodeValue=names[i];});
}
exam_type.addEventListener("change",()=>labelsFor(exam_type.value));

const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
const signed=n=>n==null?"—":`${n>=0?"+":""}${fmt(n)}`;
const pct=(n,max)=>n==null?"—":`${((Number(n)/max)*100).toFixed(1)}%`;

function makeLineChart(canvas, exams, type, maxNet, targetNet){
  if(!exams.length){
    const ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);
    return null;
  }
  const datasets=[{
    label:`${type} net`,data:exams.map(x=>Number(x.total_net)),
    borderColor:type==="TYT"?"#2563eb":"#d97706",
    backgroundColor:type==="TYT"?"rgba(37,99,235,.08)":"rgba(217,119,6,.08)",
    borderWidth:2.5,pointRadius:3,pointHoverRadius:5,tension:.25,fill:true
  }];
  if(targetNet!=null){
    datasets.push({label:"Hedef",data:exams.map(()=>Number(targetNet)),borderColor:"#16a34a",borderWidth:1.8,pointRadius:0,borderDash:[6,5],tension:0});
  }
  return new Chart(canvas,{type:"line",data:{labels:exams.map((x,i)=>`${i+1}`),datasets},options:{
    responsive:true,maintainAspectRatio:false,animation:false,normalized:true,
    interaction:{mode:"index",intersect:false},
    plugins:{legend:{display:true,labels:{usePointStyle:true,boxWidth:7,font:{size:11}}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)}`}}},
    scales:{y:{beginAtZero:true,max:maxNet,grid:{color:"rgba(148,163,184,.13)"},ticks:{stepSize:10,font:{size:10}}},x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:8,font:{size:10}}}}
  }});
}

async function loadExams(){
  const [{data:examsData},{data:targets}]=await Promise.all([
    supabaseClient.from("exams").select("*").eq("student_id",me.session.user.id).order("exam_date",{ascending:true}).order("created_at",{ascending:true}),
    supabaseClient.from("law_targets").select("*").order("rank_ref")
  ]);
  const exams=examsData||[];
  const target=(targets||[]).find(x=>x.id===me.profile.target_id)||null;
  const tyt=exams.filter(x=>x.exam_type==="TYT");
  const ayt=exams.filter(x=>x.exam_type==="AYT");

  rows.innerHTML="";
  const previousByType={TYT:null,AYT:null};
  const rendered=[];
  for(const x of exams){
    const prev=previousByType[x.exam_type];
    const diff=prev==null?null:Number(x.total_net)-Number(prev);
    previousByType[x.exam_type]=Number(x.total_net);
    rendered.push({x,diff});
  }
  rendered.reverse().forEach(({x,diff})=>{
    const max=x.exam_type==="TYT"?120:80;
    rows.insertAdjacentHTML("beforeend",`<tr><td>${x.exam_date}</td><td><span class="type-chip ${x.exam_type.toLowerCase()}">${x.exam_type}</span></td><td>${x.exam_name||"—"}</td><td><b>${fmt(x.total_net)}</b></td><td class="${diff==null?"":diff>=0?"positive":"negative"}">${signed(diff)}</td><td>${pct(x.total_net,max)}</td></tr>`);
  });
  examCount.textContent=`${exams.length} deneme`;

  const latest=a=>a.length?a[a.length-1]:null, first=a=>a.length?a[0]:null;
  const best=a=>a.length?Math.max(...a.map(x=>Number(x.total_net))):null;
  const last5=a=>avg(a.slice(-5).map(x=>Number(x.total_net)));
  const t=latest(tyt),a=latest(ayt),t0=first(tyt),a0=first(ayt);
  const tDiff=t&&t0?Number(t.total_net)-Number(t0.total_net):null;
  const aDiff=a&&a0?Number(a.total_net)-Number(a0.total_net):null;

  kpis.innerHTML=`
    <div class="kpi accent-blue"><span>Son TYT</span><b>${fmt(t?.total_net)}</b><small>${pct(t?.total_net,120)} başarı</small></div>
    <div class="kpi accent-amber"><span>Son AYT</span><b>${fmt(a?.total_net)}</b><small>${pct(a?.total_net,80)} başarı</small></div>
    <div class="kpi"><span>TYT gelişim</span><b class="${tDiff==null?"":tDiff>=0?"positive":"negative"}">${signed(tDiff)}</b><small>En iyi ${fmt(best(tyt))}</small></div>
    <div class="kpi"><span>AYT gelişim</span><b class="${aDiff==null?"":aDiff>=0?"positive":"negative"}">${signed(aDiff)}</b><small>En iyi ${fmt(best(ayt))}</small></div>
    <div class="kpi"><span>Son 5 TYT ort.</span><b>${fmt(last5(tyt))}</b><small>${tyt.length} TYT</small></div>
    <div class="kpi"><span>Son 5 AYT ort.</span><b>${fmt(last5(ayt))}</b><small>${ayt.length} AYT</small></div>
    <div class="kpi target-kpi"><span>Hukuk hedefi</span><b class="target-name">${target?.university||"Hedef seçilmedi"}</b><small>${target?`TYT ${fmt(target.target_tyt)} • AYT ${fmt(target.target_ayt)}`:"Koç hedef belirlediğinde burada görünür"}</small></div>`;

  if(tytChart)tytChart.destroy(); if(aytChart)aytChart.destroy();
  tytChart=makeLineChart(document.getElementById("tytChart"),tyt,"TYT",120,target?.target_tyt);
  aytChart=makeLineChart(document.getElementById("aytChart"),ayt,"AYT",80,target?.target_ayt);
}

(async()=>{me=await requireRole("student");if(!me)return;title.textContent=`${me.profile.full_name} — Deneme Takibi`;labelsFor("TYT");exam_date.valueAsDate=new Date();await loadExams();})();

examForm.addEventListener("submit",async e=>{
  e.preventDefault();
  const vals=[s1,s2,s3,s4].map(x=>Number(x.value||0));
  const total=vals.reduce((a,b)=>a+b,0);
  const {error}=await supabaseClient.from("exams").insert({student_id:me.session.user.id,exam_type:exam_type.value,exam_date:exam_date.value,exam_name:exam_name.value,score_1:vals[0],score_2:vals[1],score_3:vals[2],score_4:vals[3],total_net:total,note:note.value});
  if(error){alert(error.message);return;}
  examForm.reset();labelsFor("TYT");exam_date.valueAsDate=new Date();await loadExams();
});
