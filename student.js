let me, tytChart, aytChart, tytSubjectsChart, aytSubjectsChart, examChannel;

const EXAM_RULES={
  TYT:[
    {name:"Türkçe",min:-10,max:40},
    {name:"Sosyal",min:-5,max:20},
    {name:"Matematik",min:-10,max:40},
    {name:"Fen",min:-5,max:20}
  ],
  AYT:[
    {name:"Matematik",min:-10,max:40},
    {name:"Edebiyat",min:-6,max:24},
    {name:"Tarih-1",min:-2.5,max:10},
    {name:"Coğrafya-1",min:-1.5,max:6}
  ]
};

const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
const signed = n => n==null ? "—" : `${n>=0?"+":""}${fmt(n)}`;
const pct = (n,max) => n==null ? "—" : `${((Number(n)/max)*100).toFixed(1)}%`;
const shortDate=s=>{
  if(!s)return"";
  const [y,m,d]=s.split("-");
  return `${d}.${m}`;
};
const fullDate=s=>{
  if(!s)return"—";
  const [y,m,d]=s.split("-");
  return `${d}.${m}.${y}`;
};

function labelsFor(type){
  const rules=EXAM_RULES[type];
  ["l1","l2","l3","l4"].forEach((id,i)=>{
    const label=document.getElementById(id);
    const input=label.querySelector("input");
    label.firstChild.nodeValue=rules[i].name;
    input.min=rules[i].min;
    input.max=rules[i].max;
    input.step=".25";
    input.required=true;
    input.placeholder=`${rules[i].min} – ${rules[i].max}`;
  });
  updateTotalPreview();
}

function updateTotalPreview(){
  const vals=[s1,s2,s3,s4].map(x=>Number(x.value||0));
  totalPreview.textContent=fmt(vals.reduce((a,b)=>a+b,0));
}
exam_type.addEventListener("change",()=>labelsFor(exam_type.value));
[s1,s2,s3,s4].forEach(el=>el.addEventListener("input",updateTotalPreview));

function chartDataset(type, exams, targetNet){
  const mainColor=type==="TYT"?"#2563eb":"#d97706";
  const fillColor=type==="TYT"?"rgba(37,99,235,.08)":"rgba(217,119,6,.08)";
  const sets=[{
    label:`${type} net`,
    data:exams.map(x=>Number(x.total_net)),
    borderColor:mainColor,
    backgroundColor:fillColor,
    borderWidth:2.5,
    pointRadius:4,
    pointHoverRadius:6,
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
  const labels=exams.map(x=>shortDate(x.exam_date));
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
      interaction:{mode:"index",intersect:false},
      plugins:{
        legend:{display:true,labels:{usePointStyle:true,boxWidth:8}},
        tooltip:{callbacks:{title:items=>{
          const x=exams[items[0]?.dataIndex];
          return x?fullDate(x.exam_date):"";
        },label:c=>`${c.dataset.label}: ${fmt(c.raw)}`}}
      },
      scales:{
        y:{min:0,max:maxNet,grid:{color:"rgba(148,163,184,.13)"},ticks:{stepSize:type==="TYT"?20:10}},
        x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:8}}
      }
    }
  });
}

function trendInfo(list){
  const vals=list.map(x=>Number(x.total_net));
  const current=avg(vals.slice(-5));
  const previous=vals.length>5?avg(vals.slice(-10,-5)):null;
  return{current,previous,diff:current!=null&&previous!=null?current-previous:null};
}

function renderTrendCards(tyt,ayt){
  const make=(label,tr)=>{
    const cls=tr.diff==null?"":tr.diff>=0?"positive":"negative";
    return `<div class="trend-card"><span>${label} trendi</span><b>${tr.current==null?"—":fmt(tr.current)}</b><small>Son 5 ortalama</small><div class="trend-diff ${cls}">${tr.diff==null?"Önceki 5 için yeterli veri yok":`Önceki 5 ortalamaya göre ${signed(tr.diff)} net`}</div></div>`;
  };
  studentTrendCards.innerHTML=make("TYT",trendInfo(tyt))+make("AYT",trendInfo(ayt));
}

