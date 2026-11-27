export const maxDuration = 120;
export async function POST(req: Request) {
 const language=req.headers.get("x-voice-language")==="en"?"en":"uz";
 const error=(message:string,status=502)=>Response.json({error:message},{status});
 if(![new URL(req.url).origin,"https://iqtisodai.uz","https://www.iqtisodai.uz"].includes(req.headers.get("origin")||""))return error("Forbidden",403);
 const key=process.env.MOHIRAI_API_KEY?.trim();
 if(!key)return error("Voice service is being configured.",503);
 const stt=req.headers.get("content-type")?.startsWith("multipart/form-data");
 if(language==="en")return error("Use your device English voice.",422);
 try{
  const headers=new Headers({Authorization:key});
  let body:FormData|string;
  if(stt){
   const incoming=await req.formData(),file=incoming.get("file");
   if(!(file instanceof File)||!file.type.startsWith("audio/")||!file.size||file.size>2000000)return error("Yozuv juda katta yoki noto‘g‘ri.",400);
   const form=new FormData();
   form.set("file",file);form.set("language","uz");form.set("model","general");
   form.set("return_offsets","false");form.set("run_diarization","false");form.set("blocking","true");body=form;
  }else{
   const {text}=await req.json();
   if(typeof text!=="string"||!text.trim()||text.length>5000)return error("Matn uzunligini tekshiring.",400);
   headers.set("Content-Type","application/json");
   body=JSON.stringify({text,model:"sevinch",blocking:"true"});
  }
  const signal=AbortSignal.timeout(95000);
  const response=await fetch("https://uzbekvoice.ai/api/v1/"+(stt?"stt":"tts"),{
   method:"POST",headers,body,signal,redirect:"error",
  });
  if(!response.ok){
   console.warn("MohirAI voice request rejected", {operation:stt?"stt":"tts",status:response.status});
   if(response.status===402)return error("Ovoz xizmati balansi yetarli emas.",402);
   if(response.status===429)return error("Ovoz xizmati limiti tugadi.",429);
   if(response.status===401||response.status===403)return error("Ovoz xizmati kalitini tekshiring.",503);
   return error("Ovoz xizmati so‘rovni bajarmadi.");
  }
  const contentType=response.headers.get("content-type");
  if(!stt&&contentType?.startsWith("audio/")){
   return new Response(response.body,{headers:{"Content-Type":contentType,"Cache-Control":"no-store"}});
  }
  let data=await response.json();
  const taskId=typeof data.id==="string"?data.id:null;
  // Status requests read the original job and never submit a second one.
  for(let checks=0;taskId&&!data.result&&checks<12;checks++){
   const state=String(data.state??data.status).toUpperCase();
   if(["SUCCESS","COMPLETED","FAILURE","FAILED","REVOKED","CANCELED"].includes(state))break;
   await new Promise(resolve=>setTimeout(resolve,1500));
   const status=await fetch("https://uzbekvoice.ai/api/v1/tasks?id="+encodeURIComponent(taskId),{
    headers:{Authorization:key},signal,cache:"no-store",redirect:"error",
   });
   if(!status.ok)break;
   data=await status.json();
  }
  if(stt&&typeof data.result?.text==="string"){
   const transcript=data.result.text.trim();
   return transcript?Response.json({text:transcript}):error("Nutq aniqlanmadi. Mikrofonga yaqinroq gapiring.",422);
  }
  if(!stt&&typeof data.result?.url==="string"&&data.result.url.startsWith("https://")){
   return Response.json({url:data.result.url});
  }
  console.warn("MohirAI returned no completed voice result",{
   operation:stt?"stt":"tts",hasTask:!!taskId,hasResult:!!data.result,
   hasAudioUrl:typeof data.result?.url==="string",
  });
  return error("Ovoz xizmati natija qaytarmadi.");
 }catch{
  return error("Ovozga ishlov berilmadi. Qayta urinib ko‘ring.");
 }
}
