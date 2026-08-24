let me, tytChart, aytChart, examChannel;

function labelsFor(type){
  const names=type==="TYT"?["Türkçe","Sosyal","Matematik","Fen"]:["Matematik","Edebiyat","Tarih-1","Coğrafya-1"];
  ["l1","l2","l3","l4"].forEach((id,i)=>{document.getElementById(id).firstChild.nodeValue=names[i];});
}
exam_type.addEventListener("change",()=>labelsFor(exam_type.value));

const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
const signed = n => n==null ? "—" : `${n>=0?"+":""}${fmt(n)}`;
const pct = (n,max) => n==null ? "—" : `${((Number(n)/max)*100).toFixed(1)}%`;

function chartDataset(type, exams, targetNet){
  const mainColor=type==="TYT"?"#2563eb":"#d97706";
  const fillColor=type==="TYT"?"rgba(37,99,235,.08)":"rgba(217,119,6,.08)";
  const sets=[{
    label:`${type} net`,
    data:exams.map(x=>Number(x.total_net)),
    borderColor:mainColor,
    backgroundColor:fillColor,
    borderWidth:2.5,
    pointRadius:3,
    pointHoverRadius:5,
    tension:.22,
    fill:true
  }];
  if(targetNet!=null){
    sets.push({
      label:"Hedef",
      data:exams.map(()=>Number(targetNet)),
      borderColor:"#16a34a",
      borderWidth:1.5,
      pointRadius:0,
      borderDash:[6,5],
      fill:false,
      tension:0
    });
  }
  return sets;
}

function upsertChart(existing, canvas, exams, type, maxNet, targetNet){
  const labels=exams.map((x,i)=>`${i+1}`);
  const datasets=chartDataset(type,exams,targetNet);

  if(existing){
    existing.data.labels=labels;
    existing.data.datasets=datasets;
    existing.update('none');
    return existing;
  }

  return new Chart(canvas,{
    type:"line",
    data:{labels,datasets},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      normalized:true,
      parsing:false,
      interaction:{mode:"index",intersect:false},
      plugins:{
        legend:{display:true,labels:{usePointStyle:true,boxWidth:8}},
        tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)}`}}
      },
      scales:{
        y:{min:0,max:maxNet,grid:{color:"rgba(148,163,184,.13)"},ticks:{stepSize:type==="TYT"?20:10}},
        x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:10}}
      }
    }
  });
}

async function loadExams(){
  const [{data:examsData,error:examError},{data:targets}] = await Promise.all([
    supabaseClient.from("exams").select("*").eq("student_id",me.session.user.id).order("exam_date",{ascending:true}).order("created_at",{ascending:true}),
    supabaseClient.from("law_targets").select("*").order("rank_ref")
  ]);
  if(examError){console.error(examError);return;}

  const exams=(examsData||[]).map(x=>({...x,total_net:Number(x.total_net)}));
  const target=(targets||[]).find(x=>x.id===me.profile.target_id)||null;
  const tyt=exams.filter(x=>x.exam_type==="TYT");
  const ayt=exams.filter(x=>x.exam_type==="AYT");

  rows.innerHTML="";
  const previousByType={TYT:null,AYT:null};
  const diffs=new Map();
  exams.forEach(x=>{
    const prev=previousByType[x.exam_type];
    diffs.set(x.id,prev==null?null:Number(x.total_net)-prev);
    previousByType[x.exam_type]=Number(x.total_net);
  });

  exams.slice().reverse().forEach(x=>{
    const diff=diffs.get(x.id);
    const max=x.exam_type==="TYT"?120:80;
    rows.insertAdjacentHTML("beforeend",`<tr><td>${x.exam_date}</td><td><span class="type-chip ${x.exam_type.toLowerCase()}">${x.exam_type}</span></td><td>${x.exam_name||"—"}</td><td><b>${fmt(x.total_net)}</b></td><td class="${diff==null?"":diff>=0?"positive":"negative"}">${signed(diff)}</td><td>${pct(x.total_net,max)}</td></tr>`);
  });
  examCount.textContent=`${exams.length} deneme`;

  const latest=a=>a.length?a[a.length-1]:null;
  const first=a=>a.length?a[0]:null;
  const best=a=>a.length?Math.max(...a.map(x=>Number(x.total_net))):null;
  const last5=a=>avg(a.slice(-5).map(x=>Number(x.total_net)));
  const t=latest(tyt),a=latest(ayt),t0=first(tyt),a0=first(ayt);
  const tDiff=t&&t0?Number(t.total_net)-Number(t0.total_net):null;
  const aDiff=a&&a0?Number(a.total_net)-Number(a0.total_net):null;
  const targetName=target?.university||"Hedef seçilmedi";

  kpis.innerHTML=`
    <div class="kpi accent-blue"><span>Son TYT</span><b>${fmt(t?.total_net)}</b><small>${pct(t?.total_net,120)} başarı</small></div>
    <div class="kpi accent-amber"><span>Son AYT</span><b>${fmt(a?.total_net)}</b><small>${pct(a?.total_net,80)} başarı</small></div>
    <div class="kpi"><span>TYT gelişim</span><b class="${tDiff==null?"":tDiff>=0?"positive":"negative"}">${signed(tDiff)}</b><small>En iyi ${fmt(best(tyt))}</small></div>
    <div class="kpi"><span>AYT gelişim</span><b class="${aDiff==null?"":aDiff>=0?"positive":"negative"}">${signed(aDiff)}</b><small>En iyi ${fmt(best(ayt))}</small></div>
    <div class="kpi"><span>Son 5 TYT ort.</span><b>${fmt(last5(tyt))}</b><small>${tyt.length} TYT denemesi</small></div>
    <div class="kpi"><span>Son 5 AYT ort.</span><b>${fmt(last5(ayt))}</b><small>${ayt.length} AYT denemesi</small></div>
    <div class="kpi target-kpi"><span>Hukuk hedefi</span><b class="target-name">${targetName}</b><small>${target?`TYT ${fmt(target.target_tyt)} • AYT ${fmt(target.target_ayt)}`:"Koçun hedef belirleyebilir"}</small></div>`;

  tytChart=upsertChart(tytChart,document.getElementById("tytChart"),tyt,"TYT",120,target?.target_tyt ?? null);
  aytChart=upsertChart(aytChart,document.getElementById("aytChart"),ayt,"AYT",80,target?.target_ayt ?? null);
}

(async()=>{
  me=await requireRole("student");if(!me)return;
  title.textContent=`${me.profile.full_name} — Deneme Takibi`;
  labelsFor("TYT");
  exam_date.valueAsDate=new Date();
  await loadExams();

  examChannel=supabaseClient.channel(`student-exams-${me.session.user.id}`)
    .on("postgres_changes",{
      event:"*",schema:"public",table:"exams",filter:`student_id=eq.${me.session.user.id}`
    },()=>loadExams())
    .subscribe();
})();

examForm.addEventListener("submit",async(e)=>{
  e.preventDefault();
  const vals=[s1,s2,s3,s4].map(x=>Number(x.value||0));
  const total=vals.reduce((a,b)=>a+b,0);
  const {error}=await supabaseClient.from("exams").insert({
    student_id:me.session.user.id,exam_type:exam_type.value,exam_date:exam_date.value,exam_name:exam_name.value,
    score_1:vals[0],score_2:vals[1],score_3:vals[2],score_4:vals[3],total_net:total,note:note.value
  });
  if(error){alert(error.message);return;}
  examForm.reset();
  labelsFor("TYT");
  exam_date.valueAsDate=new Date();
  await loadExams();
});
