import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  Users2,
  Route,
  MonitorPlay,
  Settings,
  LogOut,
  Sun,
  Moon,
  SunMoon,
  Milestone,
  BriefcaseBusiness,
  Tags,
  MapPinned,
} from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";
import { getRole, logout, isAuthEnabled } from "../api/client";
import { GlassSidebarShell, GlassNavItem, GlassNavGroup } from "../design-system/GlassSidebar";
import { GlassButton } from "../design-system/GlassButton";

const MODES = [
  { key: "auto", label: "Auto", icon: SunMoon },
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
] as const;

/**
 * TopNav - the app's command bar.
 *
 * NAV REDESIGN: Dashboard used to be a dropdown group that also held
 * Route Planner/Route Plan Sheet/Replacement Forecast. Per the redesign,
 * Dashboard is now a plain top-level link (no dropdown - it opens
 * directly to "/", and Overview vs. Analytics is chosen *inside* the
 * Dashboard page instead). Route Planner/Route Plan Sheet/Replacement
 * Forecast moved out into their own top-level "Route Planning" item
 * (still no dropdown - RoutePlanningLayout renders a persistent toolbar
 * for switching between those three instantly). The three former
 * Dashboard tabs that didn't fit the new "just Overview + Analytics"
 * shape (Driver Mapping Review, Diagnostics, Dashboard Configuration)
 * moved into the Admin group as their own routed pages - same
 * functionality, same admin-only gating, just reachable from Admin
 * instead of a Dashboard tab.
 */
export default function TopNav() {
  const { mode, setMode } = useTheme();
  const navigate = useNavigate();
  const role = getRole();

  return (
    <GlassSidebarShell>
      <img src="/app-icon.png" alt="" width={28} height={28} className="mr-1.5 rounded-[7px]" />
      <span className="mr-6 text-[15px] font-black tracking-tight text-white">DISPATCH OPS</span>

      <GlassNavItem layoutId="nav-pill" to="/" end label="Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
      <GlassNavItem layoutId="nav-pill" to="/route-planner" label="Route Planning" icon={<Milestone className="h-4 w-4" />} />

      <GlassNavGroup
        layoutId="nav-pill"
        label="Services"
        icon={<BriefcaseBusiness className="h-4 w-4" />}
        items={[
          { to: "/price-change", label: "Price Change Portal", icon: <Tags className="h-4 w-4" /> },
        ]}
      />

      <GlassNavGroup
        layoutId="nav-pill"
        label="Fleet Data"
        icon={<Database className="h-4 w-4" />}
        items={[
          { to: "/fleet", label: "Fleet Database" },
          { to: "/vacations", label: "Vacations" },
          { to: "/experience", label: "Experience" },
        ]}
      />

      <GlassNavGroup
        layoutId="nav-pill"
        label="Customer Intelligence"
        icon={<Users2 className="h-4 w-4" />}
        items={[
          { to: "/customer-intelligence", label: "Customer Area Intelligence" },
          { to: "/location-knowledge", label: "Customer Knowledge", icon: <MapPinned className="h-4 w-4" /> },
        ]}
      />
      <GlassNavItem layoutId="nav-pill" to="/route-intelligence" label="Route Intel" icon={<Route className="h-4 w-4" />} />
      <GlassNavItem layoutId="nav-pill" to="/control-center" label="Control Center" icon={<MonitorPlay className="h-4 w-4" />} />

      {/* BUGFIX (Admin Settings must always be visible): this check
          itself was never the bug - `role` legitimately gates the Admin
          group. The actual fix is in getRole() (api/client.ts): it used
          to return null - hiding this whole group - any time the
          backend hadn't yet confirmed AUTH_DISABLED, which included
          "backend unreachable" forever. getRole() now defaults to
          "admin" in that unknown case, since this app's default
          deployment has no auth at all. See client.ts for the full
          reasoning. */}
      {role === "admin" && (
        <GlassNavGroup
          layoutId="nav-pill"
          label="Admin"
          icon={<Settings className="h-4 w-4" />}
          items={[
            { to: "/ai-settings", label: "AI Settings" },
            { to: "/data-sync", label: "Cloud Connection" },
            { to: "/backup", label: "Backup & Restore" },
            { to: "/imports", label: "SAP / Landmark Imports" },
            { to: "/audit-log", label: "Audit Log" },
            { to: "/driver-mapping-review", label: "Driver Mapping Review" },
            { to: "/diagnostics", label: "Diagnostics" },
            { to: "/dashboard-configuration", label: "Dashboard Configuration" },
          ]}
        />
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-0.5 rounded-lg bg-[var(--navy3)] p-1">
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            aria-label={label}
            title={label}
            className={
              "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-colors " +
              (mode === key ? "bg-[var(--blue)] text-white" : "text-muted hover:text-ink")
            }
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>

      {isAuthEnabled() && (
        <GlassButton
          variant="secondary"
          size="sm"
          className="ml-3"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </GlassButton>
      )}
    </GlassSidebarShell>
  );
}
