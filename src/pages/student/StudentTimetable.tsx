import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Calendar, Clock, DoorOpen, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStudentDashboardData } from "@/services/studentDashboardService";
import type { StudentDashboardData } from "@/services/studentDashboardService";

const StudentTimetable: React.FC = () => {
  const [dashboardData, setDashboardData] =
    useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Demo student ID
  const DEMO_STUDENT_ID = 2000;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStudentDashboardData(DEMO_STUDENT_ID);
      setDashboardData(data);
    } catch (err) {
      console.error("Error fetching timetable data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load timetable data",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
      year: date.getFullYear(),
      full: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Exam Timetable"
          description="Your personal examination schedule"
        />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">
            Loading timetable...
          </span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Exam Timetable"
          description="Your personal examination schedule"
        />
        <div className="dashboard-card text-center py-8">
          <p className="text-red-600 mb-4">Error: {error}</p>
        </div>
      </DashboardLayout>
    );
  }

  const student = dashboardData?.student;
  const exams = dashboardData?.exams || [];

  if (!student) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Exam Timetable"
          description="Your personal examination schedule"
        />
        <div className="dashboard-card text-center py-8">
          <p className="text-muted-foreground">Student not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Exam Timetable"
        description="Your personal examination schedule"
        actions={
          <Button variant="outline" onClick={handlePrint} className="no-print">
            Print Timetable
          </Button>
        }
      />

      {/* Student Info Header */}
      <div className="dashboard-card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Student Name</p>
            <p className="font-semibold text-foreground">{student.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Student Number</p>
            <p className="font-semibold text-foreground">
              {student.student_number}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Program</p>
            <p className="font-semibold text-foreground">
              {student.major || "N/A"}
              {student.specialization && ` - ${student.specialization}`}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Year & Semester</p>
            <p className="font-semibold text-foreground">
              Year {student.year_level}, Semester {student.sem || "N/A"}
            </p>
          </div>
        </div>
        {student.retake && (
          <div className="mt-3 pt-3 border-t border-border">
            <span className="badge-warning">Retake Student</span>
          </div>
        )}
      </div>

      {/* Timetable */}
      <div className="space-y-4">
        {exams.length === 0 ? (
          <div className="dashboard-card text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No exams scheduled</p>
          </div>
        ) : (
          exams.map((examInfo) => {
            const { exam, examRoom, seatingAssignment } = examInfo;
            const room = examRoom.room;
            const dateInfo = formatDate(exam.exam_date);
            const isCompleted = new Date(exam.exam_date) < new Date();

            return (
              <div
                key={exam.exam_id}
                className={`dashboard-card flex flex-col md:flex-row gap-4 md:items-center ${
                  isCompleted ? "opacity-60" : ""
                }`}
              >
                {/* Date Column */}
                <div className="flex-shrink-0 flex md:flex-col items-center md:items-start gap-3 md:gap-0 md:w-20">
                  <div
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex flex-col items-center justify-center ${
                      isCompleted
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <span className="text-xs font-medium">
                      {dateInfo.month}
                    </span>
                    <span className="text-xl font-bold">{dateInfo.date}</span>
                  </div>
                  <span className="text-sm text-muted-foreground md:mt-1">
                    {dateInfo.day}
                  </span>
                </div>

                {/* Exam Details */}
                <div className="flex-1 md:border-l md:border-border md:pl-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {exam.exam_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {exam.subject_code} • {exam.program}
                        {exam.specialization && ` • ${exam.specialization}`}
                      </p>
                    </div>
                    <span
                      className={`badge-${isCompleted ? "success" : "primary"}`}
                    >
                      {isCompleted ? "Completed" : "Scheduled"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Time</p>
                        <p className="font-medium">
                          {exam.start_time} - {exam.end_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-primary" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Room</p>
                        <p className="font-medium">Room {room?.room_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Position</p>
                        <p className="font-medium">
                          {seatingAssignment.row_label}-
                          {seatingAssignment.column_number}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">
                          #
                        </span>
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground">Seat</p>
                        <p className="font-bold text-primary">
                          {seatingAssignment.seat_number}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                      {exam.session}
                    </span>
                    <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                      {exam.day_of_week}
                    </span>
                    <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                      Group {seatingAssignment.student_group}
                    </span>
                    <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                      Capacity: {examRoom.assigned_capacity}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Footer */}
      {exams.length > 0 && (
        <div className="mt-6 dashboard-card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{exams.length}</p>
              <p className="text-sm text-muted-foreground">Total Exams</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {dashboardData?.upcomingExams.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {dashboardData?.pastExams.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(exams.map((e) => e.examRoom.room_id)).size}
              </p>
              <p className="text-sm text-muted-foreground">Rooms</p>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .dashboard-card {
            page-break-inside: avoid;
            box-shadow: none;
            border: 1px solid #e5e7eb;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default StudentTimetable;
