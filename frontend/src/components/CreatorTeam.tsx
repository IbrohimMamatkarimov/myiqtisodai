"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowUpRight,Users,X} from "lucide-react";


export function CreatorTeam({brand,accent}:{brand:string;accent:string}){
 const dialog=useRef<HTMLDialogElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 const [english,setEnglish]=useState(false);
 useEffect(()=>{
  const read=()=>setEnglish(document.documentElement.lang.startsWith("en"));
  read();const observer=new MutationObserver(read);
  observer.observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  return ()=>observer.disconnect();
 },[]);
 const close=()=>{dialog.current?.close();trigger.current?.focus();};
 return <>
  <div className="creator-team-entry" style={{"--creator-accent":accent} as React.CSSProperties}>
   <button ref={trigger} type="button" onClick={()=>dialog.current?.showModal()} aria-haspopup="dialog"><Users size={14} aria-hidden="true"/><span>{english?"The creator":"Jamoa"}</span></button>
  </div>
  <dialog ref={dialog} className="creator-team-dialog" style={{"--creator-accent":accent} as React.CSSProperties} aria-labelledby="creator-team-name" onClick={event=>{if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();}}} onClose={()=>trigger.current?.focus()}>
   <div className="creator-team-cover"><span className="creator-team-orbit"/><span className="creator-team-orbit second"/><span className="creator-team-wordmark">{brand}</span><button type="button" onClick={close} aria-label={english?"Close":"Yopish"} className="creator-team-close"><X size={20}/></button></div>
   <div className="creator-team-content">
    <div className="creator-team-people">
     <article className="creator-team-identity" aria-labelledby="creator-team-name">
      <img className="creator-team-portrait" src="/creator-portrait.webp" alt="" width={320} height={400}/>
      <div>
       <p className="creator-team-eyebrow">Founder</p>
       <h2 id="creator-team-name">Ibrohim Mamatkarimov</h2>
       <p className="creator-team-bio">{english?"I study Computer Science at Central Asian University (CAU).":"Central Asian University (CAU)da Computer Science yo‘nalishida o‘qiyman."}</p>
      </div>
     </article>
     <article className="creator-team-identity" aria-labelledby="creator-cofounder-name">
      <img className="creator-team-portrait" src="/cofounder-portrait.webp" alt="" width={320} height={400}/>
      <div>
       <p className="creator-team-eyebrow">Cofounder</p>
       <h2 id="creator-cofounder-name">{english?"Ilxomov Islomber":"Islomber Ilxomov"}</h2>
       <p className="creator-team-bio">{english?"I study finance at Central Asian University (CAU).":"Central Asian University (CAU)da moliya yo‘nalishida o‘qiyman."}</p>
      </div>
     </article>
    </div>
    <a className="creator-team-contact" href="https://t.me/ibrohimmamatkarimov" target="_blank" rel="noopener noreferrer"><span><small>{english?"LET’S CONNECT":"BOG‘LANISH UCHUN"}</small><strong>@ibrohimmamatkarimov</strong></span><ArrowUpRight size={22}/></a>
   </div>
  </dialog>
  <style>{`
.creator-team-entry{display:flex;justify-content:flex-end;position:relative;padding:6px 20px;background:var(--surface,#fff);border-bottom:1px solid #8c92931c}


.creator-team-dialog{padding:0;border:1px solid #ffffff44;border-radius:28px;width:min(440px,calc(100vw - 28px));max-height:calc(100dvh - 28px);overflow-y:auto;overflow-x:hidden;background:#fff;color:#202b31;margin:auto;box-shadow:0 30px 100px #102a3255;font-family:inherit}
.creator-team-dialog::backdrop{background:#0b192b99;backdrop-filter:blur(7px)}
.creator-team-dialog[open]{animation:creator-team-in .28s cubic-bezier(.2,.8,.2,1) both}
.creator-team-cover{position:relative;isolation:isolate;overflow:hidden;height:160px;background:linear-gradient(125deg,#102b31,var(--creator-accent));padding:22px 26px}
.creator-team-wordmark{position:relative;color:#fff;font-size:13px;font-weight:700;letter-spacing:.02em}
.creator-team-close{position:absolute;right:16px;top:16px;display:grid;place-items:center;width:36px;height:36px;border:1px solid #ffffff38;border-radius:50%;color:#fff;background:#ffffff12;cursor:pointer;z-index:2}
.creator-team-orbit{position:absolute;width:260px;height:260px;right:-25px;top:-160px;border:1px solid #ffffff28;border-radius:50%;animation:creator-team-drift 12s ease-in-out infinite alternate}
.creator-team-orbit.second{width:340px;height:340px;top:-125px;right:-145px;animation-delay:-6s}
.creator-team-monogram{position:absolute;bottom:20px;left:26px;font-size:60px;font-weight:750;line-height:1;letter-spacing:-6px;color:#fff}
.creator-team-monogram span{font-size:25px;letter-spacing:0;display:inline-block;margin-left:14px;color:#e9d6a0;animation:creator-team-star 8s ease-in-out infinite}
.creator-team-content{padding:26px}
.creator-team-eyebrow{font-size:10px;font-weight:700;letter-spacing:.14em;color:var(--creator-accent);margin:0 0 12px}
.creator-team-content h2{font-size:clamp(30px,7vw,38px);line-height:1.08;font-weight:750;letter-spacing:-.045em;margin:0;color:#202b31}
.creator-team-content h2 span{color:var(--creator-accent)}
.creator-team-intro{font-size:14px;line-height:1.75;color:#59666c;margin:18px 0}
.creator-team-details{display:flex;flex-wrap:wrap;gap:10px 18px;border-top:1px solid #e8eded;padding:16px 0 20px}
.creator-team-details>span{display:flex;align-items:center;gap:7px;font-size:12px;color:#42545c}
.creator-team-details svg{color:var(--creator-accent)}
.creator-team-contact{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px;border-radius:16px;background:var(--creator-accent);color:#fff;text-decoration:none;transition:transform .2s,box-shadow .2s}
.creator-team-contact:hover{transform:translateY(-2px);box-shadow:0 8px 20px #142c3226}
.creator-team-contact small{display:block;font-size:9px;letter-spacing:.13em;opacity:.75;margin-bottom:5px}
.creator-team-contact strong{font-size:14px;overflow-wrap:anywhere}
.creator-team-entry button:focus-visible,.creator-team-dialog button:focus-visible,.creator-team-dialog a:focus-visible{outline:3px solid #83c5d8;outline-offset:3px}
.creator-team-entry{padding:0!important;background:transparent!important;border:0!important;justify-content:center!important;flex-shrink:0}


.creator-team-dialog{width:min(520px,calc(100vw - 28px));border-radius:26px}
.creator-team-cover{height:240px;background-size:cover;background-position:center;display:flex;flex-direction:column;justify-content:space-between;padding:26px}
.creator-team-coverline{position:relative;color:#fff;max-width:350px;animation:creator-team-in .55s .05s both}
.creator-team-coverline>span{font-size:clamp(24px,6vw,32px);font-weight:650;letter-spacing:-.04em;line-height:1.15}
.creator-team-coverline p{font-size:12px;line-height:1.7;color:#d6e7e5;margin-top:10px}
.creator-team-content{padding:28px 30px 30px}
.creator-team-content h2{font-size:clamp(30px,7vw,40px);line-height:1.12}
.creator-team-intro{font-size:15px;line-height:1.8;max-width:390px}
.creator-team-details{gap:14px;justify-content:space-between}
.creator-team-contact{padding:18px 20px;border-radius:18px}
.creator-team-contact strong{font-size:15px}
.creator-team-orbit{opacity:.2}
@media(max-width:540px){.creator-team-cover{height:210px;padding:22px}.creator-team-content{padding:24px}.creator-team-details{display:grid;gap:12px}}




.creator-team-cover{height:74px!important;padding:25px 30px!important;background:linear-gradient(112deg,color-mix(in srgb,var(--creator-accent) 30%,#152026),var(--creator-accent))}
.creator-team-identity{display:grid;grid-template-columns:clamp(76px,23vw,124px) minmax(0,1fr);gap:clamp(12px,4vw,26px);align-items:center}
.creator-team-portrait{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;object-position:center 43%;border-radius:16px;background:#e7e5e0;border:1px solid color-mix(in srgb,var(--creator-accent) 20%,transparent);box-shadow:0 6px 18px #15202614}
.creator-team-dialog{width:min(820px,calc(100vw - 28px))}
.creator-team-people{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-bottom:22px}
.creator-team-people .creator-team-identity{grid-template-columns:minmax(0,1fr);grid-template-rows:auto 1fr;align-items:start;gap:18px;padding:20px;border:1px solid #e2e7e6;border-radius:18px;background:#f8faf7}
.creator-team-people .creator-team-portrait{width:min(100%,180px);justify-self:center}
.creator-team-people .creator-team-identity h2{font-size:clamp(21px,4vw,28px)!important;overflow-wrap:anywhere}
.creator-team-bio{margin:10px 0 0;color:#536168;font-size:15px;line-height:1.65}
@media(max-width:620px){.creator-team-people{grid-template-columns:minmax(0,1fr)}}
.creator-team-identity h2 span{display:block;color:inherit;overflow-wrap:anywhere}
.creator-team-identity .creator-team-eyebrow{margin-bottom:8px;font-size:clamp(13px,3.6vw,16px);line-height:1.35;letter-spacing:.025em}
@media(max-width:420px){.creator-team-identity h2{font-size:clamp(17px,5.8vw,27px)!important}.creator-team-cover{padding-inline:22px!important}}
.creator-team-content{padding-top:26px!important}
.creator-team-content h2{font-size:clamp(30px,6vw,38px)!important;letter-spacing:-.035em!important;line-height:1.13!important}
.creator-about{margin:24px 0 26px;border-top:1px solid #e2e7e6;padding-top:22px;animation:creator-team-in .4s ease-out both}
.creator-about h3{font-family:Georgia,"Times New Roman",serif;font-weight:500;font-size:25px;line-height:1.25;margin:0 0 14px;color:#202b31}
.creator-about p{font-size:14px;line-height:1.85;color:#536168;margin:0 0 12px}
.creator-about p:last-child{margin-bottom:0}


@media(max-width:380px){.creator-team-content{padding:20px!important}}\n@media(prefers-reduced-motion:reduce){.creator-about{animation:none}}
@keyframes creator-team-in{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
@keyframes creator-team-drift{to{transform:translate(-20px,20px)}}
@keyframes creator-team-star{50%{transform:rotate(25deg)}}
@media(prefers-reduced-motion:reduce){.creator-team-dialog[open],.creator-team-orbit,.creator-team-monogram span{animation:none}.creator-team-entry button,.creator-team-contact{transition:none}}
.creator-team-entry button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;padding:7px 12px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:9px;background:transparent;color:inherit;font-family:inherit;font-size:13px;font-weight:500;line-height:1.4;white-space:nowrap;cursor:pointer;box-shadow:none;transition:background-color .15s,border-color .15s}
.creator-team-entry button:hover{background:color-mix(in srgb,currentColor 5%,transparent);border-color:color-mix(in srgb,currentColor 28%,transparent)}
.creator-team-entry button svg{flex-shrink:0;opacity:.7}
@media(max-width:540px){.creator-team-entry button{padding:7px 10px;font-size:12px}}
`}</style>
 </>;
}
