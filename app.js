const cfg=window.APP_CONFIG;
const supabaseClient=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);

async function getSessionProfile(){
  const {data:{session},error:sessionError}=await supabaseClient.auth.getSession();
  if(sessionError)throw sessionError;
  if(!session)return{session:null,profile:null};

  const {data:profile,error:profileError}=await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id",session.user.id)
    .single();

  if(profileError)throw profileError;
  return{session,profile};
}

async function requireRole(role){
  try{
    let {session,profile}=await getSessionProfile();
    if(!session||!profile){location.href="index.html";return null;}

    if(profile.role!==role){
      location.href=profile.role==="coach"?"coach.html":"student.html";
      return null;
    }

    // Rol bilgisi app_metadata'da tutuluyor. Eski oturumların yeni claim'i alması için
    // özellikle koç hesabında token'ı yeniliyoruz.
    if(role==="coach"){
      const {data,error}=await supabaseClient.auth.refreshSession();
      if(!error&&data.session)session=data.session;
    }

    return{session,profile};
  }catch(err){
    console.error("Oturum/profil hatası:",err);
    await supabaseClient.auth.signOut();
    location.href="index.html";
    return null;
  }
}

async function signOut(){
  await supabaseClient.auth.signOut();
  location.href="index.html";
}

function fmt(n,d=2){
  if(n===null||n===undefined||n==="")return"—";
  return Number(n).toFixed(d);
}
