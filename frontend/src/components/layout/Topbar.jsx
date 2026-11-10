import { Bell, Menu, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyNotices } from "@/services/studentService";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeMenu } from "./ThemeMenu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function Topbar({
  title,
  nav,
  subtitle,
  user,
  role,
  onLogout,
  actions,
  showNotifications = false,
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  useEffect(() => {
    if (!showNotifications || !notificationsOpen) return;
    let active = true;
    setNotificationsLoading(true);
    setNotificationsError("");
    getMyNotices()
      .then((items) => { if (active) setNotifications(items.slice(0, 8)); })
      .catch((error) => { if (active) setNotificationsError(error.message || "Unable to load notifications."); })
      .finally(() => { if (active) setNotificationsLoading(false); });
    return () => { active = false; };
  }, [showNotifications, notificationsOpen]);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {/* Mobile navigation */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[264px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar
            items={nav}
            subtitle={subtitle}
            user={user}
            role={role}
            onLogout={onLogout}
          />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        {actions}
        <Button variant="ghost" size="icon" aria-label="Search" className="hidden sm:inline-flex">
          <Search />
        </Button>
        {showNotifications && (
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications" title="Notifications">
                <Bell />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted-foreground">Latest hostel announcements</p>
                </div>
                <Link to="/student/notices" onClick={() => setNotificationsOpen(false)} className="text-xs font-medium text-primary hover:underline">View all</Link>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notificationsLoading ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading notifications…</p>
                ) : notificationsError ? (
                  <p className="px-4 py-6 text-center text-sm text-destructive">{notificationsError}</p>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
                ) : notifications.map((notice) => (
                  <Link key={notice.id} to="/student/notices" onClick={() => setNotificationsOpen(false)} className="block border-b px-4 py-3 last:border-0 hover:bg-muted/50">
                    <p className="text-sm font-medium">{notice.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notice.body || "New hostel announcement"}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{notice.publishDate ? new Date(notice.publishDate).toLocaleDateString() : ""}</p>
                  </Link>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <ThemeMenu />
        <Avatar className="ml-1 size-8">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {user?.charAt(0)?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
