import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import {
  DoorOpen,
  MapPin,
  Calendar,
  Clock,
  Users,
  Layers,
  Loader2,
  Grid,
} from "lucide-react";
import { getStudentDashboardData } from "@/services/studentDashboardService";
import type { StudentDashboardData } from "@/services/studentDashboardService";

const StudentSeat: React.FC = () => {
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
      console.error("Error fetching seat data:", err);
      setError(err instanceof Error ? err.message : "Failed to load seat data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader
          title="My Seat Information"
          description="View your assigned seats for all examinations"
        />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">
            Loading seat information...
          </span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <PageHeader
          title="My Seat Information"
          description="View your assigned seats for all examinations"
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
        title="My Seat Information"
        description="View your assigned seats for all examinations"
      />

      {exams.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <DoorOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No seat assignments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {exams.map((examInfo) => {
            const { exam, examRoom, seatingAssignment } = examInfo;
            const room = examRoom.room;
            const isPast = new Date(exam.exam_date) < new Date();

            return (
              <div
                key={`${exam.exam_id}-${seatingAssignment.seating_id}`}
                className="dashboard-card"
              >
                {/* Exam Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {exam.exam_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {exam.subject_code}
                    </p>
                  </div>
                  <span className={`badge-${isPast ? "success" : "primary"}`}>
                    {isPast ? "Completed" : "Scheduled"}
                  </span>
                </div>

                {/* Seat Highlight */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Your Assigned Seat
                  </p>
                  <p className="text-4xl font-bold text-primary">
                    {seatingAssignment.seat_number}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <DoorOpen className="h-4 w-4" />
                    <span>Room {room?.room_number}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span>Row {seatingAssignment.row_label}</span>
                    <span>•</span>
                    <span>Column {seatingAssignment.column_number}</span>
                    <span>•</span>
                    <span>Group {seatingAssignment.student_group}</span>
                  </div>
                </div>

                {/* Room Details */}
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Room Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <MapPin className="h-4 w-4" />
                        <span className="text-xs">Room Number</span>
                      </div>
                      <p className="font-medium text-foreground text-sm">
                        Room {room?.room_number}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Layers className="h-4 w-4" />
                        <span className="text-xs">Layout</span>
                      </div>
                      <p className="font-medium text-foreground text-sm">
                        {room?.rows} × {room?.cols}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {room?.capacity} seats
                      </p>
                    </div>
                  </div>

                  {/* Additional Room Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Grid className="h-4 w-4" />
                        <span className="text-xs">Assigned</span>
                      </div>
                      <p className="font-medium text-foreground text-sm">
                        {examRoom.assigned_capacity} students
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-xs">Your Group</span>
                      </div>
                      <p className="font-medium text-foreground text-sm">
                        Group {seatingAssignment.student_group}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {seatingAssignment.student_group === "A"
                          ? `${examRoom.students_primary || 0} students`
                          : `${examRoom.students_secondary || 0} students`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Exam Schedule */}
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="font-medium text-foreground mb-3">
                    Exam Schedule
                  </h4>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        {formatDate(exam.exam_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        {exam.start_time} - {exam.end_time}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Program Info */}
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                      {exam.program}
                    </span>
                    {exam.specialization && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {exam.specialization}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                      {exam.year_level}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      {exam.session}
                    </span>
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

export default StudentSeat;
