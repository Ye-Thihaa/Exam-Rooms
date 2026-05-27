import {
  GraduationCap,
  Users,
  DoorOpen,
  LayoutGrid,
  UserCheck,
  Database,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Users, title: "Student Data", desc: "View records, exam schedules, and track retake or credit students in one place." },
  { icon: DoorOpen, title: "Room Management", desc: "Full CRUD for regular rooms and exam halls with capacity controls." },
  { icon: LayoutGrid, title: "Seating Plans", desc: "Pair students, generate seating arrangements, and persist them instantly." },
  { icon: UserCheck, title: "Teacher Assignments", desc: "Assign invigilators to specific rooms and exam dates with a few clicks." },
  { icon: Database, title: "Real-time Database", desc: "Powered by Supabase — every change syncs across officers, students, and teachers." },
  { icon: GraduationCap, title: "Officer Workflow", desc: "From dashboard to assignment in five guided steps designed for exam offices." },
];

const steps = ["View Dashboard", "Select Room", "Pair Students", "Generate Seating", "Assign Teachers"];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">ExamOps</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition hover:text-foreground">Features</a>
            <a href="#workflow" className="text-sm text-muted-foreground transition hover:text-foreground">Workflow</a>
            <a href="#about" className="text-sm text-muted-foreground transition hover:text-foreground">About</a>
          </nav>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5">
            Login
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Exam Administration, Simplified
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Run every exam day with
              <span className="block bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, var(--color-primary), oklch(0.5 0.085 188))" }}>
                clarity and control.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              The Exam Management System helps officers manage students, rooms, seating plans, and teacher assignments — all in one real-time workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground transition hover:-translate-y-0.5">
                Login to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-white px-7 py-3.5 text-base font-medium text-primary transition hover:bg-primary/5">
                Explore Features
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
              {["Real-time sync", "Role-based access", "Built for exam officers"].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-2xl" />
            <div className="relative w-full max-w-md rounded-2xl border border-primary/10 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-primary">Today's Session</p>
                  <h3 className="mt-1 text-lg font-semibold">Hall A — Final Exam</h3>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Active</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                {[{ v: "120", l: "Students" }, { v: "6", l: "Rooms" }, { v: "12", l: "Teachers" }].map((s) => (
                  <div key={s.l} className="rounded-xl bg-primary/5 p-3">
                    <div className="text-2xl font-bold text-primary">{s.v}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-2">
                {["Row A · Seats 01–10", "Row B · Seats 11–20", "Row C · Seats 21–30"].map((r) => (
                  <div key={r} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span>{r}</span>
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything an exam office needs</h2>
          <p className="mt-4 text-muted-foreground">Six focused modules that replace spreadsheets, sticky notes, and last-minute scrambles.</p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="bg-primary/5 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">A five-step workflow</h2>
            <p className="mt-4 text-muted-foreground">From opening the dashboard to assigning invigilators — a guided path for every exam day.</p>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-5">
            {steps.map((step, i) => (
              <div key={step} className="rounded-2xl border border-primary/10 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </div>
                <p className="mt-4 text-sm font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-5xl px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl p-10 text-center text-primary-foreground md:p-16" style={{ background: "var(--gradient-primary)" }}>
          <div className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Ready to organize your next exam?</h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
            Login as an exam officer to manage students, rooms, seating plans, and teacher assignments in one workspace.
          </p>
          <Link to="/login" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-base font-semibold text-primary shadow-lg transition hover:-translate-y-0.5">
            Login Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
            </div>
            <span>ExamOps · Exam Management System</span>
          </div>
          <p>© {new Date().getFullYear()} ExamOps. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}