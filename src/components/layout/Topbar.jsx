import { Bell, Menu, Search } from "lucide-react";

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

export function Topbar({
  title,
  nav,
  subtitle,
  user,
  role,
  onLogout,
  actions,
}) {
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
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell />
        </Button>
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
