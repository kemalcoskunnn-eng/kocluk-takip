let me;
const progressCharts=new Map();

function statusFor(tyt,ayt,target){
  if(!target)return["HEDEF SEÇİLMEDİ","mid"];
  if(tyt==null||ayt==null)return["VERİ BEKLENİYOR","mid"];
  if(tyt>=target.target_tyt&&ayt>=target.target_ayt)return["HEDEFTE","good"];
  if(tyt>=target.target_tyt-5&&ayt>=target.target_ayt-4)return["YAKIN","mid"];
  return["GELİŞİM GEREKLİ","bad"];
}
const signed=n=>n==null?"—":(n>=0?"+":"")+fmt(n);
const latest=a=>a.length?a[a.length-1]:null;
const previous=a=>a.length>1?a[a.length-2]:null;
const shortDate=s=>{if(!s)return"";const [y,m,d]=s.split("-");return d+"."+m;};
const fullDate=s=>{if(!s)return"—";const [y,m,d]=s.split("-");return d+"."+m+"."+y;};

function buildProgressChart(canvasId, exams){
  const old=progressCharts.get(canvasId);
  if(old){old.destroy();progressCharts.delete(canvasId);}
  const canvas=document.getElementById(canvasId);
  if(!canvas)return;
  const ordered=exams.slice().sort((a,b)=>a.exam_date.localeCompare(b.exam_date)||a.created_at.localeCompare(b.created_at));
  if(!ordered.length){canvas.parentElement.innerHTML='<div class="empty-progress">Henüz deneme verisi yok</div>';return;}
  const labels=ordered.map(x=>shortDate(x.exam_date));
  const tytData=ordered.map(x=>x.exam_type==="TYT"?Number(x.total_net):null);
  const aytData=ordered.map(x=>x.exam_type==="AYT"?Number(x.total_net):null);
  const chart=new Chart(canvas,{
    type:"line",
    data:{labels,datasets:[
      {label:"TYT",data:tytData,borderColor:"#2563eb",backgroundColor:"rgba(37,99,235,.08)",borderWidth:2.3,pointRadius:3,pointHoverRadius:5,tension:.22,spanGaps:true},
      {label:"AYT",data:aytData,borderColor:"#d97706",backgroundColor:"rgba(217,119,6,.08)",borderWidth:2.3,pointRadius:3,pointHoverRadius:5,tension:.22,spanGaps:true}
    ]},
    options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{
      legend:{labels:{usePointStyle:true,boxWidth:7,font:{size:10}}},
      tooltip:{callbacks:{label(ctx){const exam=ordered[ctx.dataIndex];return exam&&ctx.raw!=null?exam.exam_type+": "+fmt(exam.total_net)+" net":"";}}}
    },scales:{y:{min:0,max:120,ticks:{font:{size:9}},grid:{color:"rgba(148,163,184,.12)"}},x:{ticks:{font:{size:9},maxRotation:0},grid:{display:false}}}}
  });
  progressCharts.set(canvasId,chart);
}

