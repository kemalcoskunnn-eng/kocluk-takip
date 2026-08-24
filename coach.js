let me;
function statusFor(tyt,ayt,target){if(tyt==null||ayt==null||!target)return["VERİ BEKLENİYOR","mid"];if(tyt>=target.target_tyt&&ayt>=target.target_ayt)return["HEDEFTE","good"];if(tyt>=target.target_tyt-5&&ayt>=target.target_ayt-4)return["YAKIN","mid"];return["GELİŞİM GEREKLİ","bad"];}
async function load(){
 const [{data:profiles},{data:exams},{data:targets}]=await Promise.all([supabaseClient.from("profiles").select("*").eq("role","student").order("full_name"),supabaseClient.from("exams").select("*").order("exam_date",{ascending:true}).order("created_at",{ascending:true}),supabaseClient.from("law_targets").select("*").order("rank_ref")]);
 students.innerHTML="";let onTarget=0;
 for(const p of profiles||[]){const e=(exams||[]).filter(x=>x.student_id===p.id);const latest=t=>[...e].reverse().find(x=>x.exam_type===t),first=t=>e.find(x=>x.exam_type===t);const t=latest("TYT"),a=latest("AYT"),t0=first("TYT"),a0=first("AYT");const target=(targets||[]).find(x=>x.id===p.target_id)||(targets||[])[0];const [stat,cls]=statusFor(t?.total_net,a?.total_net,target);if(stat==="HEDEFTE")onTarget++;
 students.insertAdjacentHTML("beforeend",`<tr><td><b>${p.full_name}</b></td><td>${fmt(t?.total_net)}</td><td>${fmt(a?.total_net)}</td><td>${t0&&t?fmt(t.total_net-t0.total_net):"—"}</td><td>${a0&&a?fmt(a.total_net-a0.total_net):"—"}</td><td>${target?.university||"—"}</td><td>${fmt(target?.target_tyt)}</td><td>${fmt(target?.target_ayt)}</td><td><span class="badge ${cls}">${stat}</span></td></tr>`);}
 summary.innerHTML=`<div class="kpi">Öğrenci<b>${profiles?.length||0}</b></div><div class="kpi">Toplam deneme<b>${exams?.length||0}</b></div><div class="kpi">Hedefte<b>${onTarget}</b></div>`;
}
(async()=>{me=await requireRole("coach");if(!me)return;await load();supabaseClient.channel("coach-exams-live").on("postgres_changes",{event:"*",schema:"public",table:"exams"},async()=>{await load()}).subscribe();})();
