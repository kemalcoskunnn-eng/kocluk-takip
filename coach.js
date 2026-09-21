let me,coachChart;

function statusFor(tyt,ayt,target){
  if(!target)return["HEDEF SEÇİLMEDİ","mid"];
  if(tyt==null||ayt==null)return["VERİ BEKLENİYOR","mid"];
  if(tyt>=target.target_tyt&&ayt>=target.target_ayt)return["HEDEFTE","good"];
  if(tyt>=target.target_tyt-5&&ayt>=target.target_ayt-4)return["YAKIN","mid"];
  return["GELİŞİM GEREKLİ","bad"];
}
const signed=n=>n==null?"—":`${n>=0?"+":""}${fmt(n)}`;

async function load(){
  const [profilesRes,examsRes,targetsRes]=await Promise.all([
    supabaseClient.from("profiles").select("*").eq("role","student").order("full_name"),
    supabaseClient.from("exams").select("*").order("exam_date",{ascending:true}).order("created_at",{ascending:true}),
    supabaseClient.from("law_targets").select("*").order("rank_ref")
  ]);

  const firstError=profilesRes.error||examsRes.error||targetsRes.error;
  if(firstError){
    console.error("Koç paneli veri hatası:",firstError);
    summary.innerHTML=`<div class="card"><b>Veriler yüklenemedi.</b><br><small class="negative">${firstError.message}</small></div>`;
    return;
  }

  const profiles=profilesRes.data||[];
  const exams=examsRes.data||[];
  const targets=targetsRes.data||[];

  const examsByStudent=new Map();
  for(const x of exams){
    if(!examsByStudent.has(x.student_id))examsByStudent.set(x.student_id,[]);
    examsByStudent.get(x.student_id).push(x);
  }

  const chartRows=[];
  let onTarget=0,near=0;
  students.innerHTML="";

  for(const p of profiles){
    const e=examsByStudent.get(p.id)||[];
    const tyt=e.filter(x=>x.exam_type==="TYT"), ayt=e.filter(x=>x.exam_type==="AYT");
    const t=tyt.length?tyt[tyt.length-1]:null, a=ayt.length?ayt[ayt.length-1]:null;
    const t0=tyt.length?tyt[0]:null, a0=ayt.length?ayt[0]:null;
    const target=targets.find(x=>x.id===p.target_id)||null;
    const tNet=t?Number(t.total_net):null,aNet=a?Number(a.total_net):null;
    const tDiff=t&&t0?tNet-Number(t0.total_net):null,aDiff=a&&a0?aNet-Number(a0.total_net):null;
    const tGap=tNet!=null&&target?tNet-Number(target.target_tyt):null;
    const aGap=aNet!=null&&target?aNet-Number(target.target_ayt):null;
    const [stat,cls]=statusFor(tNet,aNet,target);
    if(stat==="HEDEFTE")onTarget++; else if(stat==="YAKIN")near++;

    chartRows.push({
      name:p.full_name,
      tyt:tNet, ayt:aNet,
      tytPct:tNet==null?null:(tNet/120)*100,
      aytPct:aNet==null?null:(aNet/80)*100
    });

    students.insertAdjacentHTML("beforeend",`<tr>
      <td><div class="student-name"><span class="avatar">${p.full_name.charAt(0).toUpperCase()}</span><b>${p.full_name}</b></div></td>
      <td><b>${fmt(tNet)}</b></td><td><b>${fmt(aNet)}</b></td>
      <td class="${tDiff==null?"":tDiff>=0?"positive":"negative"}">${signed(tDiff)}</td>
      <td class="${aDiff==null?"":aDiff>=0?"positive":"negative"}">${signed(aDiff)}</td>
      <td>${target?.university||"Hedef seçilmedi"}</td>
      <td class="${tGap==null?"":tGap>=0?"positive":"negative"}">${signed(tGap)}</td>
      <td class="${aGap==null?"":aGap>=0?"positive":"negative"}">${signed(aGap)}</td>
      <td><span class="badge ${cls}">${stat}</span></td>
    </tr>`);
  }

  if(!profiles.length){
    students.innerHTML=`<tr><td colspan="9" class="muted">Henüz görüntülenebilen öğrenci yok.</td></tr>`;
  }

  summary.innerHTML=`
    <div class="kpi"><span>Öğrenci</span><b>${profiles.length}</b><small>aktif takip</small></div>
    <div class="kpi accent-blue"><span>Toplam deneme</span><b>${exams.length}</b><small>TYT + AYT</small></div>
    <div class="kpi"><span>Hedefte</span><b class="positive">${onTarget}</b><small>baremin üzerinde</small></div>
    <div class="kpi"><span>Hedefe yakın</span><b>${near}</b><small>yakın takip</small></div>`;

  if(coachChart)coachChart.destroy();
  coachChart=new Chart(document.getElementById("coachChart"),{
    type:"bar",
    data:{
      labels:chartRows.map(x=>x.name),
      datasets:[
        {label:"TYT başarı %",data:chartRows.map(x=>x.tytPct),backgroundColor:"rgba(37,99,235,.78)",borderRadius:7,maxBarThickness:34},
        {label:"AYT başarı %",data:chartRows.map(x=>x.aytPct),backgroundColor:"rgba(217,119,6,.78)",borderRadius:7,maxBarThickness:34}
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      normalized:true,
      plugins:{
        legend:{labels:{usePointStyle:true,boxWidth:7,font:{size:11}}},
        tooltip:{callbacks:{label(ctx){
          const row=chartRows[ctx.dataIndex];
          const raw=ctx.datasetIndex===0?row.tyt:row.ayt;
          const type=ctx.datasetIndex===0?"TYT":"AYT";
          return `${type}: ${fmt(raw)} net • ${fmt(ctx.raw,1)}%`;
        }}}
      },
      scales:{
        y:{beginAtZero:true,max:100,grid:{color:"rgba(148,163,184,.13)"},ticks:{font:{size:10},callback:v=>v+"%"}},
        x:{grid:{display:false},ticks:{font:{size:11}}}
      }
    }
  });

  updatedAt.textContent=`Son güncelleme ${new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}`;
}

(async()=>{
  me=await requireRole("coach");
  if(!me)return;
  await load();

  supabaseClient.channel("coach-exams-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"exams"},()=>{
      window.clearTimeout(window.__refreshTimer);
      window.__refreshTimer=setTimeout(load,250);
    })
    .subscribe();
})();
