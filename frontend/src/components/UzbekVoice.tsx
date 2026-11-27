"use client";
import { Mic, Volume2, Pause, Play } from "lucide-react";
import {useRef,useState,useEffect} from "react";
async function toSpeechWav(recording: Blob) {
  // Decode at the speech service's sample rate so recordings use the same
  // container and codec across browsers.
  const decoder = new OfflineAudioContext(1, 1, 16000);
  const audio = await decoder.decodeAudioData(await recording.arrayBuffer());
  const channels = Array.from({length: audio.numberOfChannels}, (_, index) => audio.getChannelData(index));
  const byteLength = audio.length * 2;
  const bytes = new DataView(new ArrayBuffer(44 + byteLength));
  bytes.setUint32(0, 0x52494646); // RIFF
  bytes.setUint32(4, 36 + byteLength, true);
  bytes.setUint32(8, 0x57415645); // WAVE
  bytes.setUint32(12, 0x666d7420); // fmt
  bytes.setUint32(16, 16, true);
  bytes.setUint16(20, 1, true); // PCM
  bytes.setUint16(22, 1, true);
  bytes.setUint32(24, audio.sampleRate, true);
  bytes.setUint32(28, audio.sampleRate * 2, true);
  bytes.setUint16(32, 2, true);
  bytes.setUint16(34, 16, true);
  bytes.setUint32(36, 0x64617461); // data
  bytes.setUint32(40, byteLength, true);
  for (let index = 0; index < audio.length; index++) {
    let sample = 0;
    for (const channel of channels) sample += channel[index];
    sample = Math.max(-1, Math.min(1, sample / channels.length));
    bytes.setInt16(44 + index * 2, sample * (sample < 0 ? 32768 : 32767), true);
  }
  return new File([bytes.buffer], "voice.wav", {type:"audio/wav"});
}

