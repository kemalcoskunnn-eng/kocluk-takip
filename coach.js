let me,coachChart;

function statusFor(tyt,ayt,target){
  if(tyt==null||ayt==null||!target)return["VERİ BEKLENİYOR","mid"];
  if(tyt>=target.target_tyt&&ayt>=target.target_ayt)return["HEDEFTE","good"];
  if(tyt>=target.target_tyt-5&&ayt>=target.target_ayt-4)return["YAKIN","mid"];
  return["GELİŞİM GEREKLİ","bad"];
}
const signed=n=>n==null?"—":`${n>=0?"+":""}${fmt(n)}`;

async function load(){
  const [{data:profiles},{data:exams},{data:targets}]=await Promise.all([
    supabaseClient.from("profiles").select("*").eq("role","student").order("full_name"),
    supabaseClient.from("exams").select("*").order("exam_date",{ascending:true}).order("created_at",{ascending:true}),
    supabaseClient.from("law_targets").select("*").order("rank_ref")
  ]);

  const rows=[];
  let onTarget=0,near=0;
  students.innerHTML="";

  for(const p of profiles||[]){
    const e=(exams||[]).filter(x=>x.student_id===p.id);
    const latest=t=>[...e].reverse().find(x=>x.exam_type===t);
    const first=t=>e.find(x=>x.exam_type===t);
    const t=latest("TYT"),a=latest("AYT"),t0=first("TYT"),a0=first("AYT");
    const target=(targets||[]).find(x=>x.id===p.target_id)||(targets||[])[0]||null;
    const tNet=t?Number(t.total_net):null,aNet=a?Number(a.total_net):null;
    const tDiff=t&&t0?tNet-Number(t0.total_net):null,aDiff=a&&a0?aNet-Number(a0.total_net):null;
    const tGap=tNet!=null&&target?tNet-Number(target.target_tyt):null;
    const aGap=aNet!=null&&target?aNet-Number(target.target_ayt):null;
    const [stat,cls]=statusFor(tNet,aNet,target);
    if(stat==="HEDEFTE")onTarget++; else if(stat==="YAKIN")near++;

    rows.push({name:p.full_name,tyt:tNet,ayt:aNet});
    students.insertAdjacentHTML("beforeend",`<tr>
      <td><div class="student-name"><span class="avatar">${p.full_name.charAt(0).toUpperCase()}</span><b>${p.full_name}</b></div></td>
      <td><b>${fmt(tNet)}</b></td><td><b>${fmt(aNet)}</b></td>
      <td class="${tDiff==null?"":tDiff>=0?"positive":"negative"}">${signed(tDiff)}</td>
      <td class="${aDiff==null?"":aDiff>=0?"positive":"negative"}">${signed(aDiff)}</td>
      <td>${target?.university||"—"}</td>
      <td class="${tGap==null?"":tGap>=0?"positive":"negative"}">${signed(tGap)}</td>
      <td class="${aGap==null?"":aGap>=0?"positive":"negative"}">${signed(aGap)}</td>
      <td><span class="badge ${cls}">${stat}</span></td>
    </tr>`);
  }

  summary.innerHTML=`
    <div class="kpi"><span>Öğrenci</span><b>${profiles?.length||0}</b><small>aktif takip</small></div>
    <div class="kpi accent-blue"><span>Toplam deneme</span><b>${exams?.length||0}</b><small>TYT + AYT</small></div>
    <div class="kpi"><span>Hedefte</span><b class="positive">${onTarget}</b><small>baremin üzerinde</small></div>
    <div class="kpi"><span>Hedefe yakın</span><b>${near}</b><small>yakın takip</small></div>`;

  if(coachChart)coachChart.destroy();
  coachChart=new Chart(document.getElementById("coachChart"),{
    type:"bar",
    data:{labels:rows.map(x=>x.name),datasets:[
      {label:"TYT",data:rows.map(x=>x.tyt),backgroundColor:"rgba(37,99,235,.78)",borderRadius:8},
      {label:"AYT",data:rows.map(x=>x.ayt),backgroundColor:"rgba(217,119,6,.78)",borderRadius:8}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{usePointStyle:true,boxWidth:8}}},scales:{y:{beginAtZero:true,grid:{color:"rgba(148,163,184,.16)"}},x:{grid:{display:false}}}}
  });
  updatedAt.textContent=`Son güncelleme ${new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}`;
}

(async()=>{
  me=await requireRole("coach");if(!me)return;
  await load();
  supabaseClient.channel("coach-exams-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"exams"},async()=>{await load()})
    .subscribe();
})();
