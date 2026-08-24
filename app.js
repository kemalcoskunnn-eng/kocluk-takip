const cfg=window.APP_CONFIG;
const supabaseClient=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
async function getSessionProfile(){
 const {data:{session}}=await supabaseClient.auth.getSession();
 if(!session)return{session:null,profile:null};
 const {data:profile}=await supabaseClient.from("profiles").select("*").eq("id",session.user.id).single();
 return{session,profile};
}
async function requireRole(role){
 const {session,profile}=await getSessionProfile();
 if(!session||!profile){location.href="index.html";return null;}
 if(profile.role!==role){location.href=profile.role==="coach"?"coach.html":"student.html";return null;}
 return{session,profile};
}
async function signOut(){await supabaseClient.auth.signOut();location.href="index.html";}
function fmt(n,d=2){if(n===null||n===undefined||n==="")return"—";return Number(n).toFixed(d);}
