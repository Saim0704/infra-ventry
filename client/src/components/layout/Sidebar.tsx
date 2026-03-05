import { Link, useLocation } from "wouter";
import { LayoutDashboard, Server, Database, Cloud, Globe, Settings, LogOut, Terminal, Folder, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: Folder },
    { href: "/servers", label: "Servers", icon: Server },
    { href: "/databases", label: "Databases", icon: Database },
    { href: "/clusters", label: "Kubernetes", icon: Cloud },
    { href: "/web-monitoring", label: "Web Monitoring", icon: Activity },
    { href: "/domain-monitoring", label: "Domain Monitoring", icon: Globe },
  ];

  const { user } = useAuth();
  const userInitials = user ? (user.username?.slice(0, 2).toUpperCase() || "US") : "??";

  return (
    <div className="h-screen w-64 bg-card border-r border-border flex flex-col fixed left-0 top-0 z-50 shadow-xl">
      <div className="p-6 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
            <Terminal className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-none">InfraWatch</h1>
            <span className="text-xs text-muted-foreground font-medium">System Monitor</span>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 translate-x-1"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:translate-x-1"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50 bg-secondary/10 space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-background/50 rounded-xl border border-border/40">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            {userInitials}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate">{user?.username}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>

        <Link href="/settings">
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-xl font-medium transition-all duration-200 cursor-pointer group",
              location === "/settings"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:translate-x-1"
            )}
          >
            <Settings className={cn("h-5 w-5", location === "/settings" ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
            Settings
          </div>
        </Link>

        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 px-4 py-2 rounded-xl font-medium text-destructive hover:bg-destructive/10 hover:translate-x-1 transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
