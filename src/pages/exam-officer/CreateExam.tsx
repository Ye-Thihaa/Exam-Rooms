import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { getAvailableRooms } from "@/services/Roomqueries";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  BookOpen,
  Users,
  DoorOpen,
  Save,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { examQueries, Exam } from "@/services/examQueries";

/**
 * Exam table columns (from your Exam interface):
 * exam_id (auto)
 * subject_code
 * exam_name
 * exam_date
 * session
 * academic_year
 * semester
 * year_level
 * program
 * specialization (nullable)
 * start_time
 * end_time
 * day_of_week
 *
 * NOTE:
 * - Your current UI also has roomId + totalStudents, but those are NOT in exam table.
 *   Keep them for UI validation if you want, but they won't be saved into exam table.
 */

type SessionValue = "morning" | "afternoon";

// Program + specialization rules based on your earlier messages:
// - 1st/2nd year: program = "CST", specialization = null
// - 3rd year:
//    program = "CS" => specialization default "CS"
//    program = "CT" => specialization default "CST"
// - 4th year:
//    program = "CS" => specialization in ["SE","KE","HPC","BIS"]
//    program = "CT" => specialization in ["CSEC","ES","CN"]
const CS_YEAR4_SPECS = ["SE", "KE", "HPC", "BIS"] as const;
const CT_YEAR4_SPECS = ["CSEC", "ES", "CN"] as const;

const sessions = [
  {
    value: "morning" as const,
    label: "Morning (9:00 AM - 12:00 PM)",
    startTime: "09:00",
    endTime: "12:00",
  },
  {
    value: "afternoon" as const,
    label: "Afternoon (1:00 PM - 4:00 PM)",
    startTime: "13:00",
    endTime: "16:00",
  },
];

