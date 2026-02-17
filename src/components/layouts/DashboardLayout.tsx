import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  DoorOpen,
  ClipboardList,
  Calendar,
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
// Static data — defined at module scope so identity never changes between renders
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
  invigilator: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/invigilator" },
    { icon: BookOpen, label: "Assigned Exams", path: "/invigilator/exams" },
    { icon: DoorOpen, label: "Assigned Rooms", path: "/invigilator/rooms" },
    {
      icon: ClipboardList,
      label: "Seating Plans",
      path: "/invigilator/seating",
    },
    { icon: Calendar, label: "Schedule", path: "/invigilator/schedule" },
  ],
  student: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/student" },
    { icon: Calendar, label: "Exam Timetable", path: "/student/timetable" },
    { icon: DoorOpen, label: "My Seat Info", path: "/student/seat" },
    { icon: BookOpen, label: "Exam Details", path: "/student/exams" },
  ],
};

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  exam_officer: "Exam Officer",
  invigilator: "Invigilator",
  student: "Student",
};

const navSections: Record<string, { title: string; items: string[] }[]> = {
  exam_officer: [
    {
      title: "Overview",
      items: ["/exam-officer", "/exam-officer/user-manual"],
    },
    {
      title: "Students & Data",
      items: ["/exam-officer/students", "/exam-officer/insert-data"],
    },
    {
      title: "Rooms & Exams",
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
      items: [
        "/exam-officer/teacher-view",
        "/exam-officer/assign-teachers",
        "/exam-officer/teacher-assignments",
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SidebarNav — MUST be a top-level (module-scope) component, NOT defined inside
// DashboardLayout. If defined inside, React treats it as a new component type
// on every parent render and fully unmounts + remounts it, resetting scrollTop.
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarNavProps {
  role: string;
  onNavigate: () => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ role, onNavigate }) => {
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const savedScroll = useRef(0);

  // Persist scroll position on every scroll
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const save = () => {
      savedScroll.current = el.scrollTop;
    };
    el.addEventListener("scroll", save, { passive: true });
    return () => el.removeEventListener("scroll", save);
  }, []);

  // Restore after every render (route changes cause a render)
  // No dep array — runs after every render so it always fires before paint
  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = savedScroll.current;
    }
  });

  const items = roleNavItems[role] || [];
  const sections = navSections[role];
  const dangerItem = items.find((i) => i.danger);
  const getItem = (path: string) => items.find((i) => i.path === path);
  const isActive = (path: string) => pathname === path;

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
            "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
            active
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
          ].join(" ")
        }
        onClick={onNavigate}
      >
        <item.icon
          className={`h-4 w-4 flex-shrink-0 transition-colors ${
            active
              ? "text-sidebar-primary-foreground"
              : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
          }`}
        />
        <span className="truncate">{item.label}</span>
        {active && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
      </NavLink>
    );
  };

  const renderDangerItem = (item: NavItem) => {
    const active = isActive(item.path);
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end
        className={() =>
          [
            "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border",
            active
              ? "bg-red-500/15 border-red-500/40 text-red-400"
              : "border-transparent text-red-400/60 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400",
          ].join(" ")
        }
        onClick={onNavigate}
      >
        <item.icon className="h-4 w-4 flex-shrink-0 text-red-500" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <nav
      ref={navRef}
      className="flex-1 px-3 py-3 overflow-y-auto space-y-4"
      style={{ scrollbarWidth: "thin" }}
    >
      {sections ? (
        <>
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/35">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((path) => {
                  const item = getItem(path);
                  return item ? renderItem(item) : null;
                })}
              </div>
            </div>
          ))}

          {dangerItem && (
            <div className="pt-2">
              <div className="mx-2 mb-2 border-t border-red-500/20" />
              <div className="flex items-center gap-1.5 px-3 mb-1">
                <Shield className="h-3 w-3 text-red-400/60" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/60">
                  Restricted
                </p>
              </div>
              {renderDangerItem(dangerItem)}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-0.5">
          {items.filter((i) => !i.danger).map(renderItem)}
          {dangerItem && (
            <>
              <div className="mx-2 my-3 border-t border-red-500/20" />
              {renderDangerItem(dangerItem)}
            </>
          )}
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
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex-shrink-0
          bg-sidebar text-sidebar-foreground flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:transform-none
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ background: "var(--gradient-sidebar)" }}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-sidebar-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sidebar-primary/90 flex items-center justify-center shadow-inner">
              <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wide text-sidebar-foreground uppercase">
                ExamRoom
              </p>
              <p className="text-[10px] font-medium text-sidebar-foreground/50 tracking-widest uppercase">
                University System
              </p>
            </div>
          </div>
        </div>

        {/* Role pill */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/30 border border-sidebar-border/30">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                Active Role
              </p>
              <p className="text-xs font-semibold text-sidebar-foreground">
                {roleLabels[user.role]}
              </p>
            </div>
          </div>
        </div>

        {/* Stable nav component — scroll position is never lost */}
        <SidebarNav role={user.role} onNavigate={closeSidebar} />

        {/* User footer */}
        <div className="px-4 py-4 border-t border-sidebar-border/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center ring-2 ring-sidebar-border/40">
              <User className="h-4 w-4 text-sidebar-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                {user.name}
              </p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
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
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">/</span>
              <span className="font-semibold text-foreground">
                {roleLabels[user.role]} Portal
              </span>
            </div>
          </div>

          <div className="relative">
            <button
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
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
                <div className="absolute right-0 mt-2 w-52 bg-card rounded-xl shadow-xl border border-border z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-muted/30 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <div className="p-1">
                    <button
                      className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-muted flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
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
