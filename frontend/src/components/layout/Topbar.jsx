import { Bell, Menu, UserRound, LogOut, ShieldCheck, GraduationCap } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function Topbar({
  title,
  nav,
  subtitle,
  user,
  role,
  onLogout,
  actions,
  showNotifications = false,
  profile,
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open profile" title="Profile" className="ml-1 rounded-full p-0">
              <Avatar className="size-8 ring-1 ring-border">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {user?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={10} className="w-[min(19rem,calc(100vw-2rem))] p-0">
            <div className="border-b px-4 pb-4 pt-5 text-center">
              <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-primary shadow-sm"><UserRound className="size-7" /></div>
              <p className="truncate text-sm font-semibold">{profile?.full_name || user || "NIVASA User"}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{profile?.email || "Account profile"}</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                {role === "Student" ? <GraduationCap className="size-3" /> : <ShieldCheck className="size-3" />}{role || "User"}
              </span>
            </div>
            <div className="space-y-2 px-4 py-3 text-xs">
              {profile?.usn && <div className="flex justify-between gap-3"><span className="text-muted-foreground">USN</span><span className="font-medium">{profile.usn}</span></div>}
              {profile?.department && <div className="flex justify-between gap-3"><span className="text-muted-foreground">Department</span><span className="font-medium">{profile.department}</span></div>}
              {profile?.hostel && <div className="flex justify-between gap-3"><span className="text-muted-foreground">Hostel</span><span className="font-medium capitalize">{profile.hostel}</span></div>}
              {profile?.phone && <div className="flex justify-between gap-3"><span className="text-muted-foreground">Phone</span><span className="font-medium">{profile.phone}</span></div>}
              {!profile?.usn && !profile?.department && !profile?.hostel && !profile?.phone && <p className="text-center text-muted-foreground">Your account details are shown here.</p>}
            </div>
            <div className="border-t p-2">
    <Button variant="ghost" className="w-full justify-start text-sm text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setLogoutConfirmOpen(true)}>
      <LogOut className="mr-2 size-4" />Sign out
    </Button>
  </div>
          </PopoverContent>
        </Popover>
        <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <LogOut className="size-5" />
              </div>
              <DialogTitle>Sign out of NIVASA?</DialogTitle>
              <DialogDescription>
                Are you sure you want to sign out? You will need to log in again to access your hostel dashboard.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { setLogoutConfirmOpen(false); onLogout?.(); }}>Yes, sign out</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