function subjectChart(existing,canvas,exams,type){
  if(existing)existing.destroy();
  if(!exams.length){
    canvas.parentElement.innerHTML=`<div class="empty-progress">Henüz ${type} verisi yok</div>`;
    return null;
  }
  const names=EXAM_RULES[type].map(x=>x.name);
  const keys=["score_1","score_2","score_3","score_4"];
  const palettes=type==="TYT"?["#2563eb","#0f766e","#7c3aed","#0891b2"]:["#d97706","#dc2626","#9333ea","#65a30d"];
  return new Chart(canvas,{
    type:"line",
    data:{
      labels:exams.map(x=>shortDate(x.exam_date)),
      datasets:keys.map((k,i)=>({
        label:names[i],
        data:exams.map(x=>Number(x[k])),
        borderColor:palettes[i],
        backgroundColor:"transparent",
        borderWidth:2,
        pointRadius:3,
        tension:.2,
        fill:false
      }))
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      plugins:{legend:{labels:{usePointStyle:true,boxWidth:8,font:{size:10}}}},
      scales:{y:{grid:{color:"rgba(148,163,184,.12)"}},x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:8}}}
    }
  });
}



function pickMessage(list,key){
  if(!list.length)return"";
  let hash=0;
  for(const ch of String(key))hash=(hash*31+ch.charCodeAt(0))>>>0;
  return list[hash%list.length];
}

