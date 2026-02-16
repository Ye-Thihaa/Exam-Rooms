import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  FileText,
  School,
  Settings,
  ChevronDown,
  Armchair,
  History,
  BookUser,
  LoaderCircle,
  LayoutGrid,
  TriangleAlert,
  UserSquare2,
  PlusCircle,
  Building2,
  CalendarCheck,
  DoorClosed,
  Grid3x3,
  UserCog,
  ClipboardCheck,
  AlertCircle,
  Database,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  danger?: boolean;
  color?: string; // Custom color for specific routes
}

const roleNavItems: Record<string, NavItem[]> = {
  exam_officer: [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/exam-officer",
      color: "text-blue-500",
    },
    {
      icon: BookUser,
      label: "User Manual",
      path: "/exam-officer/user-manual",
      color: "text-purple-500",
    },
    {
      icon: UserSquare2,
      label: "Student Records",
      path: "/exam-officer/students",
      color: "text-violet-500",
    },
    {
      icon: PlusCircle,
      label: "Create Exam",
      path: "/exam-officer/create-exam",
      color: "text-green-500",
    },
    {
      icon: Building2,
      label: "Room Capacity",
      path: "/exam-officer/rooms",
      color: "text-orange-500",
    },
    {
      icon: CalendarCheck,
      label: "Exam Schedules",
      path: "/exam-officer/exams",
      color: "text-cyan-500",
    },
    {
      icon: DoorClosed,
      label: "Room Assignment",
      path: "/exam-officer/room-assignment",
      color: "text-pink-500",
    },
    {
      icon: Settings,
      label: "Manage Rooms",
      path: "/exam-officer/room-management",
      color: "text-gray-500",
    },
    {
      icon: Grid3x3,
      label: "Seating Plans",
      path: "/exam-officer/seating",
      color: "text-sky-500",
    },
    {
      icon: ListOrdered,
      label: "Room Ranges",
      path: "/exam-officer/room-ranges",
      color: "text-teal-500",
    },
    {
      icon: AlertCircle,
      label: "Special Exams",
      path: "/exam-officer/special-exams",
      color: "text-amber-500",
    },
    {
      icon: Users,
      label: "Teacher Records",
      path: "/exam-officer/teacher-view",
      color: "text-indigo-500",
    },
    {
      icon: UserCog,
      label: "Teacher Assignments",
      path: "/exam-officer/teacher-assignments",
      color: "text-emerald-500",
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

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  if (!user) return null;

  const navItems = roleNavItems[user.role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex-shrink-0
          bg-sidebar text-sidebar-foreground
          transform transition-transform duration-200 ease-in-out
          lg:transform-none
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ background: "var(--gradient-sidebar)" }}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-sidebar-foreground">
                  ExamRoom
                </h1>
                <p className="text-xs text-sidebar-foreground/70">
                  University System
                </p>
              </div>
            </div>
          </div>

          {/* Role Badge */}
          <div className="px-4 py-3">
            <div className="bg-sidebar-accent/50 rounded-lg px-3 py-2">
              <p className="text-xs text-sidebar-foreground/70">Logged in as</p>
              <p className="text-sm font-medium text-sidebar-foreground">
                {roleLabels[user.role]}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) =>
              item.danger ? (
                <React.Fragment key={item.path}>
                  {/* Divider before Danger Zone */}
                  <div className="my-2 border-t border-red-500/20" />
                  <NavLink
                    to={item.path}
                    end
                    className={({ isActive }) =>
                      [
                        "nav-item border-l-2 transition-colors",
                        isActive
                          ? "border-red-500 bg-red-500/10 text-red-400"
                          : "border-transparent text-red-400/70 hover:border-red-500 hover:bg-red-500/10 hover:text-red-400",
                      ].join(" ")
                    }
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5 text-red-500" />
                    <span>{item.label}</span>
                  </NavLink>
                </React.Fragment>
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === `/${user.role}` || item.path === "/admin"}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className={`h-5 w-5 ${item.color || ""}`} />
                  <span>{item.label}</span>
                </NavLink>
              ),
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                <User className="h-5 w-5 text-sidebar-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-sidebar-foreground/70 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full mt-3 justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background border-b border-border px-4 lg:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-muted"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <div className="hidden sm:block">
              <h2 className="text-lg font-semibold text-foreground">
                {roleLabels[user.role]} Portal
              </h2>
            </div>
          </div>

          {/* User dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="hidden sm:block text-sm font-medium">
                {user.name}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border z-50 py-2">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
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
