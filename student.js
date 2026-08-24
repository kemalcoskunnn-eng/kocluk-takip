let me,chart;
function labelsFor(type){
 const names=type==="TYT"?["Türkçe","Sosyal","Matematik","Fen"]:["Matematik","Edebiyat","Tarih-1","Coğrafya-1"];
 ["l1","l2","l3","l4"].forEach((id,i)=>{document.getElementById(id).firstChild.nodeValue=names[i];});
}
exam_type.addEventListener("change",()=>labelsFor(exam_type.value));
async function loadExams(){
 const {data}=await supabaseClient.from("exams").select("*").eq("student_id",me.session.user.id).order("exam_date",{ascending:true}).order("created_at",{ascending:true});
 const exams=data||[];rows.innerHTML="";const prev={};
 exams.forEach(x=>{const diff=prev[x.exam_type]==null?null:x.total_net-prev[x.exam_type];prev[x.exam_type]=x.total_net;
 rows.insertAdjacentHTML("beforeend",`<tr><td>${x.exam_date}</td><td>${x.exam_type}</td><td>${x.exam_name||""}</td><td>${fmt(x.total_net)}</td><td>${diff==null?"—":(diff>=0?"+":"")+fmt(diff)}</td></tr>`);});
 const latest=t=>[...exams].reverse().find(x=>x.exam_type===t),first=t=>exams.find(x=>x.exam_type===t);
 const t=latest("TYT"),a=latest("AYT"),t0=first("TYT"),a0=first("AYT");
 kpis.innerHTML=`<div class="kpi">Son TYT<b>${fmt(t?.total_net)}</b></div><div class="kpi">Son AYT<b>${fmt(a?.total_net)}</b></div><div class="kpi">TYT gelişim<b>${t0&&t?fmt(t.total_net-t0.total_net):"—"}</b></div><div class="kpi">AYT gelişim<b>${a0&&a?fmt(a.total_net-a0.total_net):"—"}</b></div>`;
 if(chart)chart.destroy();chart=new Chart(document.getElementById("chart"),{type:"line",data:{labels:exams.map((x,i)=>`${x.exam_type} ${i+1}`),datasets:[{label:"Toplam net",data:exams.map(x=>x.total_net)}]},options:{responsive:true,maintainAspectRatio:false}});
}
(async()=>{me=await requireRole("student");if(!me)return;title.textContent=`${me.profile.full_name} — Deneme Takibi`;labelsFor("TYT");await loadExams();})();
examForm.addEventListener("submit",async(e)=>{e.preventDefault();const vals=[s1,s2,s3,s4].map(x=>Number(x.value||0));const total=vals.reduce((a,b)=>a+b,0);
 const {error}=await supabaseClient.from("exams").insert({student_id:me.session.user.id,exam_type:exam_type.value,exam_date:exam_date.value,exam_name:exam_name.value,score_1:vals[0],score_2:vals[1],score_3:vals[2],score_4:vals[3],total_net:total,note:note.value});
 if(error){alert(error.message);return;}examForm.reset();labelsFor("TYT");await loadExams();});
