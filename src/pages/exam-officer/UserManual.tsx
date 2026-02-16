import React, { useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  BookOpen,
  DoorOpen,
  LayoutGrid,
  Users,
  HelpCircle,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Calendar,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SectionDef {
  id: string;
  title: string;
  subtitle: string;
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  content: React.ReactNode;
}

// ─── Reusable primitives ──────────────────────────────────────────────────────

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-base font-semibold text-foreground mt-2 mb-1">
    {children}
  </h3>
);

const LeadText = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary pl-4 py-1 bg-muted/40 rounded-r-md">
    {children}
  </p>
);

const InfoCallout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex gap-3 items-start rounded-lg border border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 px-4 py-3 text-sm leading-relaxed">
    <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
    <span>{children}</span>
  </div>
);

const WarnCallout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex gap-3 items-start rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-4 py-3 text-sm leading-relaxed">
    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
    <span>{children}</span>
  </div>
);

const Badge = ({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "purple" | "blue";
}) => {
  const styles: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    success:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    warning:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    purple:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${styles[variant]}`}
    >
      {children}
    </span>
  );
};

const Step = ({
  number,
  title,
  description,
  note,
  warning,
}: {
  number: number;
  title: string;
  description: string;
  note?: string;
  warning?: string;
}) => (
  <div className="flex gap-4 py-4 border-b border-border last:border-0">
    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold mt-0.5">
      {number}
    </div>
    <div className="flex-1 space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      {note && <InfoCallout>{note}</InfoCallout>}
      {warning && <WarnCallout>{warning}</WarnCallout>}
    </div>
  </div>
);

// ─── Section Contents ─────────────────────────────────────────────────────────

const OverviewContent = () => (
  <div className="space-y-6">
    <LeadText>
      The <strong>Exam Management System</strong> is a comprehensive web-based
      administration tool that enables exam officers to manage student data,
      exam schedules, room assignments, seating arrangements, and teacher
      assignments — all backed by Supabase database for real-time data
      management.
    </LeadText>

    {/* Feature cards */}
    <div>
      <SectionHeading>Core Features</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        {[
          {
            Icon: Users,
            title: "Student Data Management",
            desc: "View and manage student records, exam schedules, and track retake/credit students.",
            color: "text-violet-600 bg-violet-100 dark:bg-violet-900/30",
          },
          {
            Icon: DoorOpen,
            title: "Room Management",
            desc: "Full CRUD operations for regular rooms and exam rooms with capacity management.",
            color: "text-pink-600 bg-pink-100 dark:bg-pink-900/30",
          },
          {
            Icon: LayoutGrid,
            title: "Room Assignments & Seating",
            desc: "Select rooms, pair students, generate seating plans, and save to database.",
            color: "text-sky-600 bg-sky-100 dark:bg-sky-900/30",
          },
          {
            Icon: BookOpen,
            title: "Teacher Assignments",
            desc: "View teacher records and assign them to specific exam rooms and dates.",
            color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
          },
        ].map(({ Icon, title, desc, color }) => (
          <div
            key={title}
            className="rounded-xl border border-border bg-card p-4 flex gap-3 hover:shadow-sm transition-shadow"
          >
            <div className={`rounded-lg p-2 h-fit ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                {title}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Workflow */}
    <div>
      <SectionHeading>Typical Workflow</SectionHeading>
      <div className="mt-3 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          {[
            "View Dashboard",
            "Select Room",
            "Pair Students",
            "Generate Seating",
            "Assign Teachers",
          ].map((step, i) => (
            <React.Fragment key={step}>
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-foreground">
                  {step}
                </span>
              </div>
              {i < 4 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>

    {/* Database Integration */}
    <div>
      <SectionHeading>Database Integration</SectionHeading>
      <InfoCallout>
        All data operations are performed directly with{" "}
        <strong>Supabase</strong> database. This ensures real-time
        synchronization across all user roles (Exam Officers, Students, and
        Teachers) and provides reliable data persistence.
      </InfoCallout>
    </div>
  </div>
);

const DashboardContent = () => (
  <div className="space-y-6">
    <LeadText>
      The Dashboard is your <strong>central hub</strong> for viewing student
      data, exam schedules, and accessing all system routes. All information
      displayed is fetched in real-time from the Supabase database.
    </LeadText>

    <div>
      <SectionHeading>Dashboard Features</SectionHeading>
      <div className="mt-2 rounded-xl border border-border bg-card px-5">
        <Step
          number={1}
          title="View Student Data"
          description="Access comprehensive student records including enrollment information, exam history, and current exam registrations. Data is fetched from Supabase and displayed in an organized, searchable format."
          note="Use the search and filter options to quickly find specific students or groups by class, section, or exam status."
        />
        <Step
          number={2}
          title="View Exam Schedule"
          description="See the complete exam timetable with dates, times, subjects, and room allocations. The schedule updates automatically when changes are made."
        />
        <Step
          number={3}
          title="Student Records Display"
          description="View detailed student information including personal details, academic records, and special requirements (retake students, credit transfers)."
        />
        <Step
          number={4}
          title="Room Capacity Overview"
          description="Monitor available room capacity across all exam rooms. This helps you make informed decisions during room assignment."
          note="Capacity data is real-time and updates immediately when rooms are assigned or seating is generated."
        />
      </div>
    </div>

    <div>
      <SectionHeading>Quick Navigation Routes</SectionHeading>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            route: "Room Assignments",
            desc: "Configure room allocations and student pairing",
            Icon: DoorOpen,
            color: "text-violet-600",
          },
          {
            route: "Seating Plans",
            desc: "Generate and view seating arrangements",
            Icon: LayoutGrid,
            color: "text-sky-600",
          },
          {
            route: "Manage Rooms",
            desc: "CRUD operations for rooms and exam rooms",
            Icon: Database,
            color: "text-pink-600",
          },
          {
            route: "Teacher Assignments",
            desc: "Assign invigilators to exam rooms",
            Icon: BookOpen,
            color: "text-emerald-600",
          },
          {
            route: "Special Exams",
            desc: "Manage retake and credit students",
            Icon: AlertTriangle,
            color: "text-amber-600",
          },
          {
            route: "Teacher Records",
            desc: "View all teacher information",
            Icon: Users,
            color: "text-purple-600",
          },
        ].map(({ route, desc, Icon, color }) => (
          <div
            key={route}
            className="rounded-lg border border-border bg-card p-3 flex items-start gap-3 hover:shadow-sm transition-shadow"
          >
            <Icon className={`h-5 w-5 mt-0.5 ${color}`} />
            <div>
              <p className="text-sm font-semibold text-foreground">{route}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const RoomAssignmentContent = () => (
  <div className="space-y-6">
    <LeadText>
      Room Assignment is where you select available rooms for exams and
      configure student pairing. This process involves{" "}
      <strong>three key steps</strong>: selecting a room from Supabase, pairing
      students, and saving the assignments back to the database.
    </LeadText>

    <WarnCallout>
      <strong>Important:</strong> You must select a room FIRST before you can
      proceed to student pairing. The system follows a sequential workflow to
      ensure data integrity.
    </WarnCallout>

    <div>
      <SectionHeading>Step-by-Step: Room Assignment Process</SectionHeading>
      <div className="mt-2 rounded-xl border border-border bg-card px-5">
        <Step
          number={1}
          title="Navigate to Room Assignment Page"
          description="From the dashboard or sidebar, click 'Room Assignment'. The system will fetch and display all available rooms from Supabase database."
          note="Only rooms that haven't been assigned to the current exam session will appear in the list."
        />
        <Step
          number={2}
          title="Select a Room First"
          description="Browse the list of available rooms showing room name, building, capacity, and availability status. Click on a room to select it. This is mandatory before moving to student pairing."
          note="Room data includes capacity limits which will determine how many students can be assigned. The system validates this during pairing."
        />
        <Step
          number={3}
          title="Configure Student Pairing"
          description="After selecting a room, you'll be directed to the student pairing interface. Choose your pairing method and assign students to the selected room."
          warning="Ensure the number of students doesn't exceed the room capacity. The system will alert you if you attempt to over-assign."
        />
        <Step
          number={4}
          title="Save Room Assignments"
          description="Review your configuration and click 'Save Room Assignments'. The data is immediately written to Supabase database, creating the assigned room record."
          note="Once saved, the room becomes an 'Assigned Room' and moves to the next phase: seating generation."
        />
      </div>
    </div>

    {/* Pairing methods */}
    <div>
      <SectionHeading>Student Pairing Methods</SectionHeading>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 bg-violet-600 dark:bg-violet-700 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">
              Manual Pairing
            </span>
            <Badge variant="purple">Precision control</Badge>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select and pair specific students manually. Ideal when you need
              granular control over seating arrangements or have specific
              separation requirements.
            </p>
            <ul className="space-y-1.5">
              {[
                "Separate students with known collaboration risks",
                "Accommodate students with special needs",
                "Full flexibility but requires more time",
              ].map((t) => (
                <li
                  key={t}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-violet-500 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 bg-sky-600 dark:bg-sky-700 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">
              By Class / Section
            </span>
            <Badge variant="blue">Automated</Badge>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Students are grouped by their class or section, then automatically
              distributed to minimize same-class seating. The system handles the
              pairing logic.
            </p>
            <ul className="space-y-1.5">
              {[
                "Perfect for large-scale exams with many sections",
                "Automatic separation of same-class students",
                "Faster setup with consistent results",
              ].map((t) => (
                <li
                  key={t}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-sky-500 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SeatingPlanContent = () => (
  <div className="space-y-6">
    <LeadText>
      After rooms are assigned and students are paired, you can generate the
      seating plan. This process takes{" "}
      <strong>assigned rooms from the database</strong>, creates optimal seat
      arrangements, and saves them back to Supabase.
    </LeadText>

    <InfoCallout>
      <strong>Pre-requisite:</strong> At least one room must have completed room
      assignment (including student pairing) before seating generation becomes
      available.
    </InfoCallout>

    <div>
      <SectionHeading>Step-by-Step: Seating Plan Generation</SectionHeading>
      <div className="mt-2 rounded-xl border border-border bg-card px-5">
        <Step
          number={1}
          title="Access Assigned Rooms"
          description="Navigate to 'Seating Generate Route' from the dashboard. The system fetches all assigned rooms from Supabase and displays them as available exam rooms."
          note="Only rooms with completed student pairing will appear here. If a room is missing, check its assignment status."
        />
        <Step
          number={2}
          title="Select Exam Rooms"
          description="View the list of exam rooms ready for seating generation. Each room shows its name, capacity, assigned student count, and pairing method."
        />
        <Step
          number={3}
          title="Select Room to Generate Seating"
          description="Choose a specific exam room for which you want to generate the seating plan. You can generate plans one room at a time or for all rooms at once."
          note="The system fetches room configuration and student data from Supabase to compute the optimal layout."
        />
        <Step
          number={4}
          title="View Generated Seating Plan"
          description="The system displays a visual grid showing each seat position with the assigned student's name, ID, and section. Review the layout carefully."
          warning="Check for any conflicts or errors highlighted in red. These must be resolved before saving."
        />
        <Step
          number={5}
          title="Save to Database"
          description="Click 'Save to Database' to write the seating plan to Supabase. This makes the plan available to students and teachers through their respective dashboards."
          note="Saved seating plans can be viewed, printed, or exported. Students will immediately see their assigned seats in their account."
        />
      </div>
    </div>

    <div>
      <SectionHeading>Understanding the Seating Grid</SectionHeading>
      <div className="mt-3 rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-36">
                Element
              </th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Meaning
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                el: <Badge variant="success">Green Cell</Badge>,
                meaning: "Seat successfully assigned to a student",
              },
              {
                el: <Badge variant="default">Gray Cell</Badge>,
                meaning: "Empty seat — capacity exceeds student count",
              },
              {
                el: <Badge variant="danger">Red Cell</Badge>,
                meaning: "Conflict detected — requires manual resolution",
              },
              {
                el: (
                  <span className="text-xs font-semibold text-foreground">
                    Row / Col Label
                  </span>
                ),
                meaning: "Physical position (e.g., Row 3, Seat 12)",
              },
            ].map((row, i) => (
              <tr
                key={i}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">{row.el}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {row.meaning}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const ManageRoomsContent = () => (
  <div className="space-y-6">
    <LeadText>
      The Manage Rooms section provides <strong>full CRUD operations</strong>{" "}
      for both regular rooms and exam rooms. All operations interact directly
      with Supabase database for immediate data persistence.
    </LeadText>

    <div>
      <SectionHeading>Room Management Operations</SectionHeading>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            title: "Create Room",
            desc: "Add new rooms to the system with details like room number, building, capacity, and facilities.",
            Icon: CheckCircle2,
            color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
          },
          {
            title: "Read/View Rooms",
            desc: "Browse all rooms in the database with filtering and search capabilities. View detailed room information.",
            Icon: LayoutGrid,
            color: "text-sky-600 bg-sky-100 dark:bg-sky-900/30",
          },
          {
            title: "Update Room",
            desc: "Modify existing room details including capacity changes, facility updates, or status modifications.",
            Icon: Clock,
            color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
          },
          {
            title: "Delete Room",
            desc: "Remove rooms from the system. Only available for rooms not currently assigned to exams.",
            Icon: XCircle,
            color: "text-red-600 bg-red-100 dark:bg-red-900/30",
          },
        ].map(({ title, desc, Icon, color }) => (
          <div
            key={title}
            className="rounded-xl border border-border bg-card p-4 flex gap-3"
          >
            <div className={`rounded-lg p-2 h-fit ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                {title}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div>
      <SectionHeading>Exam Room vs Regular Room</SectionHeading>
      <div className="mt-3 space-y-3">
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 p-4">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
            Regular Rooms
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            Base room inventory — physical rooms in your institution. These
            rooms become exam rooms only after going through the room assignment
            process.
          </p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40 p-4">
          <p className="text-sm font-semibold text-violet-800 dark:text-violet-300 mb-2">
            Exam Rooms
          </p>
          <p className="text-xs text-violet-700 dark:text-violet-400 leading-relaxed">
            Regular rooms that have been assigned to a specific exam session
            with student pairing complete. These are the rooms that appear in
            seating generation.
          </p>
        </div>
      </div>
    </div>

    <WarnCallout>
      <strong>Database Integrity:</strong> The system prevents deletion of rooms
      that are currently assigned to exams or have active seating plans.
      Unassign the room first before attempting deletion.
    </WarnCallout>
  </div>
);

const SpecialExamContent = () => (
  <div className="space-y-6">
    <LeadText>
      The Special Exam route allows you to manage students who require retake
      exams or credit transfers. This ensures special cases are properly tracked
      and accommodated in room assignments.
    </LeadText>

    <div>
      <SectionHeading>Managing Special Exam Students</SectionHeading>
      <div className="mt-2 rounded-xl border border-border bg-card px-5">
        <Step
          number={1}
          title="Navigate to Special Exam Route"
          description="Access the Special Exam section from the dashboard. The system fetches all students eligible for special exam arrangements from Supabase."
        />
        <Step
          number={2}
          title="Identify Retake Students"
          description="View the list of students who need to retake exams. These are students who previously failed or were absent from an exam."
          note="Retake students may need to be seated separately or in specific rooms depending on your institution's policies."
        />
        <Step
          number={3}
          title="Assign Credit Students"
          description="Manage students receiving credit transfers or exemptions. These students may need modified exam arrangements or documentation."
        />
        <Step
          number={4}
          title="Update Special Status"
          description="Mark students with their special exam status and configure any specific requirements (extra time, separate room, etc.)"
        />
        <Step
          number={5}
          title="Save to Database"
          description="Confirm all special exam assignments. The data is saved to Supabase and will be factored into room assignment and seating generation."
        />
      </div>
    </div>

    <div>
      <SectionHeading>Special Exam Categories</SectionHeading>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            type: "Retake Exams",
            desc: "Students who need to repeat an exam due to failure or absence",
            badge: <Badge variant="warning">Retake</Badge>,
          },
          {
            type: "Credit Transfer",
            desc: "Students with approved credits from other institutions",
            badge: <Badge variant="blue">Credit</Badge>,
          },
          {
            type: "Special Accommodation",
            desc: "Students requiring extra time, separate rooms, or assistive technology",
            badge: <Badge variant="purple">Accommodation</Badge>,
          },
          {
            type: "Make-up Exams",
            desc: "Students who missed exams due to approved medical or emergency reasons",
            badge: <Badge variant="default">Make-up</Badge>,
          },
        ].map(({ type, desc, badge }) => (
          <div
            key={type}
            className="rounded-lg border border-border bg-card p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">{type}</p>
              {badge}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const TeacherAssignmentContent = () => (
  <div className="space-y-6">
    <LeadText>
      Teacher Assignment allows you to assign invigilating teachers to exam
      rooms for specific dates. The system fetches teacher records from Supabase
      and allows you to configure supervision schedules.
    </LeadText>

    <div>
      <SectionHeading>Step-by-Step: Assigning Teachers</SectionHeading>
      <div className="mt-2 rounded-xl border border-border bg-card px-5">
        <Step
          number={1}
          title="View Teacher Records"
          description="Navigate to Teacher Assignments section. The system fetches all available teacher records from Supabase database, showing names, departments, and availability."
          note="Teachers marked as unavailable or already assigned to conflicting time slots will be indicated."
        />
        <Step
          number={2}
          title="Access Teacher Assignment Interface"
          description="Click on 'Teacher Assignments' to view the assignment configuration page. This shows all exam rooms requiring teacher supervision."
        />
        <Step
          number={3}
          title="Select Specific Date and Room"
          description="Choose the exam date and room for which you want to assign a teacher. The system displays room details including capacity, assigned students, and exam schedule."
          warning="Ensure the selected date and time don't conflict with the teacher's other commitments. The system will alert you of conflicts."
        />
        <Step
          number={4}
          title="Assign Teacher"
          description="From the available teachers list, select the teacher you want to assign as invigilator for this room and date. You can assign multiple teachers to the same room if needed."
          note="Teachers will receive notifications of their assignments (if notification system is enabled) and can view their schedule in their teacher dashboard."
        />
        <Step
          number={5}
          title="Save Assignment"
          description="Confirm the teacher assignment. The data is immediately saved to Supabase and becomes visible to the assigned teacher in their account."
        />
      </div>
    </div>

    <div>
      <SectionHeading>Assignment Status Reference</SectionHeading>
      <div className="mt-3 rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              {["Status", "Description", "Action Required"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {
                badge: <Badge variant="success">Assigned</Badge>,
                desc: "Teacher confirmed and schedule saved to database",
                action: "None — ready for exam day",
                ActionIcon: CheckCircle2,
                actionColor: "text-emerald-500",
              },
              {
                badge: <Badge variant="warning">Unassigned</Badge>,
                desc: "Room has no teacher assigned yet",
                action: "Assign a teacher before exam date",
                ActionIcon: Clock,
                actionColor: "text-amber-500",
              },
              {
                badge: <Badge variant="danger">Conflict</Badge>,
                desc: "Teacher is double-booked or unavailable",
                action: "Reassign to available teacher immediately",
                ActionIcon: XCircle,
                actionColor: "text-red-500",
              },
            ].map((row, i) => (
              <tr
                key={i}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">{row.badge}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {row.desc}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`flex items-center gap-1.5 text-xs font-medium ${row.actionColor}`}
                  >
                    <row.ActionIcon className="h-3.5 w-3.5" />
                    {row.action}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <InfoCallout>
      <strong>Teacher Dashboard Access:</strong> Assigned teachers can log in to
      their accounts to view their assigned exam rooms, dates, seating plans,
      and student lists. All this data is synced from Supabase in real-time.
    </InfoCallout>
  </div>
);

const TroubleshootingContent = () => (
  <div className="space-y-6">
    <LeadText>
      Common issues and solutions for the Exam Management System. All
      troubleshooting steps involve checking data integrity in Supabase
      database.
    </LeadText>

    <div className="space-y-0 rounded-xl border border-border bg-card overflow-hidden">
      {[
        {
          q: "Cannot see any rooms in Room Assignment page",
          a: "This means no rooms exist in the database or all rooms are already assigned. Go to Manage Rooms section to verify room data in Supabase. Add new rooms if needed, or unassign existing room assignments to make them available again.",
        },
        {
          q: "Student pairing fails or shows capacity error",
          a: "The number of students you're trying to assign exceeds the room's capacity. Check the room capacity in Manage Rooms. Either reduce the number of students or select a larger room. Verify student data in Supabase is correct.",
        },
        {
          q: '"Generate Seating" button is disabled',
          a: "This means no rooms have completed the full assignment process (select room → pair students → save). Check Room Assignment section to ensure at least one room has saved assignments in Supabase database.",
        },
        {
          q: "Seating plan shows conflicts (red cells)",
          a: "Conflicts occur when a student is assigned to multiple rooms or when data integrity issues exist. Check the specific students involved, verify their records in Supabase, and ensure they're only assigned to one room per exam session.",
        },
        {
          q: "Teacher not appearing in assignment dropdown",
          a: "The teacher may already be assigned to another room at the same date/time, or their account is inactive. Check Teacher Records to verify their status and availability. Query Supabase directly if needed to check assignment conflicts.",
        },
        {
          q: "Cannot delete a room from Manage Rooms",
          a: "Rooms that are currently assigned to exams or have active seating plans cannot be deleted due to database constraints. First, navigate to Room Assignment and unassign the room. Then, delete any associated seating plans before attempting to delete the room record.",
        },
        {
          q: "Student cannot see their seating assignment",
          a: "Ensure the seating plan has been saved to database after generation. Check the student's account status and verify the exam room assignment is correctly linked in Supabase. The student must be logged in with valid credentials.",
        },
        {
          q: "Teacher dashboard shows no assigned rooms",
          a: "Verify the teacher assignment was saved to Supabase database. Check that the assignment date matches the current exam session. Ensure there are no database sync issues by checking the teacher_assignments table directly.",
        },
        {
          q: "Special exam students not showing in seating plan",
          a: "After assigning special exam status, ensure you've also included these students in room assignment. Retake and credit students must go through the same room assignment process. Check their status in the Special Exam section.",
        },
        {
          q: "Database connection errors or timeout",
          a: "Check your internet connection and Supabase service status. Verify your database credentials are correct. If the issue persists, contact your system administrator to check Supabase dashboard for any service disruptions or quota limits.",
        },
      ].map((item, i) => (
        <details key={i} className="group border-b border-border last:border-0">
          <summary className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors list-none">
            <HelpCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground flex-1">
              {item.q}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-5 pb-4 pl-12 text-sm text-muted-foreground leading-relaxed">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserManual() {
  const [activeSection, setActiveSection] = useState("overview");

  const sections: SectionDef[] = [
    {
      id: "overview",
      title: "Overview",
      subtitle: "System overview and workflow guide.",
      Icon: LayoutGrid,
      iconBg: "bg-violet-100 dark:bg-violet-900/30",
      iconColor: "text-violet-600 dark:text-violet-400",
      content: <OverviewContent />,
    },
    {
      id: "dashboard",
      title: "Dashboard",
      subtitle: "View student data and exam schedules.",
      Icon: Users,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      content: <DashboardContent />,
    },
    {
      id: "room-assignments",
      title: "Room Assignments",
      subtitle: "Select rooms and configure student pairing.",
      Icon: DoorOpen,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      content: <RoomAssignmentContent />,
    },
    {
      id: "seating-plan",
      title: "Seating Plan",
      subtitle: "Generate and save seating arrangements.",
      Icon: LayoutGrid,
      iconBg: "bg-sky-100 dark:bg-sky-900/30",
      iconColor: "text-sky-600 dark:text-sky-400",
      content: <SeatingPlanContent />,
    },
    {
      id: "manage-rooms",
      title: "Manage Rooms",
      subtitle: "CRUD operations for rooms and exam rooms.",
      Icon: Database,
      iconBg: "bg-pink-100 dark:bg-pink-900/30",
      iconColor: "text-pink-600 dark:text-pink-400",
      content: <ManageRoomsContent />,
    },
    {
      id: "special-exams",
      title: "Special Exams",
      subtitle: "Manage retake and credit students.",
      Icon: AlertTriangle,
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
      content: <SpecialExamContent />,
    },
    {
      id: "teacher-assignments",
      title: "Teacher Assignments",
      subtitle: "Assign teachers to exam rooms and dates.",
      Icon: BookOpen,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      content: <TeacherAssignmentContent />,
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      subtitle: "Solutions to common issues and FAQs.",
      Icon: HelpCircle,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      content: <TroubleshootingContent />,
    },
  ];

  const active = sections.find((s) => s.id === activeSection)!;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            User Manual - Exam Officer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete administrator guide for the Exam Management System with
            Supabase integration.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 flex-wrap">
          {sections.map((s) => {
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <s.Icon className="h-4 w-4" />
                {s.title}
              </button>
            );
          })}
        </div>

        {/* Active section card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-6">
          {/* Section header */}
          <div className="flex items-start gap-4 pb-5 border-b border-border">
            <div className={`p-3 rounded-xl ${active.iconBg}`}>
              <active.Icon className={`h-6 w-6 ${active.iconColor}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {active.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {active.subtitle}
              </p>
            </div>
          </div>

          {/* Section body */}
          {active.content}
        </div>
      </div>
    </DashboardLayout>
  );
}
