import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  User,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Shield,
  Settings,
  ChevronDown,
  BookUser,
  TriangleAlert,
  UserSquare2,
  PlusCircle,
  Building2,
  CalendarCheck,
  DoorClosed,
  Grid3x3,
  UserCog,
  AlertCircle,
  ListOrdered,
  ClipboardEdit,
  ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  danger?: boolean;
}

const roleNavItems: Record<string, NavItem[]> = {
  exam_officer: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/exam-officer" },
    { icon: BookUser, label: "User Manual", path: "/exam-officer/user-manual" },
    {
      icon: UserSquare2,
      label: "Student Records",
      path: "/exam-officer/students",
    },
    {
      icon: PlusCircle,
      label: "Insert Data",
      path: "/exam-officer/insert-data",
    },
    { icon: Building2, label: "Room Capacity", path: "/exam-officer/rooms" },
    {
      icon: CalendarCheck,
      label: "Exam Schedules",
      path: "/exam-officer/exams",
    },
    {
      icon: DoorClosed,
      label: "Room Assignment",
      path: "/exam-officer/room-assignment",
    },
    {
      icon: Settings,
      label: "Manage Rooms",
      path: "/exam-officer/room-management",
    },
    { icon: Grid3x3, label: "Seating Plans", path: "/exam-officer/seating" },
    {
      icon: ListOrdered,
      label: "Room Ranges",
      path: "/exam-officer/room-ranges",
    },
    {
      icon: AlertCircle,
      label: "Special Exams",
      path: "/exam-officer/special-exams",
    },
    {
      icon: Users,
      label: "Teacher Records",
      path: "/exam-officer/teacher-view",
    },
    {
      icon: UserCog,
      label: "Assign Teachers",
      path: "/exam-officer/assign-teachers",
    },
    {
      icon: ClipboardEdit,
      label: "Teacher Assignments",
      path: "/exam-officer/teacher-assignments",
    },
    {
      icon: TriangleAlert,
      label: "Danger Zone",
      path: "/exam-officer/danger-zone",
      danger: true,
    },
  ],
};

const roleLabels: Record<string, string> = {
  exam_officer: "Exam Officer",
};

const navSections: Record<
  string,
  { title: string; icon: React.ElementType; items: string[] }[]