function renderMotivation(tyt,ayt,target){
  const all=[...tyt,...ayt].sort((a,b)=>a.exam_date.localeCompare(b.exam_date)||a.created_at.localeCompare(b.created_at));
  const todayKey=new Date().toISOString().slice(0,10);

  if(!all.length){
    const titles=[
      "İlk denemeni gir, gelişimin görünmeye başlasın.",
      "Başlangıç noktanı görmek için ilk deneme yeterli.",
      "İlk veri geldikten sonra gelişimi net biçimde takip edebiliriz.",
      "Bugün sadece ilk adımı atman yeterli: bir deneme kaydet.",
      "Gelişim grafiği ilk denemeyle başlıyor.",
      "İlk sonuç, sonraki ilerlemenin referans noktası olacak."
    ];
    const subs=[
      "Önemli olan kusursuz başlamak değil, düzenli veri oluşturmak.",
      "Biriken her deneme, neyin işe yaradığını daha görünür hale getirir.",
      "Düzenli kayıt, gerçek gelişimi tahminden ayırır.",
      "İlk sonuçtan sonra hangi dersin daha hızlı ilerlediğini görebileceksin.",
      "Tek bir veri bile başlangıç çizgisini belirlemek için yeterli.",
      "Sonraki denemeler geldikçe trend çok daha anlamlı hale gelecek."
    ];
    motivationBanner.innerHTML=`<div><span class="motivation-kicker">Bugünkü odak</span><b>${pickMessage(titles,todayKey+"t")}</b><small>${pickMessage(subs,todayKey+"s")}</small></div>`;
    return;
  }

  const latestExam=all[all.length-1];
  const same=latestExam.exam_type==="TYT"?tyt:ayt;
  const prev=same.length>1?same[same.length-2]:null;
  const diff=prev?Number(latestExam.total_net)-Number(prev.total_net):null;
  const key=(me?.profile?.full_name||"student")+"-"+latestExam.exam_date+"-"+todayKey+"-"+latestExam.exam_type;

  let titles=[],subs=[];

  if(diff!=null&&diff>=5){
    titles=[
      `Son ${latestExam.exam_type} denemende ${fmt(diff)} net yükseldin.`,
      `${latestExam.exam_type} tarafında güçlü bir sıçrama var: +${fmt(diff)} net.`,
      `Son denemede net artışı belirgin: +${fmt(diff)}.`,
      `Bu denemede öncekinin ${fmt(diff)} net üstündesin.`,
      `Son sonuçta ciddi ilerleme var: +${fmt(diff)} net.`,
      `${latestExam.exam_type} performansında net bir yükseliş yakaladın.`,
      `Son deneme, önceki sonuca göre güçlü bir gelişim gösteriyor.`,
      `Net çizgin yukarı dönmüş durumda: +${fmt(diff)}.`
    ];
    subs=[
      "Bu sıçramayı kalıcı hale getirmek için aynı çalışma düzenini koru.",
      "Şimdi önemli olan bu seviyeyi sonraki denemede de tekrar edebilmek.",
      "Hangi derslerin bu artışı getirdiğine bakıp aynı modeli sürdür.",
      "Bu gelişimi tek denemelik bırakmadan istikrara çevirmeye odaklan.",
      "Artışın kaynağını bulursan aynı kazanımı tekrar etmek daha kolay olur.",
      "Sonuç iyi; bir sonraki hedef bu bandı korumak.",
      "İyi giden dersleri korurken geride kalan tek bir alanı iyileştirmek yeterli olabilir.",
      "Yükselişi devam ettirmek için son haftadaki çalışma düzenini not et."
    ];
  }else if(diff!=null&&diff>0){
    titles=[
      `İlerleme devam ediyor: +${fmt(diff)} net.`,
      `Son denemede küçük ama değerli bir artış var.`,
      `Önceki denemenin üstüne ${fmt(diff)} net koydun.`,
      `Net çizgisi doğru yönde hareket ediyor.`,
      `Sonuç önceki denemeye göre daha iyi: +${fmt(diff)}.`,
      `Küçük artışlar birikiyor; bu da trendi yukarı taşıyor.`,
      `Son ${latestExam.exam_type} sonucunda pozitif hareket var.`,
      `Netin yine bir miktar yükselmiş durumda.`
    ];
    subs=[
      "Küçük artışlar birikince büyük sıralama farkı yaratır.",
      "Bu tempoyu korumak, tek seferde büyük sıçramadan daha değerlidir.",
      "İstikrarlı küçük kazanımlar uzun vadede daha güçlü sonuç verir.",
      "Bir sonraki denemede aynı seviyeyi korumak ilk hedef olsun.",
      "Hangi dersten gelen artış olduğunu kontrol etmek faydalı olur.",
      "Trend pozitif; şimdi bunu birkaç deneme üst üste sürdürmek önemli.",
      "İyi giden kısmı koruyup tek bir zayıf noktaya odaklanabilirsin.",
      "Bu artış küçük görünse de doğru yönde ilerlediğini gösteriyor."
    ];
  }else if(diff===0){
    titles=[
      "Netin sabit kaldı; bu da bir veri.",
      "Son iki deneme aynı seviyede.",
      "Performans çizgin şu an yatay.",
      "Bu denemede net değişmedi.",
      "Sonuç aynı bantta kalmış.",
      "İki deneme arasında belirgin fark yok.",
      "Net seviyen şimdilik sabit.",
      "Son deneme öncekiyle aynı noktada."
    ];
    subs=[
      "Bir sonraki denemede tek bir zayıf dersi hedefleyerek kırılma yaratabilirsin.",
      "Bu noktada küçük bir ders bazlı iyileştirme fark yaratabilir.",
      "Yatay dönemler normal; önemli olan nerede takıldığını görmek.",
      "Bir sonraki adım, en çok net kaybettiren dersi belirlemek olabilir.",
      "Aynı seviyede kalmak bazen yeni yükselişten önceki geçiş dönemidir.",
      "Ders bazlı grafikte en durağan alanı seçip oraya yüklenebilirsin.",
      "Tek bir dersin +2 net artması bile toplam grafiği yukarı taşır.",
      "Şimdi toplam netten çok ders dağılımına bakmak daha faydalı."
    ];
  }else if(diff!=null&&diff<0){
    const loss=fmt(Math.abs(diff));
    titles=[
      `Son deneme ${loss} net aşağıda.`,
      `Bu denemede ${loss} netlik geri çekilme var.`,
      `Sonuç önceki denemenin ${loss} net altında.`,
      `Net çizgisinde bu denemeye özel bir düşüş var.`,
      `Son ${latestExam.exam_type} sonucu biraz geride kaldı.`,
      `Bu denemede önceki seviyenin altında kaldın.`,
      `Sonuç aşağı geldi ama tek ölçümle trend değişmiş sayılmaz.`,
      `Bu denemede net kaybı var: -${loss}.`
    ];
    subs=[
      "Tek deneme trend değildir. Sonraki denemede hangi dersten geri geldiğini kontrol et.",
      "Önce ders bazlı kırılıma bak; düşüşün kaynağı genellikle tek iki alanda olur.",
      "Bu sonucu genellemek yerine bir sonraki denemeyi karşılaştırma noktası yap.",
      "Düşüşün hangi dersten geldiğini bulmak, toplam netten daha önemli.",
      "Dalgalanma normal; önemli olan aynı hatanın tekrar edip etmediği.",
      "Sonuçtan çok, neden düştüğünü bulmak bir sonraki artışı hızlandırır.",
      "Bir deneme kötü geçti diye genel performansın düşmüş sayılmaz.",
      "Ders grafiğinde en çok gerileyen alanı belirleyip küçük bir düzeltme yap."
    ];
  }else{
    titles=[
      "İlk veri geldi. Artık gelişimi ölçebiliriz.",
      "Başlangıç noktası belli oldu.",
      "İlk deneme kaydı tamamlandı.",
      "Artık karşılaştırma yapabileceğimiz bir referansın var.",
      "İlk sonuç sisteme işlendi.",
      "Gelişim grafiğinin ilk noktası oluştu."
    ];
    subs=[
      "İkinci denemeden sonra gerçek trendin oluşmaya başlayacak.",
      "Bir sonraki deneme ilk değişimi gösterecek.",
      "Şimdilik amaç aynı koşullarda ikinci veriyi oluşturmak.",
      "İkinci sonuç geldikten sonra ders bazlı farkları daha net okuyabiliriz.",
      "Düzenli kayıt geldikçe analiz daha anlamlı hale gelecek.",
      "Bir sonraki deneme, bu başlangıç seviyesinin üstüne ne koyduğunu gösterecek."
    ];
  }

  if(target&&target.target_tyt!=null&&target.target_ayt!=null){
    const t=tyt.length?Number(tyt[tyt.length-1].total_net):null;
    const a=ayt.length?Number(ayt[ayt.length-1].total_net):null;
    if(t!=null&&a!=null){
      const remain=Math.max(0,Number(target.target_tyt)-t)+Math.max(0,Number(target.target_ayt)-a);
      if(remain===0){
        titles=[
          `${target.university} hedef baremini yakaladın.`,
          `Hedef bareminin üzerindesin.`,
          `${target.university} için belirlenen net bandına ulaştın.`,
          `Hedef net seviyesi şu an yakalanmış durumda.`,
          `Toplam TYT/AYT hedef baremi tamamlandı.`
        ];
        subs=[
          "Şimdi amaç bunu tek denemelik değil, istikrarlı bir seviyeye çevirmek.",
          "Bir sonraki adım bu seviyeyi birkaç deneme boyunca koruyabilmek.",
          "Artık hedefe ulaşmaktan çok, hedef bandında kalmaya odaklan.",
          "Bu noktadan sonra istikrar en az net artışı kadar önemli.",
          "Seviyeyi korumak, hedefi yakalamak kadar değerli."
        ];
      }else if(remain<=10){
        titles=[
          `${target.university} hedefine çok yakınsın.`,
          `Hedefle aranda toplam yaklaşık ${fmt(remain)} net kaldı.`,
          `Hedef bandına girmene az kaldı.`,
          `Toplam net farkı artık tek haneli seviyeye yaklaştı.`,
          `${target.university} hedefi artık oldukça yakın.`,
          `Hedef baremine kalan mesafe yaklaşık ${fmt(remain)} net.`
        ];
        subs=[
          "Küçük kazanımlar artık çok değerli.",
          "Bu aşamada 1-2 netlik ders bazlı artışlar bile büyük fark yaratır.",
          "Hedefe yakınken istikrar ve hata azaltma daha önemli hale gelir.",
          "Şimdi en hızlı net gelebilecek dersi seçmek mantıklı olur.",
          "Büyük değişiklikten çok küçük ve güvenli artışlara odaklan.",
          "Son birkaç neti kapatmak için ders bazlı zayıf noktalar daha kritik."
        ];
      }
    }
  }

  motivationBanner.innerHTML=`<div><span class="motivation-kicker">Bugünkü odak</span><b>${pickMessage(titles,key+"t")}</b><small>${pickMessage(subs,key+"s")}</small></div>`;
}

