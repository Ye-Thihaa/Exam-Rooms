import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import {
  BookOpen,
  Calendar,
  Clock,
  DoorOpen,
  Users,
  MapPin,
  Loader2,
} from "lucide-react";
import { getStudentDashboardData } from "@/services/studentDashboardService";
import type { StudentDashboardData } from "@/services/studentDashboardService";

const StudentExams: React.FC = () => {
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
      console.error("Error fetching exam data:", err);
      setError(err instanceof Error ? err.message : "Failed to load exam data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Exam Details"
          description="Complete information about your enrolled examinations"
        />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">
            Loading exam details...
          </span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Exam Details"
          description="Complete information about your enrolled examinations"
        />
        <div className="dashboard-card text-center py-8">
          <p className="text-red-600 mb-4">Error: {error}</p>
        </div>
      </DashboardLayout>
    );
  }

  const exams = dashboardData?.exams || [];

  return (
    <DashboardLayout>
      <PageHeader
        title="Exam Details"
        description="Complete information about your enrolled examinations"
      />

      {exams.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No exams enrolled</p>
        </div>
      ) : (
        <div className="space-y-6">
          {exams.map((examInfo) => {
            const { exam, examRoom, seatingAssignment } = examInfo;
            const room = examRoom.room;
            const isPast = new Date(exam.exam_date) < new Date();
            const duration = calculateDuration(exam.start_time, exam.end_time);

            return (
              <div key={exam.exam_id} className="dashboard-card">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Exam Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {exam.exam_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {exam.subject_code} • {exam.program}
                            {exam.specialization && ` • ${exam.specialization}`}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`badge-${isPast ? "success" : "primary"}`}
                      >
                        {isPast ? "Completed" : "Scheduled"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs">Date</span>
                        </div>
                        <p className="font-semibold text-foreground">
                          {formatDate(exam.exam_date)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs">Time</span>
                        </div>
                        <p className="font-semibold text-foreground">
                          {exam.start_time} - {exam.end_time}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs">Duration</span>
                        </div>
                        <p className="font-semibold text-foreground">
                          {duration} minutes
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Users className="h-4 w-4" />
                          <span className="text-xs">Session</span>
                        </div>
                        <p className="font-semibold text-foreground text-sm">
                          {exam.session}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs">Day</span>
                        </div>
                        <p className="font-semibold text-foreground">
                          {exam.day_of_week}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Users className="h-4 w-4" />
                          <span className="text-xs">Year Level</span>
                        </div>
                        <p className="font-semibold text-foreground">
                          {exam.year_level}
                        </p>
                      </div>
                    </div>

                    {/* Academic Info */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                          {exam.academic_year}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {exam.semester}
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          Group {seatingAssignment.student_group}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Room & Seat Info */}
                  <div className="lg:w-64 lg:border-l lg:border-border lg:pl-6">
                    <h4 className="font-medium text-muted-foreground mb-3">
                      Your Assignment
                    </h4>

                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 text-center mb-4">
                      <p className="text-xs text-muted-foreground mb-1">
                        Seat Number
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {seatingAssignment.seat_number}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DoorOpen className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <p className="text-muted-foreground">Room</p>
                          <p className="font-medium text-foreground">
                            Room {room?.room_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <p className="text-muted-foreground">Position</p>
                          <p className="font-medium text-foreground">
                            Row {seatingAssignment.row_label}, Column{" "}
                            {seatingAssignment.column_number}
                          </p>
                        </div>
                      </div>
                      {room && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm">
                            <p className="text-muted-foreground">Capacity</p>
                            <p className="font-medium text-foreground">
                              {room.capacity} seats ({room.rows}×{room.cols})
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">
                        Assigned Capacity
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {examRoom.assigned_capacity} students
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {seatingAssignment.student_group === "A"
                          ? `Primary: ${examRoom.students_primary || 0}`
                          : `Secondary: ${examRoom.students_secondary || 0}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentExams;
