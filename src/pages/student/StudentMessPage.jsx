import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { getMyMess } from "@/services/studentService";
const meals = ["breakfast", "lunch", "snacks", "dinner"];
export default function StudentMessPage() { const [menus, setMenus] = useState([]); const [error, setError] = useState(""); useEffect(() => { getMyMess().then(setMenus).catch((e) => setError(e.message)); }, []); return <><PageHeader title="Mess menu" description="Published meal plans from the hostel office."/>{error ? <EmptyState title="Unable to load menu" description={error}/> : menus.length === 0 ? <EmptyState title="No menu published" description="Check again later."/> : <div className="grid gap-4 md:grid-cols-2">{menus.map((day) => <SectionCard key={day.id || day.menu_date} title={day.menu_date || day.date}><div className="grid gap-3 sm:grid-cols-2">{meals.map((meal) => { const value = day[meal]; if (!value) return null; const items = Array.isArray(value) ? value : value.items || []; return <div key={meal} className="rounded-lg border p-3"><p className="font-medium capitalize">{meal}</p><p className="mt-1 text-sm text-muted-foreground">{items.join(" · ")}</p></div>; })}</div></SectionCard>)}</div>}</>; }
