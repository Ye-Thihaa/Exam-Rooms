import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  User,
  BookOpen,
  Users,
} from "lucide-react";
import { UiTLogo } from "@/components/UitLogo";

const roleInfo = [
  {
    role: "admin",
    label: "Administrator",
    email: "admin@university.edu",
    password: "admin123",
    icon: Shield,
    description: "Full system access",
  },
  {
    role: "exam_officer",
    label: "Exam Officer",
    email: "examofficer@university.edu",
    password: "officer123",
    icon: BookOpen,
    description: "Manage exams & seating",
  },
  {
    role: "invigilator",
    label: "Invigilator",
    email: "invigilator@university.edu",
    password: "invig123",
    icon: Users,
    description: "View assignments",
  },
  {
    role: "student",
    label: "Student",
    email: "student@university.edu",
    password: "student123",
    icon: User,
    description: "View exam schedule",
  },
];

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await login(email, password);

    if (result.success) {
      // Get user role and redirect
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
      {/* Left side - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-2/5 flex-col justify-between p-12"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div>
          <div className="flex items-center gap-3">
            <UiTLogo size={48} className="text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white">ExamRoom</h1>
              <p className="text-white/70 text-sm">University System</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Exam Room
            <br />
            Generator
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            Streamline your university examination process with intelligent room
            allocation and seating management.
          </p>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
              <p className="text-3xl font-bold text-white">500+</p>
              <p className="text-white/70 text-sm">Students</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
              <p className="text-3xl font-bold text-white">20+</p>
              <p className="text-white/70 text-sm">Exam Halls</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
              <p className="text-3xl font-bold text-white">50+</p>
              <p className="text-white/70 text-sm">Exams/Month</p>
            </div>
          </div>
        </div>

        <p className="text-white/50 text-sm">
          © 2024 University Examination System
        </p>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <UiTLogo size={48} />
              <div className="text-left">
                <h1 className="text-xl font-bold text-foreground">ExamRoom</h1>
                <p className="text-muted-foreground text-sm">
                  University System
                </p>
              </div>
            </div>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-2 text-muted-foreground">
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input pl-10"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input pl-10 pr-10"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Quick login cards */}
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Demo accounts (click to auto-fill)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {roleInfo.map((role) => (
                <button
                  key={role.role}
                  onClick={() => handleQuickLogin(role.email, role.password)}
                  className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <role.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {role.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {role.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