> = {
  exam_officer: [
    {
      title: "Overview",
      icon: LayoutDashboard,
      items: ["/exam-officer", "/exam-officer/user-manual"],
    },
    {
      title: "Students",
      icon: UserSquare2,
      items: ["/exam-officer/students", "/exam-officer/insert-data"],
    },
    {
      title: "Rooms & Exams",
      icon: Building2,
      items: [
        "/exam-officer/rooms",
        "/exam-officer/exams",
        "/exam-officer/room-assignment",
        "/exam-officer/room-management",
        "/exam-officer/seating",
        "/exam-officer/room-ranges",
        "/exam-officer/special-exams",
      ],
    },
    {
      title: "Teachers",
      icon: Users,
      items: [
        "/exam-officer/teacher-view",
        "/exam-officer/assign-teachers",
        "/exam-officer/teacher-assignments",
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Module-level scroll position
// ─────────────────────────────────────────────────────────────────────────────

let savedNavScroll = 0;

// ─────────────────────────────────────────────────────────────────────────────
// SidebarNav
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarNavProps {
  role: string;
  onNavigate: () => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ role, onNavigate }) => {
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);

  const sections = navSections[role] || [];

  // Only open the section that contains the current route on first render
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        sections.map((s) => [s.title, s.items.includes(pathname)]),
      ),
  );

  // When navigating to a new route, open its section — but leave others as-is
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;
    const activeSection = sections.find((s) => s.items.includes(pathname));
    if (activeSection) {
      setOpenSections((prev) => ({ ...prev, [activeSection.title]: true }));
    }
  }, [pathname]);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const save = () => {
      savedNavScroll = el.scrollTop;
    };
    el.addEventListener("scroll", save, { passive: true });
    return () => el.removeEventListener("scroll", save);
  }, []);

  useLayoutEffect(() => {
    if (navRef.current) navRef.current.scrollTop = savedNavScroll;
  });

  const items = roleNavItems[role] || [];
  const dangerItem = items.find((i) => i.danger);
  const getItem = (path: string) => items.find((i) => i.path === path);
  const isActive = (path: string) => pathname === path;

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const renderItem = (item: NavItem) => {
    if (item.danger) return null;
    const active = isActive(item.path);
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end
        className={() =>
          [
            "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
            active
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent/40",
          ].join(" ")
        }
        onClick={onNavigate}
      >
        {/* Active left accent bar */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary-foreground/60" />
        )}
        <item.icon
          className={`h-4 w-4 flex-shrink-0 transition-all duration-150 ${
            active ? "opacity-100" : "opacity-100"
          }`}
        />
        <span className="truncate leading-none">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <nav
      ref={navRef}
      className="flex-1 px-3 py-3 overflow-y-auto space-y-1"
      style={{ scrollbarWidth: "none" }}
    >
      {sections.map((section) => {
        const isOpen = openSections[section.title];
        // Check if any item in section is active (to highlight section header)
        const hasActive = section.items.some((p) => isActive(p));

        return (
          <div key={section.title} className="mb-1">
            {/* Section header — clickable, collapsible */}
            <button
              onClick={() => toggleSection(section.title)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                text-[11px] font-bold uppercase tracking-[0.1em]
                transition-all duration-150 group
                text-sidebar-foreground hover:bg-sidebar-accent/30
              `}
            >
              <section.icon className="h-3.5 w-3.5 flex-shrink-0 opacity-80" />
              <span className="flex-1 text-left">{section.title}</span>
              <ChevronRight
                className={`h-3 w-3 opacity-60 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
              />
            </button>

            {/* Section items with animated reveal */}
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {/* Vertical rule connecting items */}
              <div className="relative pl-[22px] ml-3 border-l border-sidebar-border/20 mt-0.5 mb-1 space-y-0.5">
                {section.items.map((path) => {
                  const item = getItem(path);
                  return item ? renderItem(item) : null;
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* Danger Zone */}
      {dangerItem && (
        <div className="pt-2">
          <div className="mx-1 mb-3 border-t border-red-500/15" />
          <div className="px-3 mb-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-red-400">
              <Shield className="h-2.5 w-2.5" />
              Restricted Access
            </span>
          </div>
          <NavLink
            to={dangerItem.path}
            end
            className={({ isActive: a }) =>
              [
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150",
                a
                  ? "bg-red-500/15 text-red-400 border border-red-500/20"
                  : "text-red-400 hover:bg-red-500/10 border border-transparent",
              ].join(" ")
            }
            onClick={onNavigate}
          >
            <dangerItem.icon className="h-4 w-4 flex-shrink-0" />
            <span>{dangerItem.label}</span>
          </NavLink>
        </div>
      )}
    </nav>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DashboardLayout
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex-shrink-0
          bg-sidebar text-sidebar-foreground flex flex-col
          border-r border-sidebar-border/30
          transform transition-transform duration-200 ease-in-out
          lg:transform-none
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ background: "var(--gradient-sidebar)" }}
      >
        {/* ── Brand header — bold, structured ── */}
        <div className="px-4 pt-5 pb-4 border-b border-sidebar-border/20">
          <div className="flex items-center gap-3">
            {/* Icon block with strong presence */}
            <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-sidebar-primary/30">
              <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <p className="text-[15px] font-black tracking-tight text-sidebar-foreground leading-none">
                ExamRoom
              </p>
              <p className="text-[10px] text-sidebar-foreground/70 mt-0.5 tracking-wide uppercase font-medium">
                University System
              </p>
            </div>
          </div>

          {/* Role badge — structured pill */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-sidebar-accent/30 border border-sidebar-border/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
              <span className="text-[11px] font-semibold text-sidebar-foreground uppercase tracking-widest">
                {roleLabels[user.role]}
              </span>
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <SidebarNav role={user.role} onNavigate={closeSidebar} />

        {/* ── User footer — structured card ── */}
        <div className="p-3 border-t border-sidebar-border/20">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sidebar-accent/20 border border-sidebar-border/15 group">
            {/* Avatar with ring */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 border-2 border-sidebar-primary/30 flex items-center justify-center">
                <User className="h-4 w-4 text-sidebar-foreground" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-sidebar" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-sidebar-foreground truncate leading-tight">
                {user.name}
              </p>
              <p className="text-[10px] text-sidebar-foreground/70 truncate mt-0.5">
                {user.email}
              </p>
            </div>

            <button
              onClick={handleLogout}
              title="Sign out"
              className="opacity-0 group-hover:opacity-100 transition-all duration-150 p-1.5 rounded-lg hover:bg-red-500/15 text-sidebar-foreground hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border h-14 px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              <span className="opacity-40">/</span>
              <span className="font-semibold text-foreground">
                {roleLabels[user.role]} Portal
              </span>
            </div>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {roleLabels[user.role]}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-48 bg-card rounded-lg shadow-lg border border-border z-50 overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <div className="p-1">
                    <button
                      className="w-full px-3 py-1.5 text-left text-sm rounded-md hover:bg-muted flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
