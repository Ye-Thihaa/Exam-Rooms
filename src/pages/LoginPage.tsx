import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  BookOpen,
  Users,
  User,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { UiTLogo } from "@/components/UitLogo";

const roleInfo = [
  {
    role: "exam_officer",
    label: "Exam Officer",
    email: "examofficer@university.edu",
    password: "u!T3x@m0ff!c3R",
    icon: BookOpen,
    description: "Manage exams & seating",
    color: "from-violet-500 to-indigo-500",
  },
  {
    role: "invigilator",
    label: "Invigilator",
    email: "invigilator@university.edu",
    password: "invig123",
    icon: Users,
    description: "View assignments",
    color: "from-emerald-500 to-teal-500",
  },
  {
    role: "student",
    label: "Student",
    email: "student@university.edu",
    password: "student123",
    icon: User,
    description: "View exam schedule",
    color: "from-orange-500 to-amber-500",
  },
];

const features = [
  "Intelligent room allocation",
  "Automated seating plans",
  "Real-time schedule management",
  "Multi-role access control",
];

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login, isLoading, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const isProduction = import.meta.env.PROD;

  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case "exam_officer":
          navigate("/exam-officer", { replace: true });
          break;
        case "invigilator":
          navigate("/invigilator", { replace: true });
          break;
        case "student":
          navigate("/student", { replace: true });
          break;
        default:
          navigate("/", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = await login(email, password);
    if (result.success) {
      const user = roleInfo.find((r) => r.email === email);
      const redirectPath = user
        ? user.role === "exam_officer"
          ? "/exam-officer"
          : `/${user.role}`
        : "/";
      navigate(redirectPath);
    } else {
      setError(result.error || "Login failed");
    }
  };

  const handleQuickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left Panel ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-2/5 flex-col p-12 relative overflow-hidden"
        style={{ background: "var(--gradient-primary)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-8 w-48 h-48 rounded-full bg-white/5" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <UiTLogo size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              ExamRoom
            </h1>
            <p className="text-white/60 text-xs">University System</p>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-white/80" />
              <span className="text-white/80 text-xs font-medium">
                Examination Management Platform
              </span>
            </div>
            <h2 className="text-5xl font-bold text-white leading-[1.1] tracking-tight">
              Smarter
              <br />
              <span className="text-white/60">Exam</span>
              <br />
              Planning.
            </h2>
            <p className="text-white/65 text-base leading-relaxed max-w-xs">
              Streamline your university examination process with intelligent
              room allocation and seating management.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                <span className="text-white/75 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-white/35 text-xs">
          © {new Date().getFullYear()} University Examination System
        </p>
      </div>

      {/* ── Right Panel ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-background">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UiTLogo size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">ExamRoom</h1>
              <p className="text-muted-foreground text-xs">University System</p>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm">
              Sign in to access your portal
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/8 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email Address
              </label>
              <div
                className={`relative rounded-xl border transition-all duration-200 ${
                  focusedField === "email"
                    ? "border-primary ring-2 ring-primary/15"
                    : "border-border"
                } bg-background`}
              >
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-10 pr-4 py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none rounded-xl"
                  placeholder="your@university.edu"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div
                className={`relative rounded-xl border transition-all duration-200 ${
                  focusedField === "password"
                    ? "border-primary ring-2 ring-primary/15"
                    : "border-border"
                } bg-background`}
              >
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-10 pr-11 py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none rounded-xl"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold gap-2 group"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          {/* Quick login — dev only */}
          {!isProduction && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">
                  Demo accounts
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {roleInfo.map((role) => (
                  <button
                    key={role.role}
                    onClick={() => handleQuickLogin(role.email, role.password)}
                    className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-accent/40 transition-all text-center"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center shadow-sm`}
                    >
                      <role.icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-tight">
                        {role.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        {role.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