function getDayOfWeek(dateStr: string) {
  // dateStr: YYYY-MM-DD
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function calcSemesterNumber(yearLevel: string, yearSem: string) {
  // yearSem is 1 or 2 (within the year)
  // Year 1 => sem 1/2
  // Year 2 => sem 3/4
  // Year 3 => sem 5/6
  // Year 4 => sem 7/8
  const y = Number(yearLevel);
  const s = Number(yearSem);
  if (![1, 2, 3, 4].includes(y) || ![1, 2].includes(s)) return "";
  return ((y - 1) * 2 + s).toString();
}

const CreateExam: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state aligned to EXAM TABLE (plus optional UI-only fields roomId, totalStudents)
  const [formData, setFormData] = useState({
    subject_code: "",
    exam_name: "",
    exam_date: "",
    session: "" as SessionValue | "",
    academic_year: "",

    year_level: "", // "1" | "2" | "3" | "4"
    year_sem: "", // "1" | "2"  (within year)
    semester: "", // derived (1..8)

    program: "", // "CST" | "CS" | "CT"
    specialization: "" as string | "",

    // UI-only (not saved into exam table)
    roomId: "",
    totalStudents: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const availableRooms = await getAvailableRooms();
        setRooms(availableRooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        toast({
          title: "Error",
          description: "Failed to load rooms.",
          variant: "destructive",
        });
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  // --- Derived semester number (1..8) ---
  useEffect(() => {
    setFormData((prev) => {
      const sem = calcSemesterNumber(prev.year_level, prev.year_sem);
      return { ...prev, semester: sem };
    });
  }, [formData.year_level, formData.year_sem]);
  // --- Auto program/specialization rules ---
  useEffect(() => {
    setFormData((prev) => {
      const year = prev.year_level;

      // Year 1 & 2: program CST, specialization CST (default)
      if (year === "1" || year === "2") {
        return { ...prev, program: "CST", specialization: "CST" };
      }

      // Year 3: program CS/CT -> specialization default CS/CT
      if (year === "3") {
        if (!prev.program) return { ...prev, specialization: "" };

        if (prev.program === "CS") {
          return { ...prev, specialization: prev.specialization || "CS" };
        }
        if (prev.program === "CT") {
          return { ...prev, specialization: prev.specialization || "CT" };
        }
        return { ...prev, specialization: "" };
      }

      // Year 4: program CS/CT -> specialization list depends on program
      if (year === "4") {
        if (!prev.program) return { ...prev, specialization: "" };

        if (prev.program === "CS") {
          const ok = CS_YEAR4_SPECS.includes(prev.specialization as any);
          return {
            ...prev,
            specialization: ok ? prev.specialization : CS_YEAR4_SPECS[0],
          };
        }

        if (prev.program === "CT") {
          const ok = CT_YEAR4_SPECS.includes(prev.specialization as any);
          return {
            ...prev,
            specialization: ok ? prev.specialization : CT_YEAR4_SPECS[0],
          };
        }

        return { ...prev, specialization: "" };
      }

      return prev;
    });
  }, [formData.year_level, formData.program, formData.specialization]);

  const yearLevels = [
    { value: "1", label: "1st Year" },
    { value: "2", label: "2nd Year" },
    { value: "3", label: "3rd Year" },
    { value: "4", label: "4th Year" },
  ];

  const yearSems = [
    { value: "1", label: "Semester 1 (within year)" },
    { value: "2", label: "Semester 2 (within year)" },
  ];

  const programOptions = useMemo(() => {
    if (formData.year_level === "3" || formData.year_level === "4") {
      return ["CS", "CT"];
    }
    // for year 1/2 it's auto CST
    return [];
  }, [formData.year_level]);

  const specializationOptions = useMemo(() => {
    if (formData.year_level === "3") {
      // 3rd year defaults only; still allow changing if you want
      if (formData.program === "CS") return ["CS"];
      if (formData.program === "CT") return ["CST"];
      return [];
    }

    if (formData.year_level === "4") {
      if (formData.program === "CS") return [...CS_YEAR4_SPECS];
      if (formData.program === "CT") return [...CT_YEAR4_SPECS];
      return [];
    }

    return [];
  }, [formData.year_level, formData.program]);

  const shouldShowProgram =
    formData.year_level === "3" || formData.year_level === "4";
  const shouldShowSpecialization =
    formData.year_level === "3" || formData.year_level === "4";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "totalStudents" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate required fields for exam table
      if (!formData.subject_code || !formData.exam_name) {
        toast({
          title: "Missing fields",
          description: "Subject code and exam name are required.",
          variant: "destructive",
        });
        return;
      }
      if (!formData.exam_date || !formData.session) {
        toast({
          title: "Missing fields",
          description: "Date and session are required.",
          variant: "destructive",
        });
        return;
      }
      if (!formData.academic_year) {
        toast({
          title: "Missing fields",
          description: "Academic year is required.",
          variant: "destructive",
        });
        return;
      }
      if (!formData.year_level || !formData.year_sem || !formData.semester) {
        toast({
          title: "Missing fields",
          description: "Year level and year semester are required.",
          variant: "destructive",
        });
        return;
      }
      if (!formData.program) {
        toast({
          title: "Missing fields",
          description: "Program is required.",
          variant: "destructive",
        });
        return;
      }
      if (shouldShowSpecialization && !formData.specialization) {
        toast({
          title: "Missing fields",
          description: "Specialization is required for 3rd/4th year.",
          variant: "destructive",
        });
        return;
      }

      const selectedSession = sessions.find(
        (s) => s.value === formData.session,
      );
      if (!selectedSession) {
        toast({
          title: "Invalid session",
          description: "Please select a valid session.",
          variant: "destructive",
        });
        return;
      }

      const payload: Omit<Exam, "exam_id"> = {
        subject_code: formData.subject_code,
        exam_name: formData.exam_name,
        exam_date: formData.exam_date,
        session: formData.session,
        academic_year: formData.academic_year,

        semester: formData.semester, // global semester number 1..8
        year_level: formData.year_level, // 1..4

        program: formData.program, // CST/CS/CT
        specialization: formData.specialization
          ? formData.specialization
          : null,

        start_time: selectedSession.startTime,
        end_time: selectedSession.endTime,
        day_of_week: getDayOfWeek(formData.exam_date),
      };

      const created = await examQueries.create(payload);

      toast({
        title: "Exam Created Successfully",
        description: `${created.exam_name} (${created.subject_code}) saved for ${created.exam_date} (${created.session}).`,
      });

      navigate("/exam-officer");
    } catch (error: any) {
      console.error("Create exam error:", error);
      toast({
        title: "Create failed",
        description: error?.message || "Failed to create exam.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Create New Exam"
        description="Set up a new examination schedule"
        actions={
          <Link to="/exam-officer">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="dashboard-card space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Exam Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Subject Code *</label>
                <input
                  type="text"
                  name="subject_code"
                  value={formData.subject_code}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., CST-2602"
                  required
                />
              </div>

              <div>
                <label className="form-label">Exam Name *</label>
                <input
                  type="text"
                  name="exam_name"
                  value={formData.exam_name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., Data Structures & Algorithms"
                  required
                />
              </div>

              <div>
                <label className="form-label">Academic Year *</label>
                <input
                  type="text"
                  name="academic_year"
                  value={formData.academic_year}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., 2025-2026"
                  required
                />
              </div>

              <div>
                <label className="form-label">Year Level *</label>
                <select
                  name="year_level"
                  value={formData.year_level}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="">Select Year Level</option>
                  {yearLevels.map((y) => (
                    <option key={y.value} value={y.value}>
                      {y.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Year Semester *</label>
                <select
                  name="year_sem"
                  value={formData.year_sem}
                  onChange={handleChange}
                  className="form-input"
                  required
                  disabled={!formData.year_level}
                >
                  <option value="">
                    {formData.year_level
                      ? "Select Semester (1/2)"
                      : "Select year level first"}
                  </option>
                  {yearSems.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {!!formData.semester && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Global Semester: <strong>{formData.semester}</strong>
                  </p>
                )}
              </div>

              {/* Program */}
              {shouldShowProgram ? (
                <div>
                  <label className="form-label">Program *</label>
                  <select
                    name="program"
                    value={formData.program}
                    onChange={handleChange}
                    className="form-input"
                    required
                    disabled={loading}
                  >
                    <option value="">
                      {loading ? "Loading..." : "Select Program"}
                    </option>
                    {programOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                    <p className="text-sm text-primary">
                      <strong>Program:</strong> CST (auto for 1st & 2nd year)
                    </p>
                  </div>
                </div>
              )}

              {/* Specialization */}
              {shouldShowSpecialization && (
                <div>
                  <label className="form-label">Specialization *</label>
                  <select
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    className="form-input"
                    required
                    disabled={!formData.program}
                  >
                    <option value="">
                      {formData.program
                        ? "Select Specialization"
                        : "Select program first"}
                    </option>
                    {specializationOptions.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>

                  {!formData.program && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose program first
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Schedule
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  name="exam_date"
                  value={formData.exam_date}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Session *</label>
                <select
                  name="session"
                  value={formData.session}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="">Select Session</option>
                  {sessions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Duration</label>
                <input
                  type="text"
                  value="3 hours (fixed)"
                  className="form-input bg-muted"
                  disabled
                />
              </div>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
            <Link to="/exam-officer">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Create Exam
            </Button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default CreateExam;
