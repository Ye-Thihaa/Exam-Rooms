import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { getAvailableRooms } from "@/services/Roomqueries";
import {
  getUniqueSemesters,
  getUniqueYearLevels,
  getUniqueMajors,
} from "@/services/studentQueries";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  DoorOpen,
  Save,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const CreateExam: React.FC = () => {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<any[]>([]);
  const [availableSemesters, setAvailableSemesters] = useState<number[]>([]);
  const [availableYearLevels, setAvailableYearLevels] = useState<number[]>([]);
  const [availableMajors, setAvailableMajors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  /*
   * Major Field Logic:
   * - 1st Year + Sem 1: Auto-set to CST (hidden)
   * - 2nd Year + Sem 3: Auto-set to CST (hidden)
   * - 3rd Year: Show major dropdown (CS, CT)
   * - 4th Year: Show major dropdown (SE, KE, BIS, HPC, CN, ES, CSEC)
   *
   * Session Times (Fixed 3-hour duration):
   * - Morning: 9:00 AM - 12:00 PM
   * - Afternoon: 1:00 PM - 4:00 PM
   */
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    subject: "",
    department: "",
    semester: "",
    yearLevel: "",
    major: "",
    date: "",
    session: "", // 'morning' or 'afternoon'
    duration: 180, // Fixed 3 hours
    roomId: "",
    totalStudents: 0,
  });

  // Fetch available rooms and student data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [availableRooms, semesters, yearLevels, majors] =
          await Promise.all([
            getAvailableRooms(),
            getUniqueSemesters(),
            getUniqueYearLevels(),
            getUniqueMajors(),
          ]);

        setRooms(availableRooms);
        setAvailableSemesters(semesters.length > 0 ? semesters : [1, 2]);
        setAvailableYearLevels(
          yearLevels.length > 0 ? yearLevels : [1, 2, 3, 4],
        );
        setAvailableMajors(majors);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load form data.",
          variant: "destructive",
        });
        // Set defaults on error
        setAvailableSemesters([1, 2]);
        setAvailableYearLevels([1, 2, 3, 4]);
        setAvailableMajors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Get session times
    const selectedSession = sessions.find((s) => s.value === formData.session);

    // Prepare exam data with session times
    const examData = {
      ...formData,
      startTime: selectedSession?.startTime,
      endTime: selectedSession?.endTime,
    };

    console.log("Exam data to be saved:", examData);

    toast({
      title: "Exam Created Successfully",
      description: `${formData.name} (${formData.code}) - ${formData.major || "CST"} has been scheduled.`,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]:
          name === "duration" || name === "totalStudents"
            ? Number(value)
            : value,
      };

      // Auto-set major based on semester and year level combinations
      const semester = name === "semester" ? value : prev.semester;
      const yearLevel = name === "yearLevel" ? value : prev.yearLevel;

      // First year (sem 1) and Second year (sem 3) - auto-set to CST
      if (
        (yearLevel === "1" && semester === "1") ||
        (yearLevel === "2" && semester === "3")
      ) {
        updated.major = "CST";
      }
      // If changing away from these combinations, clear major if it was auto-set
      else if (name === "semester" || name === "yearLevel") {
        // Only clear if not in a combination that should have major pre-set
        if (
          !(
            (yearLevel === "1" && semester === "1") ||
            (yearLevel === "2" && semester === "3")
          )
        ) {
          // Keep major if user is in 3rd or 4th year, otherwise clear
          if (yearLevel === "1" || yearLevel === "2") {
            updated.major = "";
          }
        }
      }

      return updated;
    });
  };

  const departments = [
    "Computer Science",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Humanities",
    "Engineering",
  ];

  // Map semester numbers to proper labels
  const getSemesterLabel = (sem: number): string => {
    const ordinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    return `${ordinal(sem)} Semester`;
  };

  const semesters = availableSemesters.map((sem) => ({
    value: sem.toString(),
    label: getSemesterLabel(sem),
  }));

  const yearLevels = availableYearLevels.map((level) => ({
    value: level.toString(),
    label: `${level}${level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th"} Year`,
  }));

  // Define session times
  const sessions = [
    {
      value: "morning",
      label: "Morning (9:00 AM - 12:00 PM)",
      startTime: "09:00",
      endTime: "12:00",
    },
    {
      value: "afternoon",
      label: "Afternoon (1:00 PM - 4:00 PM)",
      startTime: "13:00",
      endTime: "16:00",
    },
  ];

  // Determine available majors based on year level
  const getAvailableMajorsForYear = () => {
    const yearLevel = formData.yearLevel;

    if (yearLevel === "3") {
      // 3rd year: CS, CT
      return availableMajors.filter((m) => m === "CS" || m === "CT");
    } else if (yearLevel === "4") {
      // 4th year: SE, KE, BIS, HPC, CN, ES, CSEC
      return availableMajors.filter((m) =>
        ["SE", "KE", "BIS", "HPC", "CN", "ES", "CSEC"].includes(m),
      );
    }
    return [];
  };

  // Check if major field should be shown
  const shouldShowMajor = () => {
    const yearLevel = formData.yearLevel;
    const semester = formData.semester;

    // Hide major for 1st year sem 1 and 2nd year sem 3 (auto-set to CST)
    if (
      (yearLevel === "1" && semester === "1") ||
      (yearLevel === "2" && semester === "3")
    ) {
      return false;
    }

    // Show for 3rd and 4th year
    return yearLevel === "3" || yearLevel === "4";
  };

  const availableMajorsForYear = getAvailableMajorsForYear();

  return (
    <DashboardLayout>
      <PageHeader
        title="Create New Exam"
        description="Set up a new examination with room and time allocation"
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
                <label className="form-label">Exam Code *</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., CS301"
                  required
                />
              </div>
              <div>
                <label className="form-label">Exam Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., Data Structures & Algorithms"
                  required
                />
              </div>
              <div>
                <label className="form-label">Subject *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., Computer Science"
                  required
                />
              </div>
              <div>
                <label className="form-label">Department *</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Academic Period */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Academic Period
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Semester *</label>
                <select
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  className="form-input"
                  required
                  disabled={loading}
                >
                  <option value="">
                    {loading ? "Loading..." : "Select Semester"}
                  </option>
                  {semesters.map((sem) => (
                    <option key={sem.value} value={sem.value}>
                      {sem.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Year Level *</label>
                <select
                  name="yearLevel"
                  value={formData.yearLevel}
                  onChange={handleChange}
                  className="form-input"
                  required
                  disabled={loading}
                >
                  <option value="">
                    {loading ? "Loading..." : "Select Year Level"}
                  </option>
                  {yearLevels.map((year) => (
                    <option key={year.value} value={year.value}>
                      {year.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Conditional Major field - show for 3rd/4th year except auto-set cases */}
              {shouldShowMajor() && (
                <div>
                  <label className="form-label">Major *</label>
                  <select
                    name="major"
                    value={formData.major}
                    onChange={handleChange}
                    className="form-input"
                    required
                    disabled={loading}
                  >
                    <option value="">
                      {loading ? "Loading..." : "Select Major"}
                    </option>
                    {availableMajorsForYear.map((major) => (
                      <option key={major} value={major}>
                        {major}
                      </option>
                    ))}
                  </select>
                  {!loading && availableMajorsForYear.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      No majors available for this year level
                    </p>
                  )}
                </div>
              )}
              {/* Show info when major is auto-set */}
              {((formData.yearLevel === "1" && formData.semester === "1") ||
                (formData.yearLevel === "2" && formData.semester === "3")) && (
                <div className="md:col-span-2">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                    <p className="text-sm text-primary">
                      <strong>Major:</strong> CST (Computer Science and
                      Technology) - automatically assigned for this semester and
                      year level
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
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
                  {sessions.map((session) => (
                    <option key={session.value} value={session.value}>
                      {session.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Duration</label>
                <input
                  type="text"
                  value="3 hours (180 minutes)"
                  className="form-input bg-muted"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Room & Students */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-primary" />
              Room & Capacity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Exam Room *</label>
                <select
                  name="roomId"
                  value={formData.roomId}
                  onChange={handleChange}
                  className="form-input"
                  required
                  disabled={loading}
                >
                  <option value="">
                    {loading ? "Loading rooms..." : "Select Room"}
                  </option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.room_id}>
                      {room.room_number} - {room.room_type} (Capacity:{" "}
                      {room.capacity})
                    </option>
                  ))}
                </select>
                {!loading && rooms.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    No available rooms found
                  </p>
                )}
              </div>
              <div>
                <label className="form-label">Expected Students *</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="number"
                    name="totalStudents"
                    value={formData.totalStudents || ""}
                    onChange={handleChange}
                    className="form-input pl-10"
                    placeholder="Number of students"
                    min="1"
                    required
                  />
                </div>
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
