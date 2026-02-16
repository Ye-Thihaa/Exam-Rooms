import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  DoorOpen,
  Clock,
  BookOpen,
  ArrowRight,
  MapPin,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStudentDashboardData } from "@/services/studentDashboardService";
import type { StudentDashboardData } from "@/services/studentDashboardService";

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();

  // State
  const [dashboardData, setDashboardData] =
    useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Demo student ID - replace with user?.studentId in production
  const DEMO_STUDENT_ID = 2000;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getStudentDashboardData(DEMO_STUDENT_ID);
      setDashboardData(data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">
            Loading your dashboard...
          </span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="dashboard-card">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={fetchDashboardData}>Try Again</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData?.student) {
    return (
      <DashboardLayout>
        <div className="dashboard-card">
          <p className="text-muted-foreground text-center py-8">
            Student not found
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const { student, exams, upcomingExams, pastExams } = dashboardData;
  const nextExam = upcomingExams[0];

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome, ${student.name}`}
        description="View your exam schedule and seat assignments"
      />

      {/* Student Info Card */}
      <div className="dashboard-card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {student.name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {student.name}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="badge-primary">{student.student_number}</span>
                <span className="text-sm text-muted-foreground">
                  Year {student.year_level} • Semester {student.sem || "N/A"}
                </span>
              </div>
              {student.major && (
                <p className="text-sm text-muted-foreground mt-1">
                  {student.major}{" "}
                  {student.specialization && `• ${student.specialization}`}
                </p>
              )}
              {student.retake && (
                <span className="badge-warning mt-2 inline-block">
                  Retake Student
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/student/timetable">
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                View Timetable
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Exam Highlight */}
        {nextExam ? (
          <div className="lg:col-span-2">
            <div className="dashboard-card border-l-4 border-l-primary">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Your Next Exam
                </h3>
                <span className="badge-warning">Upcoming</span>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-foreground mb-1">
                    {nextExam.exam.exam_name}
                  </h4>
                  <p className="text-muted-foreground mb-4">
                    {nextExam.exam.subject_code} • {nextExam.exam.program}
                    {nextExam.exam.specialization &&
                      ` • ${nextExam.exam.specialization}`}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {formatDate(nextExam.exam.exam_date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {nextExam.exam.day_of_week}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="font-medium">
                          {nextExam.exam.start_time} - {nextExam.exam.end_time}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {nextExam.exam.session}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:border-l md:border-border md:pl-6">
                  <div className="bg-primary/10 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      Your Seat
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      {nextExam.seatingAssignment.seat_number}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Room {nextExam.examRoom.room?.room_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Row {nextExam.seatingAssignment.row_label}, Col{" "}
                      {nextExam.seatingAssignment.column_number}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Group {nextExam.seatingAssignment.student_group}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2">
            <div className="dashboard-card">
              <p className="text-muted-foreground text-center py-8">
                No upcoming exams scheduled
              </p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {exams.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Exams</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {upcomingExams.length}
                </p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <DoorOpen className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {new Set(exams.map((e) => e.examRoom.room_id)).size}
                </p>
                <p className="text-sm text-muted-foreground">Rooms</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Exams List */}
      {exams.length > 0 && (
        <div className="mt-6 dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              All Your Exams
            </h3>
            <Link to="/student/exams">
              <Button variant="ghost" size="sm" className="text-primary">
                View Details <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((examInfo, index) => {
              const isPast = pastExams.some(
                (pe) => pe.exam.exam_id === examInfo.exam.exam_id,
              );
              return (
                <div
                  key={`${examInfo.exam.exam_id}-${index}`}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {examInfo.exam.exam_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {examInfo.exam.subject_code}
                      </p>
                    </div>
                    <span
                      className={`badge-${isPast ? "success" : "primary"} ml-2`}
                    >
                      {isPast ? "Past" : "Upcoming"}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>
                        {formatDate(examInfo.exam.exam_date)} •{" "}
                        {examInfo.exam.day_of_week}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>
                        {examInfo.exam.start_time} - {examInfo.exam.end_time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>
                        Room {examInfo.examRoom.room?.room_number} • Seat{" "}
                        {examInfo.seatingAssignment.seat_number}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {exams.length === 0 && (
        <div className="mt-6 dashboard-card">
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No exams found</p>
            <p className="text-sm text-muted-foreground">
              Exams for your program and year level will appear here once
              scheduled
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentDashboard;