function renderGoal(target,t,a){
  if(!target){
    goalCard.innerHTML='<div class="card-head"><div><span class="eyebrow">Hedef</span><h2>Üniversite / Bölüm hedefi</h2></div><span class="badge mid">HEDEF YOK</span></div><div class="empty-goal"><b>Henüz hedef belirlenmedi.</b><span>Koç hedef belirlediğinde burada hedefini ve ilerlemeni göreceksin.</span></div>';
    return;
  }
  const tNet=t?Number(t.total_net):null;
  const aNet=a?Number(a.total_net):null;
  const hasBenchmark=target.target_tyt!=null&&target.target_ayt!=null;
  const tTarget=hasBenchmark?Number(target.target_tyt):null;
  const aTarget=hasBenchmark?Number(target.target_ayt):null;
  if(!hasBenchmark){
    goalCard.innerHTML='<div class="card-head"><div><span class="eyebrow">Hedef</span><h2>'+target.university+'</h2></div><span class="pill">Hedef tanımlı</span></div><div class="empty-goal"><b>'+target.university+'</b><span>Bu hedef için TYT/AYT referans netleri henüz sisteme eklenmedi.</span></div>';
    return;
  }
  const tProgress=tNet==null?0:Math.max(0,Math.min(100,(tNet/tTarget)*100));
  const aProgress=aNet==null?0:Math.max(0,Math.min(100,(aNet/aTarget)*100));
  const tGap=tNet==null?null:tTarget-tNet;
  const aGap=aNet==null?null:aTarget-aNet;
  goalCard.innerHTML='<div class="card-head"><div><span class="eyebrow">Hedef</span><h2>'+target.university+'</h2></div><span class="pill">'+(target.rank_ref!=null?"Sıra referansı "+target.rank_ref:"Hedef tanımlı")+'</span></div>'+
    '<div class="goal-progress-row"><div class="goal-progress-item"><div class="goal-progress-label"><span>TYT</span><b>'+(tNet==null?"Veri yok":fmt(tNet))+' / '+fmt(tTarget)+'</b></div><div class="progress-track"><span style="width:'+tProgress+'%"></span></div><small>'+(tGap==null?"İlk TYT verisi bekleniyor":tGap<=0?"Hedef baremi geçildi":"Hedefe "+fmt(tGap)+" net kaldı")+'</small></div>'+
    '<div class="goal-progress-item"><div class="goal-progress-label"><span>AYT</span><b>'+(aNet==null?"Veri yok":fmt(aNet))+' / '+fmt(aTarget)+'</b></div><div class="progress-track amber"><span style="width:'+aProgress+'%"></span></div><small>'+(aGap==null?"İlk AYT verisi bekleniyor":aGap<=0?"Hedef baremi geçildi":"Hedefe "+fmt(aGap)+" net kaldı")+'</small></div></div>';
}
function renderBreakdown(exams){
  if(!exams.length){
    latestBreakdown.innerHTML=`
      <div class="card-head"><div><span class="eyebrow">Son deneme</span><h2>Ders dağılımı</h2></div></div>
      <div class="empty-goal"><b>Henüz deneme yok.</b><span>İlk denemeni kaydettiğinde ders dağılımın burada görünecek.</span></div>`;
    return;
  }
  const x=exams[exams.length-1];
  const rules=EXAM_RULES[x.exam_type];
  const scores=[x.score_1,x.score_2,x.score_3,x.score_4].map(Number);
  latestBreakdown.innerHTML=`
    <div class="card-head">
      <div><span class="eyebrow">Son deneme</span><h2>${x.exam_name||x.exam_type+" denemesi"}</h2></div>
      <span class="type-chip ${x.exam_type.toLowerCase()}">${x.exam_type} • ${fullDate(x.exam_date)}</span>
    </div>
    <div class="breakdown-total"><span>Toplam net</span><b>${fmt(x.total_net)}</b></div>
    <div class="subject-breakdown">
      ${rules.map((r,i)=>{
        const width=Math.max(0,Math.min(100,(scores[i]/r.max)*100));
        return `<div class="subject-row"><div><span>${r.name}</span><b>${fmt(scores[i])}</b></div><div class="subject-track"><span style="width:${width}%"></span></div></div>`;
      }).join("")}
    </div>`;
}

