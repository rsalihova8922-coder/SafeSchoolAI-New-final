import { Link } from '@tanstack/react-router';
import { Activity, ArrowLeft, BookOpenCheck, ChevronDown, GraduationCap, LayoutDashboard, Menu, ShieldCheck, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/use-language';
import type { Lang, Role } from '@/lib/safeschool';

export function AppShell({children, role, title, subtitle, back}: {children:ReactNode;role?:Role;title?:string;subtitle?:string;back?:string}) {
 const {lang,t,change}=useLanguage(); const [open,setOpen]=useState(false);
 const navRoles = ['student','teacher','psychologist','admin'] as const;
 return <div className="app-layout">
  <aside className={`app-sidebar ${open?'is-open':''}`}>
   <Link to="/" className="brand" onClick={()=>setOpen(false)}><span className="brand-mark"><ShieldCheck size={22}/></span><span>SafeSchool <strong>AI</strong><small>{t.secure}</small></span></Link>
   <div className="sidebar-label">{t.overview}</div>
   <nav className="sidebar-nav" aria-label="Navigation">
    <Link to="/" className="nav-item" activeProps={{className:'nav-item active'}} onClick={()=>setOpen(false)}><LayoutDashboard size={18}/>{t.home}</Link>
    {navRoles.map((r)=> <Link key={r} to="/login/$role" params={{role:r}} className={`nav-item ${role===r?'active':''}`} onClick={()=>setOpen(false)}>{r==='student'?<GraduationCap size={18}/>:r==='psychologist'?<Activity size={18}/>:<BookOpenCheck size={18}/>} {t[r]}</Link>)}
   </nav>
   <div className="sidebar-bottom"><span className="sidebar-bottom-icon"><ShieldCheck size={19}/></span><span>SafeSchool AI<small>Digital wellbeing platform</small></span></div>
  </aside>
  {open&&<div className="sidebar-scrim" onClick={()=>setOpen(false)}/>}
  <div className="app-main">
   <header className="topbar"><div className="topbar-left"><Button variant="ghost" size="icon" className="mobile-menu" aria-label="Menu" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</Button><span className="topbar-crumb">SafeSchool AI</span><span className="crumb-slash">/</span><span className="topbar-current">{title||t.overview}</span></div><div className="topbar-right"><span className="live-indicator"><span/>{t.secure}</span><div className="lang-control"><select aria-label="Language" value={lang} onChange={e=>change(e.target.value as Lang)}><option value="kk">ҚАЗ</option><option value="ru">РУС</option><option value="en">ENG</option></select><ChevronDown size={14}/></div><span className="topbar-avatar">S</span></div></header>
   <main className="page-content">{back&&<Link to={back as '/'} className="back-link"><ArrowLeft size={16}/>{t.back}</Link>}{title&&<div className="page-heading"><div><p className="eyebrow">SAFESCHOOL AI / {role?t[role].toUpperCase():t.overview.toUpperCase()}</p><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div></div>}{children}</main>
  </div>
 </div>
}
