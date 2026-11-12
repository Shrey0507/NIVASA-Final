import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, MessageSquareWarning, Bell, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getMyFees, getMyGrievances, getMyMess, getMyMovements, getMyNotices, summarizeFees } from "@/services/studentService";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const IST_DAY = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" });
function todayInIndia() { return IST_DAY.format(new Date()); }
function mealItems(value) { return (value?.items || (Array.isArray(value) ? value : [])).map((item) => typeof item === "string" ? item : item.name).filter(Boolean); }
export default function StudentDashboardPage() {
 const { student, profile } = useAuth(); const s = student || profile || {};
 const [data,setData]=useState({fees:[],grievances:[],movements:[],notices:[],mess:[]}); const [error,setError]=useState("");
 const [indiaDay,setIndiaDay]=useState(todayInIndia());
 useEffect(()=>{const updateDay=()=>setIndiaDay(todayInIndia());updateDay();const id=setInterval(updateDay,60000);return()=>clearInterval(id);},[]);
 useEffect(()=>{Promise.all([getMyFees(),getMyGrievances(),getMyMovements(),getMyNotices(),getMyMess()]).then(([fees,grievances,movements,notices,mess])=>setData({fees,grievances,movements,notices,mess})).catch(e=>setError(e.message));},[]);
 const summary=summarizeFees(data.fees);
 const todayMenu=useMemo(()=>data.mess.find(m=>(m.day||"").toLowerCase()===indiaDay.toLowerCase())||null,[data.mess,indiaDay]);
 return <><PageHeader title={`Welcome back, ${(s.full_name||s.fullName||"Student").split(" ")[0]}`} description="Your live hostel information and updates."/>
 {error&&<EmptyState title="Unable to load dashboard" description={error}/>}
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Outstanding dues" value={money(summary.outstanding)} hint="current balance" icon={CreditCard}/><StatCard label="Open grievances" value={data.grievances.filter(g=>g.status!=="resolved"&&g.status!=="closed").length} hint="active requests" icon={MessageSquareWarning}/><StatCard label="Notices" value={data.notices.length} hint="published notices" icon={Bell}/><StatCard label="Mess menus" value={data.mess.length} hint="available days" icon={UtensilsCrossed}/></div>
 <div className="grid gap-6 lg:grid-cols-2">
 <SectionCard title="My hostel details" description="Authenticated student record"><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{s.full_name||s.fullName||"—"}</dd></div><div><dt className="text-muted-foreground">USN</dt><dd className="font-medium">{s.usn||"—"}</dd></div><div><dt className="text-muted-foreground">Department</dt><dd className="font-medium">{s.department||"—"}</dd></div><div><dt className="text-muted-foreground">Room</dt><dd className="font-medium">{s.room_number||s.room||"Unassigned"}</dd></div></dl></SectionCard>
 <SectionCard title={`Today's mess menu · ${indiaDay}`} action={<Button variant="ghost" size="sm" asChild><Link to="/student/mess">Full menu <ArrowRight/></Link></Button>}>
 {todayMenu?<div className="grid gap-3 sm:grid-cols-2">{[["breakfast","Breakfast"],["lunch","Lunch"],["snacks","Snacks"],["dinner","Dinner"]].map(([key,label])=>{const value=todayMenu[key];if(!value)return null;return <div key={key} className="rounded-lg border p-3"><p className="font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">{value.time||"Time not announced"}</p><p className="mt-1 text-sm text-muted-foreground">{mealItems(value).join(" · ")||"Menu not published"}</p></div>;})}</div>:<EmptyState title={data.mess.length?"No menu for today yet":"No menu published"} description={data.mess.length?`No menu entry found for ${indiaDay} (India time).`:"The hostel office has not published a menu yet."}/>}
 </SectionCard></div>
 <SectionCard title="Recent notices" action={<Button variant="ghost" size="sm" asChild><Link to="/student/notices">View all <ArrowRight/></Link></Button>}>{data.notices.slice(0,3).map(n=><div key={n.id} className="border-b py-3 last:border-0"><div className="flex justify-between gap-3"><p className="font-medium">{n.title}</p><Badge variant="outline">{n.audience||"all"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{n.body}</p></div>)}</SectionCard></>;
}