async function loadExams(){
  const [{data:examsData,error:examError},{data:targets,error:targetError}] = await Promise.all([
    supabaseClient.from("exams").select("*").eq("student_id",me.session.user.id).order("exam_date",{ascending:true}).order("created_at",{ascending:true}),
    supabaseClient.from("law_targets").select("*").order("rank_ref")
  ]);
  if(examError||targetError){
    console.error(examError||targetError);
    return;
  }

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
    rows.insertAdjacentHTML("beforeend",`<tr><td>${fullDate(x.exam_date)}</td><td><span class="type-chip ${x.exam_type.toLowerCase()}">${x.exam_type}</span></td><td>${x.exam_name||"—"}</td><td><b>${fmt(x.total_net)}</b></td><td class="${diff==null?"":diff>=0?"positive":"negative"}">${signed(diff)}</td><td>${pct(x.total_net,max)}</td></tr>`);
  });
  if(!exams.length)rows.innerHTML='<tr><td colspan="6" class="muted">Henüz deneme kaydı yok.</td></tr>';
  examCount.textContent=`${exams.length} deneme`;

  const latest=a=>a.length?a[a.length-1]:null;
  const best=a=>a.length?Math.max(...a.map(x=>Number(x.total_net))):null;
  const prev=a=>a.length>1?a[a.length-2]:null;
  const t=latest(tyt),a=latest(ayt),tp=prev(tyt),ap=prev(ayt);
  const tDiff=t&&tp?Number(t.total_net)-Number(tp.total_net):null;
  const aDiff=a&&ap?Number(a.total_net)-Number(ap.total_net):null;

  kpis.innerHTML=`
    <div class="overview-metric tyt-metric"><span>Son TYT</span><b>${t?fmt(t.total_net):"Veri yok"}</b><small class="${tDiff==null?"":tDiff>=0?"positive":"negative"}">${tDiff==null?"İlk veri bekleniyor":`Öncekiye göre ${signed(tDiff)}`}</small></div>
    <div class="overview-metric ayt-metric"><span>Son AYT</span><b>${a?fmt(a.total_net):"Veri yok"}</b><small class="${aDiff==null?"":aDiff>=0?"positive":"negative"}">${aDiff==null?"İlk veri bekleniyor":`Öncekiye göre ${signed(aDiff)}`}</small></div>
    <div class="overview-metric"><span>En iyi TYT</span><b>${best(tyt)==null?"—":fmt(best(tyt))}</b><small>${tyt.length} TYT denemesi</small></div>
    <div class="overview-metric"><span>En iyi AYT</span><b>${best(ayt)==null?"—":fmt(best(ayt))}</b><small>${ayt.length} AYT denemesi</small></div>`;

  renderMotivation(tyt,ayt,target);
  renderGoal(target,t,a);
  renderBreakdown(exams);
  renderTrendCards(tyt,ayt);

  tytSubjectsChart=subjectChart(tytSubjectsChart,document.getElementById("tytSubjectsChart"),tyt,"TYT");
  aytSubjectsChart=subjectChart(aytSubjectsChart,document.getElementById("aytSubjectsChart"),ayt,"AYT");

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
  const type=exam_type.value;
  const rules=EXAM_RULES[type];
  const inputs=[s1,s2,s3,s4];

  if(inputs.some(x=>x.value==="")){
    alert("Lütfen dört dersin netini de girin. Net 0 ise kutuya 0 yazın.");
    return;
  }

  const vals=inputs.map(x=>Number(x.value));
  for(let i=0;i<vals.length;i++){
    if(!Number.isFinite(vals[i])||vals[i]<rules[i].min||vals[i]>rules[i].max){
      alert(`${rules[i].name} neti ${rules[i].min} ile ${rules[i].max} arasında olmalı.`);
      inputs[i].focus();
      return;
    }
  }

  const total=vals.reduce((a,b)=>a+b,0);
  const maxTotal=type==="TYT"?120:80;
  if(total>maxTotal){
    alert(`${type} toplam neti ${maxTotal} değerini aşamaz.`);
    return;
  }

  const {error}=await supabaseClient.from("exams").insert({
    student_id:me.session.user.id,exam_type:type,exam_date:exam_date.value,exam_name:exam_name.value.trim(),
    score_1:vals[0],score_2:vals[1],score_3:vals[2],score_4:vals[3],total_net:total,note:note.value.trim()
  });
  if(error){alert(error.message);return;}

  examForm.reset();
  labelsFor("TYT");
  exam_date.valueAsDate=new Date();
  updateTotalPreview();
  await loadExams();
});
