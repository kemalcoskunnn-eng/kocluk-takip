let me,detailTytChart,detailAytChart,detailTytSubjects,detailAytSubjects;
const RULES={TYT:["Türkçe","Sosyal","Matematik","Fen"],AYT:["Matematik","Edebiyat","Tarih-1","Coğrafya-1"]};
const signed=n=>n==null?"—":(n>=0?"+":"")+fmt(n);
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const shortDate=s=>{if(!s)return"";const [y,m,d]=s.split("-");return d+"."+m;};
const fullDate=s=>{if(!s)return"—";const [y,m,d]=s.split("-");return d+"."+m+"."+y;};
function trendInfo(list){
  const vals=list.map(x=>Number(x.total_net));
  const current=avg(vals.slice(-5));
  const previous=vals.length>5?avg(vals.slice(-10,-5)):null;
  return{current,previous,diff:current!=null&&previous!=null?current-previous:null,count:vals.length};
}
function totalChart(existing,canvas,exams,type,maxNet,target){
  const labels=exams.map(x=>shortDate(x.exam_date));
  const sets=[{label:type+" net",data:exams.map(x=>Number(x.total_net)),borderColor:type==="TYT"?"#2563eb":"#d97706",backgroundColor:type==="TYT"?"rgba(37,99,235,.08)":"rgba(217,119,6,.08)",borderWidth:2.5,pointRadius:4,tension:.22,fill:true}];
  if(target!=null)sets.push({label:"Hedef",data:exams.map(()=>Number(target)),borderColor:"#16a34a",borderDash:[6,5],borderWidth:1.5,pointRadius:0,fill:false});
  if(existing){existing.destroy();}
  return new Chart(canvas,{type:"line",data:{labels,datasets:sets},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{labels:{usePointStyle:true,boxWidth:8}}},scales:{y:{min:0,max:maxNet,grid:{color:"rgba(148,163,184,.13)"}},x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:10}}}}});
}
function subjectChart(existing,canvas,exams,type){
  if(existing)existing.destroy();
  if(!exams.length){canvas.parentElement.innerHTML='<div class="empty-progress">Henüz '+type+' verisi yok</div>';return null;}
  const labels=exams.map(x=>shortDate(x.exam_date));
  const names=RULES[type];
  const keys=["score_1","score_2","score_3","score_4"];
  const palettes=type==="TYT"?["#2563eb","#0f766e","#7c3aed","#0891b2"]:["#d97706","#dc2626","#9333ea","#65a30d"];
  const sets=keys.map((k,i)=>({label:names[i],data:exams.map(x=>Number(x[k])),borderColor:palettes[i],backgroundColor:"transparent",borderWidth:2,pointRadius:3,tension:.2,fill:false}));
  return new Chart(canvas,{type:"line",data:{labels,datasets:sets},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{labels:{usePointStyle:true,boxWidth:8,font:{size:10}}}},scales:{y:{grid:{color:"rgba(148,163,184,.12)"}},x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:10}}}}});
}
async function loadDetail(){
  const id=new URLSearchParams(location.search).get("id");
  if(!id){location.href="coach.html";return;}
  const [profileRes,examsRes,targetsRes]=await Promise.all([
    supabaseClient.from("profiles").select("*").eq("id",id).eq("role","student").single(),
    supabaseClient.from("exams").select("*").eq("student_id",id).order("exam_date",{ascending:true}).order("created_at",{ascending:true}),
    supabaseClient.from("law_targets").select("*").order("rank_ref")
  ]);
  if(profileRes.error||examsRes.error){console.error(profileRes.error||examsRes.error);location.href="coach.html";return;}
  const p=profileRes.data,exams=examsRes.data||[],targets=targetsRes.data||[];
  const target=targets.find(x=>x.id===p.target_id)||null;
  const tyt=exams.filter(x=>x.exam_type==="TYT"),ayt=exams.filter(x=>x.exam_type==="AYT");
  const t=tyt.length?tyt[tyt.length-1]:null,a=ayt.length?ayt[ayt.length-1]:null;
  const tTrend=trendInfo(tyt),aTrend=trendInfo(ayt);
  detailTitle.textContent=p.full_name+" — Öğrenci Detayı";
  detailSummary.innerHTML=
    '<div class="overview-metric tyt-metric"><span>Son TYT</span><b>'+(t?fmt(t.total_net):"Veri yok")+'</b><small>'+tyt.length+' TYT denemesi</small></div>' +
    '<div class="overview-metric ayt-metric"><span>Son AYT</span><b>'+(a?fmt(a.total_net):"Veri yok")+'</b><small>'+ayt.length+' AYT denemesi</small></div>' +
    '<div class="overview-metric"><span>Hedef</span><b class="detail-target-name">'+(target?.university||"Seçilmedi")+'</b><small>'+(target?"TYT "+fmt(target.target_tyt)+" • AYT "+fmt(target.target_ayt):"Hedef belirlenmedi")+'</small></div>' +
    '<div class="overview-metric"><span>Toplam kayıt</span><b>'+exams.length+'</b><small>Tüm denemeler</small></div>';
  function trendCard(label,tr){
    const cls=tr.diff==null?"":tr.diff>=0?"positive":"negative";
    return '<div class="trend-card"><span>'+label+' trendi</span><b>'+(tr.current==null?"—":fmt(tr.current))+'</b><small>Son 5 ortalama</small><div class="trend-diff '+cls+'">'+(tr.diff==null?"Önceki 5 için yeterli veri yok":"Önceki 5 ortalamaya göre "+signed(tr.diff)+" net")+'</div></div>';
  }
  trendCards.innerHTML=trendCard("TYT",tTrend)+trendCard("AYT",aTrend);
  detailTytChart=totalChart(detailTytChart,document.getElementById("detailTytChart"),tyt,"TYT",120,target?.target_tyt??null);
  detailAytChart=totalChart(detailAytChart,document.getElementById("detailAytChart"),ayt,"AYT",80,target?.target_ayt??null);
  detailTytSubjects=subjectChart(detailTytSubjects,document.getElementById("detailTytSubjects"),tyt,"TYT");
  detailAytSubjects=subjectChart(detailAytSubjects,document.getElementById("detailAytSubjects"),ayt,"AYT");
  const prev={TYT:null,AYT:null};
  detailRows.innerHTML="";
  exams.slice().reverse().forEach(x=>{
    const same=exams.filter(y=>y.exam_type===x.exam_type&&((y.exam_date<x.exam_date)||(y.exam_date===x.exam_date&&y.created_at<x.created_at)));
    const pex=same.length?same[same.length-1]:null;
    const diff=pex?Number(x.total_net)-Number(pex.total_net):null;
    detailRows.insertAdjacentHTML("beforeend",'<tr><td>'+fullDate(x.exam_date)+'</td><td><span class="type-chip '+x.exam_type.toLowerCase()+'">'+x.exam_type+'</span></td><td>'+(x.exam_name||"—")+'</td><td><b>'+fmt(x.total_net)+'</b></td><td class="'+(diff==null?"":diff>=0?"positive":"negative")+'">'+signed(diff)+'</td><td>'+(x.note||"—")+'</td></tr>');
  });
  if(!exams.length)detailRows.innerHTML='<tr><td colspan="6" class="muted">Henüz deneme kaydı yok.</td></tr>';
  detailExamCount.textContent=exams.length+" kayıt";
}
(async()=>{me=await requireRole("coach");if(!me)return;await loadDetail();})();