async function load(){
  const [profilesRes,examsRes,targetsRes]=await Promise.all([
    supabaseClient.from("profiles").select("*").eq("role","student").order("full_name"),
    supabaseClient.from("exams").select("*").order("exam_date",{ascending:true}).order("created_at",{ascending:true}),
    supabaseClient.from("law_targets").select("*").order("rank_ref")
  ]);
  const firstError=profilesRes.error||examsRes.error||targetsRes.error;
  if(firstError){summary.innerHTML='<div class="card"><b>Veriler yüklenemedi.</b></div>';console.error(firstError);return;}
  const profiles=profilesRes.data||[],exams=examsRes.data||[],targets=targetsRes.data||[];
  const examsByStudent=new Map();
  exams.forEach(x=>{if(!examsByStudent.has(x.student_id))examsByStudent.set(x.student_id,[]);examsByStudent.get(x.student_id).push(x);});
  let onTarget=0,near=0;
  students.innerHTML="";studentCards.innerHTML="";
  for(const p of profiles){
    const e=(examsByStudent.get(p.id)||[]).slice().sort((a,b)=>a.exam_date.localeCompare(b.exam_date)||a.created_at.localeCompare(b.created_at));
    const tyt=e.filter(x=>x.exam_type==="TYT"),ayt=e.filter(x=>x.exam_type==="AYT");
    const t=latest(tyt),a=latest(ayt),tp=previous(tyt),ap=previous(ayt);
    const target=targets.find(x=>x.id===p.target_id)||null;
    const tNet=t?Number(t.total_net):null,aNet=a?Number(a.total_net):null;
    const tDiff=t&&tp?tNet-Number(tp.total_net):null,aDiff=a&&ap?aNet-Number(ap.total_net):null;
    const tStart=tyt.length>1?tNet-Number(tyt[0].total_net):null,aStart=ayt.length>1?aNet-Number(ayt[0].total_net):null;
    const tGap=tNet!=null&&target?tNet-Number(target.target_tyt):null,aGap=aNet!=null&&target?aNet-Number(target.target_ayt):null;
    const [stat,cls]=statusFor(tNet,aNet,target);if(stat==="HEDEFTE")onTarget++;else if(stat==="YAKIN")near++;
    const safeId=p.id.replace(/[^a-zA-Z0-9_-]/g,""),canvasId="progress-"+safeId;
    const previousByType={TYT:null,AYT:null},diffMap=new Map();
    e.forEach(exam=>{const prev=previousByType[exam.exam_type];diffMap.set(exam.id,prev==null?null:Number(exam.total_net)-prev);previousByType[exam.exam_type]=Number(exam.total_net);});
    const historyRows=e.length?e.slice().reverse().map(exam=>{const diff=diffMap.get(exam.id);return '<tr><td>'+fullDate(exam.exam_date)+'</td><td><span class="type-chip '+exam.exam_type.toLowerCase()+'">'+exam.exam_type+'</span></td><td>'+(exam.exam_name||"—")+'</td><td><b>'+fmt(exam.total_net)+'</b></td><td class="'+(diff==null?"":diff>=0?"positive":"negative")+'">'+signed(diff)+'</td></tr>';}).join(""):'<tr><td colspan="5" class="muted">Henüz deneme kaydı yok.</td></tr>';
    const detailUrl="detail.html?id="+encodeURIComponent(p.id);
    studentCards.insertAdjacentHTML("beforeend",
      '<article class="student-summary-card">' +
      '<div class="student-summary-head"><a class="student-name student-link" href="'+detailUrl+'"><span class="avatar">'+p.full_name.charAt(0).toUpperCase()+'</span><b>'+p.full_name+'</b></a><div class="student-card-actions"><a class="detail-button" href="'+detailUrl+'">Detay</a><span class="badge '+cls+'">'+stat+'</span></div></div>' +
      '<div class="latest-net-row"><div class="latest-net tyt-latest"><span>SON TYT</span><b>'+(tNet==null?"Veri yok":fmt(tNet))+'</b><small class="'+(tDiff==null?"":tDiff>=0?"positive":"negative")+'">'+(tDiff==null?"Önceki veri yok":"Öncekiye göre "+signed(tDiff))+'</small></div>' +
      '<div class="latest-net ayt-latest"><span>SON AYT</span><b>'+(aNet==null?"Veri yok":fmt(aNet))+'</b><small class="'+(aDiff==null?"":aDiff>=0?"positive":"negative")+'">'+(aDiff==null?"Önceki veri yok":"Öncekiye göre "+signed(aDiff))+'</small></div></div>' +
      '<div class="personal-chart-head"><span>Kişisel gelişim</span><small>TYT / AYT net gelişimi</small></div><div class="personal-chart-wrap"><canvas id="'+canvasId+'"></canvas></div>' +
      '<div class="student-meta"><span>Başlangıçtan TYT: <b class="'+(tStart==null?"":tStart>=0?"positive":"negative")+'">'+signed(tStart)+'</b></span><span>Başlangıçtan AYT: <b class="'+(aStart==null?"":aStart>=0?"positive":"negative")+'">'+signed(aStart)+'</b></span></div>' +
      '<div class="student-target"><span>Hedef</span><b>'+(target?.university||"Henüz seçilmedi")+'</b></div>' +
      '<div class="history-title"><div><span class="eyebrow">Deneme geçmişi</span><h3>Tüm denemeler</h3></div><span class="pill">'+e.length+' kayıt</span></div>' +
      '<div class="table-wrap compact-history"><table><thead><tr><th>Tarih</th><th>Tür</th><th>Deneme</th><th>Net</th><th>Önceki +/-</th></tr></thead><tbody>'+historyRows+'</tbody></table></div></article>'
    );
    students.insertAdjacentHTML("beforeend",'<tr><td><a class="student-name student-link" href="'+detailUrl+'"><span class="avatar">'+p.full_name.charAt(0).toUpperCase()+'</span><b>'+p.full_name+'</b></a></td><td><b>'+(tNet==null?"Veri yok":fmt(tNet))+'</b></td><td><b>'+(aNet==null?"Veri yok":fmt(aNet))+'</b></td><td class="'+(tDiff==null?"":tDiff>=0?"positive":"negative")+'">'+signed(tDiff)+'</td><td class="'+(aDiff==null?"":aDiff>=0?"positive":"negative")+'">'+signed(aDiff)+'</td><td>'+(target?.university||"Henüz seçilmedi")+'</td><td class="'+(tGap==null?"":tGap>=0?"positive":"negative")+'">'+signed(tGap)+'</td><td class="'+(aGap==null?"":aGap>=0?"positive":"negative")+'">'+signed(aGap)+'</td><td><span class="badge '+cls+'">'+stat+'</span></td></tr>');
    setTimeout(()=>buildProgressChart(canvasId,e),0);
  }
  if(!profiles.length){students.innerHTML='<tr><td colspan="9" class="muted">Henüz öğrenci yok.</td></tr>';studentCards.innerHTML='<p class="muted">Henüz öğrenci yok.</p>';}
  summary.innerHTML='<div class="kpi"><span>Öğrenci</span><b>'+profiles.length+'</b><small>aktif takip</small></div><div class="kpi accent-blue"><span>Toplam deneme</span><b>'+exams.length+'</b><small>TYT + AYT</small></div><div class="kpi"><span>Hedefte</span><b class="positive">'+onTarget+'</b><small>baremin üzerinde</small></div><div class="kpi"><span>Hedefe yakın</span><b>'+near+'</b><small>yakın takip</small></div>';
  updatedAt.textContent="Son güncelleme "+new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
}

(async()=>{me=await requireRole("coach");if(!me)return;await load();supabaseClient.channel("coach-exams-live").on("postgres_changes",{event:"*",schema:"public",table:"exams"},()=>{clearTimeout(window.__refreshTimer);window.__refreshTimer=setTimeout(load,250);}).subscribe();})();