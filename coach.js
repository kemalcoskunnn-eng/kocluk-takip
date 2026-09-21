let me;

function statusFor(tyt,ayt,target){
  if(!target)return["HEDEF SEÇİLMEDİ","mid"];
  if(tyt==null||ayt==null)return["VERİ BEKLENİYOR","mid"];
  if(tyt>=target.target_tyt&&ayt>=target.target_ayt)return["HEDEFTE","good"];
  if(tyt>=target.target_tyt-5&&ayt>=target.target_ayt-4)return["YAKIN","mid"];
  return["GELİŞİM GEREKLİ","bad"];
}
const signed=n=>n==null?"—":`${n>=0?"+":""}${fmt(n)}`;
const latest=a=>a.length?a[a.length-1]:null;
const previous=a=>a.length>1?a[a.length-2]:null;

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

  let onTarget=0,near=0;
  students.innerHTML="";
  studentCards.innerHTML="";

  for(const p of profiles){
    const e=examsByStudent.get(p.id)||[];
    const tyt=e.filter(x=>x.exam_type==="TYT");
    const ayt=e.filter(x=>x.exam_type==="AYT");

    const t=latest(tyt), a=latest(ayt);
    const tPrev=previous(tyt), aPrev=previous(ayt);
    const target=targets.find(x=>x.id===p.target_id)||null;

    const tNet=t?Number(t.total_net):null;
    const aNet=a?Number(a.total_net):null;
    const tDiff=t&&tPrev?tNet-Number(tPrev.total_net):null;
    const aDiff=a&&aPrev?aNet-Number(aPrev.total_net):null;
    const tStart=tyt.length>1?tNet-Number(tyt[0].total_net):null;
    const aStart=ayt.length>1?aNet-Number(ayt[0].total_net):null;
    const tGap=tNet!=null&&target?tNet-Number(target.target_tyt):null;
    const aGap=aNet!=null&&target?aNet-Number(target.target_ayt):null;
    const [stat,cls]=statusFor(tNet,aNet,target);

    if(stat==="HEDEFTE")onTarget++;
    else if(stat==="YAKIN")near++;

    studentCards.insertAdjacentHTML("beforeend",`
      <article class="student-summary-card">
        <div class="student-summary-head">
          <div class="student-name"><span class="avatar">${p.full_name.charAt(0).toUpperCase()}</span><b>${p.full_name}</b></div>
          <span class="badge ${cls}">${stat}</span>
        </div>
        <div class="student-score-grid">
          <div><span>TYT</span><b>${fmt(tNet)}</b><small class="${tDiff==null?"":tDiff>=0?"positive":"negative"}">önceki ${signed(tDiff)}</small></div>
          <div><span>AYT</span><b>${fmt(aNet)}</b><small class="${aDiff==null?"":aDiff>=0?"positive":"negative"}">önceki ${signed(aDiff)}</small></div>
        </div>
        <div class="student-meta">
          <span>Başlangıçtan TYT: <b class="${tStart==null?"":tStart>=0?"positive":"negative"}">${signed(tStart)}</b></span>
          <span>Başlangıçtan AYT: <b class="${aStart==null?"":aStart>=0?"positive":"negative"}">${signed(aStart)}</b></span>
        </div>
        <div class="student-target">
          <span>Hedef</span><b>${target?.university||"Henüz seçilmedi"}</b>
        </div>
      </article>
    `);

    students.insertAdjacentHTML("beforeend",`<tr>
      <td><div class="student-name"><span class="avatar">${p.full_name.charAt(0).toUpperCase()}</span><b>${p.full_name}</b></div></td>
      <td><b>${fmt(tNet)}</b></td><td><b>${fmt(aNet)}</b></td>
      <td class="${tDiff==null?"":tDiff>=0?"positive":"negative"}">${signed(tDiff)}</td>
      <td class="${aDiff==null?"":aDiff>=0?"positive":"negative"}">${signed(aDiff)}</td>
      <td>${target?.university||"Henüz seçilmedi"}</td>
      <td class="${tGap==null?"":tGap>=0?"positive":"negative"}">${signed(tGap)}</td>
      <td class="${aGap==null?"":aGap>=0?"positive":"negative"}">${signed(aGap)}</td>
      <td><span class="badge ${cls}">${stat}</span></td>
    </tr>`);
  }

  if(!profiles.length){
    students.innerHTML=`<tr><td colspan="9" class="muted">Henüz görüntülenebilen öğrenci yok.</td></tr>`;
    studentCards.innerHTML=`<p class="muted">Henüz öğrenci yok.</p>`;
  }

  summary.innerHTML=`
    <div class="kpi"><span>Öğrenci</span><b>${profiles.length}</b><small>aktif takip</small></div>
    <div class="kpi accent-blue"><span>Toplam deneme</span><b>${exams.length}</b><small>TYT + AYT</small></div>
    <div class="kpi"><span>Hedefte</span><b class="positive">${onTarget}</b><small>baremin üzerinde</small></div>
    <div class="kpi"><span>Hedefe yakın</span><b>${near}</b><small>yakın takip</small></div>`;

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
