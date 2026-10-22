import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { getMyNotices } from "@/services/studentService";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
export default function StudentNoticesPage() { const [items, setItems] = useState([]); const [search, setSearch] = useState(""); const [error, setError] = useState(""); useEffect(() => { getMyNotices().then(setItems).catch((e) => setError(e.message)); }, []); const filtered = items.filter((n) => `${n.title} ${n.body}`.toLowerCase().includes(search.toLowerCase())); return <><PageHeader title="Notices" description="Announcements from the hostel office."/><Input className="mb-4 max-w-sm" placeholder="Search notices" value={search} onChange={(e) => setSearch(e.target.value)}/>{error ? <EmptyState title="Unable to load notices" description={error}/> : filtered.length === 0 ? <EmptyState icon={Bell} title="No notices found" description="Published notices will appear here."/> : <div className="grid gap-4 md:grid-cols-2">{filtered.map((n) => <SectionCard key={n.id} title={n.title}><p className="text-sm text-muted-foreground">{n.body}</p><p className="mt-3 text-xs text-muted-foreground">{n.author || "Hostel office"}</p></SectionCard>)}</div>}</>; }
