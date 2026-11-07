"use client";
import { useId } from "react";
export function RobotMascot({mood="idle",className=""}:{mood?:"idle"|"thinking"|"happy"|"error";tone?:"blue"|"forest";className?:string}){
 const id=useId().replace(/:/g,"");
 return <span className={"robot-mascot brand-mascot quti-mascot "+className} data-mood={mood} aria-hidden="true"><svg viewBox="0 0 160 180" fill="none">
 <defs><linearGradient id={id+"box"} x1="32" y1="74" x2="124" y2="154" gradientUnits="userSpaceOnUse"><stop stopColor="#6aa67b"/><stop offset=".55" stopColor="#407c54"/><stop offset="1" stopColor="#245337"/></linearGradient><linearGradient id={id+"gold"} x1="58" y1="17" x2="91" y2="50" gradientUnits="userSpaceOnUse"><stop stopColor="#fff0ac"/><stop offset="1" stopColor="#c99535"/></linearGradient></defs>
 <ellipse cx="80" cy="165" rx="44" ry="6" fill="#163f28" opacity=".14"/>
 <g className="quti-box"><rect x="39" y="150" width="19" height="12" rx="5" fill="#244a34"/><rect x="102" y="150" width="19" height="12" rx="5" fill="#244a34"/>
 <rect x="30" y="72" width="100" height="83" rx="17" fill={"url(#"+id+"box)"} stroke="#2f6543" strokeWidth="2"/>
 <path d="M122 86v51c0 6-4 10-10 10" stroke="#193f2b" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round"/>
 <path d="M38 91v34" stroke="#b4dab6" strokeOpacity=".25" strokeWidth="3" strokeLinecap="round"/>
 <g className="quti-lid"><rect x="23" y="63" width="114" height="23" rx="11" fill="#73ad82" stroke="#3f7952" strokeWidth="2"/><path d="M34 68h90" stroke="#c5e4c5" strokeWidth="2" strokeLinecap="round" opacity=".4"/><rect x="56" y="68" width="48" height="9" rx="4.5" fill="#163f29" stroke="#e0c779" strokeWidth="2"/></g>
 <g className="brand-eyes"><rect x="57" y="104" width="8" height="12" rx="4" fill="#e6f5d8"/><rect x="95" y="104" width="8" height="12" rx="4" fill="#e6f5d8"/></g>
 <path d={mood==="error"?"M73 123h14":"M73 120q7 7 14 0"} stroke="#e6f5d8" strokeWidth="2.5" strokeLinecap="round"/>
 <circle cx="49" cy="119" r="4" fill="#dba589" opacity=".5"/><circle cx="111" cy="119" r="4" fill="#dba589" opacity=".5"/>
 <path d="M52 140h56" stroke="#17442d" strokeWidth="6" strokeLinecap="round"/><path d="M52 140h35" stroke="#d4c37d" strokeWidth="4" strokeLinecap="round"/>
 <path className="quti-leaf-stem" d="M135 96c-1-12 0-22 9-30" stroke="#75b58a" strokeWidth="3" strokeLinecap="round"/><path d="M141 76c-4-14 5-20 14-20-1 12-4 19-14 20Z" fill="#8cc69b"/>
 </g>
 <g className="quti-coin"><circle cx="80" cy="37" r="15" fill={"url(#"+id+"gold)"} stroke="#e9cc77" strokeWidth="2"/><circle cx="80" cy="37" r="10.5" stroke="#fff0b4" strokeWidth="1.5"/><path d="M80 30v14M76 33h6c4 0 4 5 0 5h-4c-4 0-4 5 0 5h6" stroke="#fff4c5" strokeWidth="1.8" strokeLinecap="round"/></g>
 <path className="quti-spark" d="M30 45v10M25 50h10M123 31v8M119 35h8" stroke="#dcc780" strokeWidth="2" strokeLinecap="round"/>
 </svg></span>;
}
