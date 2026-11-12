import { useEffect, useState } from "react";
import { Plus, Clock3, MapPin } from "lucide-react";
import { getMyMovements, createMyMovement, cancelMyMovement, cancelPendingMovement } from "@/services/studentService";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fmt = value => value ? new Date(value).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const initial = {type:"exit",reason:"",destination:"",requestedDateTime:""};
export default function StudentMovementsPage(){
 const [items,setItems]=useState([]),[show,setShow]=useState(false),[form,setForm]=useState(initial),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const load=()=>getMyMovements().then(setItems).catch(e=>setError(e.message));
 useEffect(()=>{load();},[]);
 const submit=async e=>{e.preventDefault();setError("");if(!form.requestedDateTime){setError("Please select your expected return date and time.");return;}if(new Date(form.requestedDateTime)<=new Date()){setError("Expected return must be in the future.");return;}try{setBusy(true);await createMyMovement(form);setShow(false);setForm(initial);await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const cancel=async id=>{try{await cancelPendingMovement(id);await load();}catch(e){setError(e.message);}};
 const markReturned=async id=>{try{await cancelMyMovement(id);await load();}catch(e){setError(e.message);}};
 return <><PageHeader title="In / Out register" description="Submit a movement request for admin approval and track its decision."><Button onClick={()=>setShow(v=>!v)}><Plus className="mr-2 h-4 w-4"/>New movement request</Button></PageHeader>
 {show&&<SectionCard title="Request hostel movement" description="Your request will be sent to the hostel administrator. It will remain pending until reviewed."><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
 <div className="space-y-2"><Label>Movement type</Label><select className="w-full rounded-md border bg-background p-2" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="exit">Exit — leaving hostel</option><option value="entry">Entry — planned late return / entry</option></select></div>
 <div className="space-y-2"><Label>Destination</Label><Input placeholder="Where are you going?" value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})}/></div>
 <div className="space-y-2 sm:col-span-2"><Label>Reason</Label><Input required placeholder="Reason for movement" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></div>
 <div className="space-y-2"><Label>Expected return date and time <span className="text-destructive">*</span></Label><Input required type="datetime-local" min={new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)} value={form.requestedDateTime} onChange={e=>setForm({...form,requestedDateTime:e.target.value})}/><p className="text-xs text-muted-foreground">Used by the admin's overdue-return monitoring.</p></div>
 <div className="flex items-end"><p className="text-xs text-muted-foreground">You'll see Pending, Approved or Rejected here after submission.</p></div>
 {error&&<p className="text-sm text-destructive sm:col-span-2">{error}</p>}<div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={busy}>{busy?"Sending request…":"Send for approval"}</Button><Button type="button" variant="outline" onClick={()=>setShow(false)}>Cancel</Button></div>
 </form></SectionCard>}
 {error&&!show&&<p className="mb-3 text-sm text-destructive">{error}</p>}
 <SectionCard title="My movement requests" description="Request status, departure and expected return times">{items.length===0?<EmptyState title="No movement requests" description="Your submitted requests and movement history will appear here."/>:<div className="space-y-3">{items.map(m=><article key={m.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold capitalize">{m.type||"movement"} · {m.reason}</p><p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5"/>{m.destination||"Destination not provided"}</p></div><StatusBadge status={m.status}/></div><div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3"><p>Submitted: {fmt(m.submittedAt)}</p><p>Expected return: {fmt(m.requestedDateTime)}</p><p>{m.actualReturn?"Returned: "+fmt(m.actualReturn):m.approved_at?"Approved: "+fmt(m.approved_at):m.rejected_at?"Rejected: "+fmt(m.rejected_at):"Awaiting admin review"}</p></div>{m.remarks&&<p className="mt-2 text-sm">Admin remarks: {m.remarks}</p>}<div className="mt-3 flex gap-2">{m.status==="pending"&&<Button size="sm" variant="outline" onClick={()=>cancel(m.id)}>Cancel request</Button>}{["approved","out"].includes(m.status)&&<Button size="sm" variant="outline" onClick={()=>markReturned(m.id)}>Mark returned</Button>}</div></article>)}</div>}</SectionCard></>;
}
