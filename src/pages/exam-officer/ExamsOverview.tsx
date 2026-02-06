import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, MapPin, X } from "lucide-react";

import { examQueries, Exam } from "@/services/examQueries";
import {
  examRoomQueries,
  ExamRoomWithDetails,
} from "@/services/examroomQueries";

// Helper function to convert year_level string to number
function yearLevelToNumber(yearLevel: string): number {
  const parsed = parseInt(yearLevel, 10);
  if (!isNaN(parsed)) return parsed;

  const match = yearLevel.match(/(\w+)\s+Year/i);
  if (!match) return 0;

  const yearWord = match[1].toLowerCase();
  const yearMap: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
  };
  return yearMap[yearWord] || 0;
}

function normalizeSpecializationCode(code: string): string {
  const cleaned = (code || "").trim();

  const specializationMap: Record<string, string> = {
    CST: "CST",
    CS: "CS",
    CT: "CT",
    SE: "Software Engineering",
    KE: "Knowledge Engineering",
    BIS: "Business Information Systems",
    HPC: "High Performance Computing",
    CN: "Communication and Networking",
    ES: "Embedded Systems",
    CSEC: "Cyber Security",
    "Software Engineering": "Software Engineering",
    "Knowledge Engineering": "Knowledge Engineering",
    "Business Information Systems": "Business Information Systems",
    "High Performance Computing": "High Performance Computing",
    "Communication and Networking": "Communication and Networking",
    "Embedded Systems": "Embedded Systems",
    "Embedded System": "Embedded Systems",
    "Cyber Security": "Cyber Security",
  };

  return specializationMap[cleaned] || cleaned;
}

function semesterToNumber(semester: string): number {
  const parsed = parseInt(semester, 10);
  if (!isNaN(parsed)) return parsed;

  const s = (semester || "").toLowerCase();
  if (s.includes("first")) return 1;
  if (s.includes("second")) return 2;
  return 0;
}

// Helper to get semester display
function getSemesterDisplay(yearLevel: string, semester: string): string {
  return `Year ${yearLevel} - Semester ${semester}`;
}

// View model for date-grouped display
type ExamDateGroup = {
  examDate: string;
  dayOfWeek: string;
  rooms: RoomSchedule[];
};

type RoomSchedule = {
  roomId: number;
  roomNumber: string;
  roomCapacity: number;
  examRoomId: number;
  primaryGroup: {
    yearLevel: string;
    semester: string;
    program?: string;
    specialization?: string;
  } | null;
  secondaryGroup: {
    yearLevel: string;
    semester: string;
    program?: string;
    specialization?: string;
  } | null;
  totalStudents: number;
};

type RoomExamDetail = {
  roomNumber: string;
  roomCapacity: number;
  examDate: string;
  dayOfWeek: string;
  primaryExams: Array<{
    subjectCode: string;
    subjectName: string;
    yearLevel: string;
    semester: string;
    program: string;
    specialization: string | null;
    students: number;
    startTime: string;
    endTime: string;
  }>;
  secondaryExams: Array<{
    subjectCode: string;
    subjectName: string;
    yearLevel: string;
    semester: string;
    program: string;
    specialization: string | null;
    students: number;
    startTime: string;
    endTime: string;
  }>;
  totalStudents: number;
};