export function UzbekVoice({answer,onText,language}:{language?:string;answer:string;onText:(s:string)=>void}) {
  const [pageLanguage,setPageLanguage]=useState("en");
  useEffect(()=>{const read=()=>setPageLanguage(document.documentElement.lang);read();const observer=new MutationObserver(read);observer.observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});return ()=>observer.disconnect();},[]);
  const lang=(language??pageLanguage).startsWith("uz")?"uz":"en";
  const uz=lang==="uz";
  const player=useRef<HTMLAudioElement>(null);
  const [playing,setPlaying]=useState(false);
  const audioCache=useRef(new Map<string,string>());
  const request=useRef<AbortController|null>(null);
  const device=useRef(false);
  const englishRecognition=useRef<{stop:()=>void}|null>(null);
  const recording=useRef<MediaRecorder|null>(null);
  const mounted=useRef(false);
  const [state,setState]=useState("idle"),[error,setError]=useState(""),[url,setUrl]=useState("");
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;englishRecognition.current?.stop();request.current?.abort();player.current?.pause();if("speechSynthesis" in window)window.speechSynthesis.cancel();recording.current?.stream.getTracks().forEach(t=>t.stop());};},[]);
  useEffect(()=>{request.current?.abort();player.current?.pause();if("speechSynthesis" in window)window.speechSynthesis.cancel();setPlaying(false);setUrl("");setError("");},[answer,lang]);
  useEffect(()=>()=>{for(const cached of audioCache.current.values()){if(cached.startsWith("blob:"))URL.revokeObjectURL(cached);}},[]);
  function deviceSpeak(text:string){
    if(!("speechSynthesis" in window))return false;
    const voices=window.speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith(lang));
    const voice=voices.find(v=>/Lola|Sevinch|Madina|Jenny|Aria|Samantha|Susan|Victoria|Zira|Sonia/i.test(v.name))??voices[0];
    if(!voice)return false;
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.voice=voice;utterance.lang=voice.lang;
    utterance.onend=()=>{device.current=false;setPlaying(false);};
    utterance.onerror=()=>{device.current=false;setPlaying(false);};
    window.speechSynthesis.cancel();device.current=true;setPlaying(true);window.speechSynthesis.speak(utterance);
    return true;
  }
  async function send(body:FormData|string) {
    const cacheKey=typeof body==="string"?lang+":sevinch-v4:"+body:"";
    const cached=cacheKey&&audioCache.current.get(cacheKey);
    if(cached){setUrl(cached);return;}
    request.current?.abort();
    const controller=new AbortController();request.current=controller;
    setState("busy");
    try {
      const r=await fetch("/api/uzbek-voice",{method:"POST",signal:controller.signal,headers:{"x-voice-language":lang,...(typeof body==="string"?{"Content-Type":"application/json"}:{})},body});
      if(!r.ok){
        const detail=await r.json().catch(()=>({}));
        if(typeof body==="string" && r.status===402 && deviceSpeak(JSON.parse(body).text)){
          setError(uz?"Qurilma ovozi ishlatilmoqda.":"Using your device voice.");return;
        }
        throw Error(detail.error || (uz?"Ovoz yaratilmadi.":"Could not prepare audio."));
      }
      if(r.headers.get("content-type")?.startsWith("audio/")) {const audioUrl=URL.createObjectURL(await r.blob());audioCache.current.set(cacheKey,audioUrl);setUrl(audioUrl);}
      else {const data=await r.json();if(data.text) onText(data.text);else if(data.url){audioCache.current.set(cacheKey,data.url);setUrl(data.url);}else throw Error();}
    } catch(e){if(controller.signal.aborted)return;setError(e instanceof Error && e.message?e.message:"Qayta urinib ko‘ring.");}
    finally{if(mounted.current)setState("idle");}
  }
  async function mic(){
    setError("");
    if(englishRecognition.current){englishRecognition.current.stop();return;}
    if(lang==="en"){
      type Recognition={lang:string;onresult:((event:{results:{[index:number]:{[index:number]:{transcript:string}}}})=>void)|null;onerror:(()=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
      const speechWindow=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
      const Constructor=speechWindow.SpeechRecognition??speechWindow.webkitSpeechRecognition;
      if(!Constructor){setError("English dictation is unavailable in this browser. Please type your question.");return;}
      const recognizer=new Constructor();recognizer.lang="en-US";
      englishRecognition.current=recognizer;
      recognizer.onresult=e=>onText(e.results[0][0].transcript);
      recognizer.onerror=()=>setError("Could not hear you. Check microphone access and try again.");
      recognizer.onend=()=>{englishRecognition.current=null;if(mounted.current)setState("idle");};
      recognizer.start();setState("recording");return;
    }
    if(recording.current?.state==="recording"){recording.current.stop();return;}
    setState("busy");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!mounted.current){stream.getTracks().forEach(t=>t.stop());return;}
      let rec:MediaRecorder;
      try{
        const mimeType=["audio/webm;codecs=opus","audio/ogg;codecs=opus","audio/mp4"]
          .find(type=>MediaRecorder.isTypeSupported(type));
        rec=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
      }catch(e){stream.getTracks().forEach(t=>t.stop());throw e;}
      recording.current=rec;
      const chunks:Blob[]=[];
      rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      rec.onstop=async()=>{
        stream.getTracks().forEach(track=>track.stop());
        if(!mounted.current)return;
        setState("encoding");
        try {
          if(!chunks.length)throw new Error("Empty recording");
          const file=await toSpeechWav(new Blob(chunks,{type:rec.mimeType||chunks[0].type}));
          if(!mounted.current)return;
          const form=new FormData();
          form.set("file",file);
          void send(form);
        } catch {
          if(!mounted.current)return;
          setState("idle");
          setError("Ovoz yozuvini tayyorlab bo‘lmadi. Qayta urinib ko‘ring.");
        }
      };
      rec.start();setState("recording");window.setTimeout(()=>{if(rec.state==="recording")rec.stop();},30000);
    }catch{setState("idle");setError(uz?"Mikrofonga ruxsat bering yoki savolni yozing.":"Allow microphone access or type your question.");}
  }
  return <aside className="flex flex-wrap items-center gap-2 p-2 text-sm" aria-label={uz?"Ovoz boshqaruvi":"Voice controls"}>
    <button type="button" disabled={state==="busy"||state==="encoding"} onClick={mic} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 disabled:cursor-wait"><Mic size={16}/>{state==="recording"?(uz?"To‘xtatish":"Stop recording"):(uz?"Gapirish":"Dictate")}</button>
    {answer&&<button type="button" disabled={state!=="idle"} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2" onClick={()=>{
      setError("");
      if(device.current){window.speechSynthesis.cancel();device.current=false;setPlaying(false);return;}
      if(url && player.current){if(playing)player.current.pause();else void player.current.play().catch(()=>setError(uz?"Audio boshqaruvidan foydalaning.":"Use the audio controls below."));return;}
      if(lang==="en"){if(!deviceSpeak(answer.replaceAll("**","")))setError("No English voice is installed on this device.");return;}
      void send(JSON.stringify({text:answer.replace(/[*#`]/g,"").slice(0,5000)}));
    }}>{playing?<Pause size={16}/>:url?<Play size={16}/>:<Volume2 size={16}/>}{playing?(uz?"Pauza":"Pause"):url?(uz?"Ijro etish":"Play"):(uz?"Javobni tinglash":"Read aloud")}</button>}
    {state==="busy"&&<button type="button" onClick={()=>{request.current?.abort();setState("idle");}}>{uz?"Bekor qilish":"Cancel"}</button>}
    {(state==="busy"||state==="encoding")&&<small role="status">{uz?"Tayyorlanmoqda…":"Preparing audio…"}</small>}
    {url&&<audio ref={player} onError={()=>setError(uz?"Audio yuklanmadi. Qayta urinib ko‘ring.":"Audio could not load. Please retry.")} controls autoPlay src={url} className="w-full" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)}/>}
    {error&&<p role="alert">{error}</p>}
  </aside>;
}