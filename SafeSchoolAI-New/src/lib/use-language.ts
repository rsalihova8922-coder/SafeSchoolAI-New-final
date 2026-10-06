import { useEffect, useState } from 'react';
import { copy, type Lang } from './safeschool';
export function useLanguage() {
 const [lang,setLang] = useState<Lang>('kk');
 useEffect(()=>{ const saved=localStorage.getItem('siteLanguage'); if(saved==='kk'||saved==='ru'||saved==='en') setLang(saved); },[]);
 useEffect(()=>{ document.documentElement.lang=lang; },[lang]);
 const change=(next:Lang)=>{localStorage.setItem('siteLanguage',next);setLang(next);window.dispatchEvent(new Event('safeschool-language'));};
 useEffect(()=>{const sync=()=>{const saved=localStorage.getItem('siteLanguage');if(saved==='kk'||saved==='ru'||saved==='en')setLang(saved)};window.addEventListener('safeschool-language',sync);return()=>window.removeEventListener('safeschool-language',sync)},[]);
 return { lang, t:copy[lang], change };
}
