import { Link, useLocation } from "@tanstack/react-router";
import { Home, Camera, Footprints, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/snap", label: "Snap", icon: Camera },
  { to: "/steps", label: "Steps", icon: Footprints },
  { to: "/friends", label: "Social", icon: Users },
  { to: "/settings", label: "Me", icon: Settings },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 glass-card">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2 safe-bottom">
        {items.map((it) => {
          const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
          const isSnap = it.to === "/snap";
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-xs transition",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                isSnap && "relative -mt-6"
              )}
            >
              <span className={cn(
                "flex items-center justify-center rounded-full transition",
                isSnap ? "h-14 w-14 bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "h-9 w-9"
              )}>
                <Icon className={isSnap ? "h-7 w-7" : "h-5 w-5"} strokeWidth={2.2} />
              </span>
              {!isSnap && <span className="font-medium">{it.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
