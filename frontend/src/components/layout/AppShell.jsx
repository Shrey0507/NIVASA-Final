import { Outlet, useLocation } from "react-router-dom";

import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";

/**
 * Shared shell for the admin and student experiences. Keeping one shell makes
 * both dashboards feel like the same product while allowing different nav.
 */
export function AppShell({
  nav,
  subtitle,
  user,
  role,
  onLogout,
  title,
  actions,
}) {
  const { pathname } = useLocation();
  const current = [...nav]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) =>
      item.end ? pathname === item.to : pathname.startsWith(item.to),
    );
  const resolvedTitle = title ?? current?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        items={nav}
        subtitle={subtitle}
        user={user}
        role={role}
        onLogout={onLogout}
        className="fixed inset-y-0 left-0 z-40 hidden lg:flex"
      />

      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <Topbar
          title={resolvedTitle}
          nav={nav}
          subtitle={subtitle}
          user={user}
          role={role}
          onLogout={onLogout}
          actions={actions}
        />
        <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