function formatTime(t: string) {
  if (!t) return "";
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

function deriveStatus(examDate: string): "scheduled" | "completed" {
  const today = getTodayISO();
  return examDate >= today ? "scheduled" : "completed";
}

const ExamsOverview: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [examDates, setExamDates] = useState<ExamDateGroup[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomExamDetail | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        // 1. Get unique exam dates
        const uniqueDates = await examQueries.getUniqueDates();

        // 2. Get rooms for each date using the new function
        const dateGroups: ExamDateGroup[] = [];

        for (const dateInfo of uniqueDates) {
          const date = dateInfo.exam_date;

          // ✅ Use the new getRoomsByDate function
          const roomsResult = await examRoomQueries.getRoomsByDate(date);

          if (!roomsResult.success) {
            console.error(
              `Failed to load rooms for ${date}:`,
              roomsResult.error,
            );
            continue;
          }

          const roomsOnDate = roomsResult.data?.[date] || [];

          console.log(`Rooms on ${date}:`, roomsOnDate);

          const rooms: RoomSchedule[] = roomsOnDate.map((examRoom) => {
            return {
              roomId: examRoom.room_id,
              roomNumber: examRoom.room?.room_number || "Unknown",
              roomCapacity: examRoom.room?.capacity || 0,
              examRoomId: examRoom.exam_room_id || 0,
              primaryGroup: examRoom.year_level_primary
                ? {
                    yearLevel: examRoom.year_level_primary,
                    semester: examRoom.sem_primary || "",
                    program: examRoom.program_primary || "",
                    specialization: examRoom.specialization_primary || "",
                  }
                : null,
              secondaryGroup: examRoom.year_level_secondary
                ? {
                    yearLevel: examRoom.year_level_secondary,
                    semester: examRoom.sem_secondary || "",
                    program: examRoom.program_secondary || "",
                    specialization: examRoom.specialization_secondary || "",
                  }
                : null,
              totalStudents:
                (examRoom.students_primary || 0) +
                (examRoom.students_secondary || 0),
            };
          });

          dateGroups.push({
            examDate: date,
            dayOfWeek: dateInfo.day_of_week,
            rooms,
          });
        }

        if (!mounted) return;
        setExamDates(dateGroups);
      } catch (err: any) {
        console.error(err);
        if (!mounted) return;
        setErrorMsg(err?.message ?? "Failed to load exam schedules");
      } finally {
        if (!mounted) return;
        setIsLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const handleRoomClick = async (
    roomId: number,
    roomNumber: string,
    roomCapacity: number,
    examDate: string,
    dayOfWeek: string,
    roomSchedule: RoomSchedule,
  ) => {
    try {
      // Get all exams for this date
      const examsOnDate = await examQueries.getByDate(examDate);

      // Get exam room details to fetch student counts
      const examRoomDetails = await examRoomQueries.getExamRoomById(
        roomSchedule.examRoomId,
      );

      const studentsPrimary = examRoomDetails.data?.students_primary || 0;
      const studentsSecondary = examRoomDetails.data?.students_secondary || 0;

      const matchesGroup = (
        exam: Exam,
        group: {
          yearLevel: string;
          semester: string;
          program?: string;
          specialization?: string;
        },
      ) => {
        const examYearNum = yearLevelToNumber(exam.year_level);
        const examSemNum = semesterToNumber(exam.semester);

        // Normalize specializations for comparison
        const groupSpec = normalizeSpecializationCode(
          group.specialization || "",
        );
        const examSpec = normalizeSpecializationCode(exam.specialization || "");

        // Match year, semester, program, AND specialization
        return (
          examYearNum.toString() === group.yearLevel &&
          examSemNum.toString() === group.semester &&
          exam.program === group.program &&
          groupSpec === examSpec
        );
      };

      // Only show exams that actually match the group criteria
      const primaryExams = roomSchedule.primaryGroup
        ? examsOnDate
            .filter((e) => matchesGroup(e, roomSchedule.primaryGroup!))
            .map((exam) => ({
              subjectCode: exam.subject_code,
              subjectName: exam.exam_name,
              yearLevel: exam.year_level,
              semester: exam.semester,
              program: exam.program,
              specialization: exam.specialization,
              students: studentsPrimary,
              startTime: formatTime(exam.start_time),
              endTime: formatTime(exam.end_time),
            }))
        : [];

      const secondaryExams = roomSchedule.secondaryGroup
        ? examsOnDate
            .filter((e) => matchesGroup(e, roomSchedule.secondaryGroup!))
            .map((exam) => ({
              subjectCode: exam.subject_code,
              subjectName: exam.exam_name,
              yearLevel: exam.year_level,
              semester: exam.semester,
              program: exam.program,
              specialization: exam.specialization,
              students: studentsSecondary,
              startTime: formatTime(exam.start_time),
              endTime: formatTime(exam.end_time),
            }))
        : [];

      // Calculate total students only for groups that have exams on this date
      const totalStudentsOnDate =
        (primaryExams.length > 0 ? studentsPrimary : 0) +
        (secondaryExams.length > 0 ? studentsSecondary : 0);

      setSelectedRoom({
        roomNumber,
        roomCapacity,
        examDate,
        dayOfWeek,
        primaryExams,
        secondaryExams,
        totalStudents: totalStudentsOnDate,
      });
    } catch (error) {
      console.error("Error fetching room details:", error);
    }
  };

  const filteredDates = examDates.filter((dateGroup) => {
    const status = deriveStatus(dateGroup.examDate);
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.trim().toLowerCase();
    return dateGroup.rooms.some(
      (room) =>
        room.roomNumber.toLowerCase().includes(q) ||
        room.primaryGroup?.program.toLowerCase().includes(q) ||
        room.primaryGroup?.specialization?.toLowerCase().includes(q) ||
        room.secondaryGroup?.program.toLowerCase().includes(q) ||
        room.secondaryGroup?.specialization?.toLowerCase().includes(q),
    );
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Exam Schedule"
        description="View exam schedules grouped by date with room assignments"
      />

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["all", "scheduled", "completed"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by room number, program, or specialization..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Date-Grouped Layout */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading exam schedules...
          </div>
        ) : filteredDates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No exam schedules found
          </div>
        ) : (
          filteredDates.map((dateGroup) => (
            <div
              key={dateGroup.examDate}
              className="bg-card border rounded-lg p-6"
            >
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {dateGroup.examDate}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {dateGroup.dayOfWeek}
                  </p>
                </div>
                <div className="ml-auto">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      deriveStatus(dateGroup.examDate) === "scheduled"
                        ? "badge-primary"
                        : "badge-success"
                    }`}
                  >
                    {deriveStatus(dateGroup.examDate).charAt(0).toUpperCase() +
                      deriveStatus(dateGroup.examDate).slice(1)}
                  </span>
                </div>
              </div>

              {/* Rooms Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dateGroup.rooms.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No rooms assigned for this date
                  </div>
                ) : (
                  dateGroup.rooms.map((room) => (
                    <div
                      key={`${dateGroup.examDate}-${room.roomId}`}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-background"
                      onClick={() =>
                        handleRoomClick(
                          room.roomId,
                          room.roomNumber,
                          room.roomCapacity,
                          dateGroup.examDate,
                          dateGroup.dayOfWeek,
                          room,
                        )
                      }
                    >
                      {/* Room Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">
                            {room.roomNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Capacity: {room.roomCapacity}
                          </p>
                        </div>
                      </div>

                      {/* Assigned Groups */}
                      <div className="space-y-2">
                        {room.primaryGroup && (
                          <div className="border-l-2 border-blue-500 pl-2">
                            <p className="text-sm font-medium text-foreground">
                              {getSemesterDisplay(
                                room.primaryGroup.yearLevel,
                                room.primaryGroup.semester,
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {room.primaryGroup.program}
                              {room.primaryGroup.specialization && (
                                <span className="ml-1">
                                  ({room.primaryGroup.specialization})
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                        {room.secondaryGroup && (
                          <div className="border-l-2 border-green-500 pl-2">
                            <p className="text-sm font-medium text-foreground">
                              {getSemesterDisplay(
                                room.secondaryGroup.yearLevel,
                                room.secondaryGroup.semester,
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {room.secondaryGroup.program}
                              {room.secondaryGroup.specialization && (
                                <span className="ml-1">
                                  ({room.secondaryGroup.specialization})
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Total Students */}
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {room.totalStudents} students
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Room Detail Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {selectedRoom.roomNumber}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedRoom.examDate} ({selectedRoom.dayOfWeek})
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRoom(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Room Info */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Capacity: {selectedRoom.roomCapacity}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Total Students: {selectedRoom.totalStudents}
                  </span>
                </div>
              </div>

              {/* Primary Exams */}
              {selectedRoom.primaryExams.length > 0 && (
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      PRIMARY GROUP
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selectedRoom.primaryExams.length} exam(s)
                    </span>
                  </div>

                  <div className="space-y-4">
                    {selectedRoom.primaryExams.map((ex) => (
                      <div
                        key={ex.subjectCode}
                        className="p-3 rounded-lg border bg-background"
                      >
                        <h3 className="text-base font-semibold text-foreground mb-1">
                          {ex.subjectName}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {ex.subjectCode}
                        </p>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Year Level</p>
                            <p className="font-medium">{ex.yearLevel}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Semester</p>
                            <p className="font-medium">{ex.semester}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Program</p>
                            <p className="font-medium">{ex.program}</p>
                          </div>
                          {ex.specialization && (
                            <div>
                              <p className="text-muted-foreground">
                                Specialization
                              </p>
                              <p className="font-medium">{ex.specialization}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground">Students</p>
                            <p className="font-medium">{ex.students}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {ex.startTime} - {ex.endTime}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Secondary Exams */}
              {selectedRoom.secondaryExams.length > 0 && (
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      SECONDARY GROUP
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selectedRoom.secondaryExams.length} exam(s)
                    </span>
                  </div>

                  <div className="space-y-4">
                    {selectedRoom.secondaryExams.map((ex) => (
                      <div
                        key={ex.subjectCode}
                        className="p-3 rounded-lg border bg-background"
                      >
                        <h3 className="text-base font-semibold text-foreground mb-1">
                          {ex.subjectName}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {ex.subjectCode}
                        </p>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Year Level</p>
                            <p className="font-medium">{ex.yearLevel}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Semester</p>
                            <p className="font-medium">{ex.semester}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Program</p>
                            <p className="font-medium">{ex.program}</p>
                          </div>
                          {ex.specialization && (
                            <div>
                              <p className="text-muted-foreground">
                                Specialization
                              </p>
                              <p className="font-medium">{ex.specialization}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground">Students</p>
                            <p className="font-medium">{ex.students}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {ex.startTime} - {ex.endTime}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRoom.primaryExams.length === 0 &&
                selectedRoom.secondaryExams.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No exam details available for this date
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ExamsOverview;
