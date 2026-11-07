'use client';
import { useState } from 'react';
import { ArrowRight, Target, SlidersHorizontal } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/navigation';
const COPY={
 en:{eyebrow:'PLAN YOUR SAVINGS',title:'Make a savings plan.',lead:'Try a simple savings plan before you create an account.',target:'Your target',saved:'Already saved',period:'Time to save',months:'months',monthly:'Set aside each month',remaining:'Left to reach your goal',projection:'Your savings path',note:'Illustrative plan. No interest, fees, or investment returns included.',cta:'Create your goal',currency:'UZS',sub:'A simple monthly amount. A clear goal.'},
 uz:{eyebrow:'JAMG‘ARMA REJASI',title:'Hisoblab ko‘ring.',lead:'Qancha pul va necha oy? Rejangizni ko‘ring.',target:'Qancha yig‘moqchisiz?',saved:'Hozir qancha bor?',period:'Necha oyda?',months:'oy',monthly:'Har oy',remaining:'Qolgan summa',projection:'Jamg‘arma o‘sishi',note:'Namunaviy reja. Foizlar, komissiyalar va investitsiya daromadi hisobga olinmagan.',cta:'Maqsad yarating',currency:'UZS',sub:'Har oy oz-ozdan, maqsadga yaqinroq.'},
 ru:{eyebrow:'ОТ ЦЕЛИ К ПЛАНУ',title:'Найдите путь к своей цели.',lead:'Попробуйте простой план накоплений до регистрации.',target:'Сумма цели',saved:'Уже накоплено',period:'Срок накопления',months:'мес.',monthly:'Откладывайте каждый месяц',remaining:'Осталось до цели',projection:'Ваш путь накоплений',note:'Примерный план. Проценты, комиссии и доход от инвестиций не учитываются.',cta:'Создать цель',currency:'UZS',sub:'Двигаться к цели проще, когда следующий шаг понятен.'},
};
export function FinancePlanner(){
 const locale=useLocale();const c=COPY[locale as keyof typeof COPY]||COPY.en;
 const [target,setTarget]=useState("12000000");const [saved,setSaved]=useState("2000000");const [months,setMonths]=useState(12);
 const finite=(raw:string,fallback:number)=>Number.isFinite(Number(raw))?Number(raw):fallback;
 const goal=Math.max(1,Math.min(1e12,finite(target,1)));const initial=Math.max(0,Math.min(goal,finite(saved,0)));
 const remaining=Math.max(0,goal-initial);const monthly=Math.ceil(remaining/months);
 const format=(value:number)=>new Intl.NumberFormat(locale==='uz'?'uz-UZ':locale==='ru'?'ru-RU':'en-US',{maximumFractionDigits:0}).format(value);
 return <section className="finance-planner" aria-labelledby="finance-planner-title">
 <div className="finance-planner__intro"><p><SlidersHorizontal size={14}/>{c.eyebrow}</p><h2 id="finance-planner-title">{c.title}</h2><span>{c.lead}</span></div>
 <div className="finance-planner__grid"><div className="finance-planner__controls">
 <label><span>{c.target}<small>{c.currency}</small></span><input type="number" inputMode="numeric" min="1" max="1000000000000" step="100000" value={target} onChange={event=>setTarget(event.target.value)}/></label>
 <label><span>{c.saved}<small>{c.currency}</small></span><input type="number" inputMode="numeric" min="0" max="1000000000000" step="100000" value={saved} onChange={event=>setSaved(event.target.value)}/></label>
 <div className="finance-planner__period"><label htmlFor="planner-months">{c.period}<strong>{months} {c.months}</strong></label><input id="planner-months" type="range" min="1" max="60" value={months} onChange={event=>setMonths(Number(event.target.value))}/><div>{[6,12,24,36].map(value=><button type="button" key={value} aria-pressed={months===value} onClick={()=>setMonths(value)}>{value} {c.months}</button>)}</div></div>
 </div><div className="finance-planner__result"><div className="finance-planner__result-label"><span><Target size={14}/>{c.monthly}</span><small>{months} {c.months}</small></div><p aria-live="polite"><strong>{format(monthly)}</strong><span>{c.currency}</span></p><span className="finance-planner__remaining">{c.remaining}: {format(remaining)} {c.currency}</span>
 <div className="finance-planner__chart" role="img" aria-label={c.projection}>{Array.from({length:12},(_,index)=>{const amount=initial+(remaining*(index+1)/12);return <span key={index} style={{height:Math.max(5,amount/goal*100)+"%"}}><i/></span>;})}</div>
 <div className="finance-planner__axis"><span>0 {c.months}</span><span>{months} {c.months}</span></div><Link href="/register">{c.cta}<ArrowRight size={15}/></Link>
 </div></div><footer><span>{c.note}</span><strong>{c.sub}</strong></footer>
 </section>;
}
