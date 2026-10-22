import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NivasaLogo } from "@/components/ui/nivasa-logo";

function Brand({ subtitle }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <NivasaLogo size={34} />
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight">NIVASA</p>
        <p className="text-[11px] font-medium text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export function SidebarNav({ items }) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-sm",
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function SidebarUser({ name, role, onLogout }) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {name?.charAt(0)?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{role}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onLogout}
          aria-label="Sign out"
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut />
        </Button>
      </div>
    </div>
  );
}

export function AppSidebar({
  items,
  subtitle,
  user,
  role,
  onLogout,
  className,
}) {
  return (
    <aside
      className={cn(
        "flex h-full w-[264px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-3">
        <Brand subtitle={subtitle} />
      </div>
      <SidebarNav items={items} />
      <SidebarUser name={user} role={role} onLogout={onLogout} />
    </aside>
  );
}
