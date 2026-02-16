import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import {
  GraduationCap,
  BookOpen,
  DoorOpen,
  ClipboardList,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getTotalStudentCount,
  getRecentStudents,
  Student,
} from "@/services/studentQueries";
import {
  getTotalRoomCount,
  getAvailableRoomCount,
} from "@/services/Roomqueries";
import { examQueries, Exam } from "@/services/examQueries";

const ExamOfficerDashboard: React.FC = () => {
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [totalRooms, setTotalRooms] = useState<number>(0);
  const [availableRooms, setAvailableRooms] = useState<number>(0);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [completedExams, setCompletedExams] = useState<number>(0);
  const [totalScheduledExams, setTotalScheduledExams] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [
          studentCount,
          students,
          roomCount,
          availableRoomCount,
          upcoming,
          past,
        ] = await Promise.all([
          getTotalStudentCount(),
          getRecentStudents(6),
          getTotalRoomCount(),
          getAvailableRoomCount(),
          examQueries.getUpcoming(),
          examQueries.getPast(),
        ]);

        setTotalStudents(studentCount);
        setRecentStudents(students);
        setTotalRooms(roomCount);
        setAvailableRooms(availableRoomCount);
        setUpcomingExams(upcoming.slice(0, 4)); // Show only 4 upcoming exams
        setTotalScheduledExams(upcoming.length);
        setCompletedExams(past.length);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    // timeString is in HH:MM:SS format
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Exam Officer Dashboard"
        description="Manage examinations and seating arrangements"
        actions={
          <Link to="/exam-officer/insert-data">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Insert Data
            </Button>
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Students"
          value={loading ? "..." : totalStudents}
          subtitle="Active enrollment"
          icon={GraduationCap}
          variant="primary"
        />
        <StatCard
          title="Scheduled Exams"
          value={loading ? "..." : totalScheduledExams}
          subtitle="Pending examination"
          icon={BookOpen}
          variant="success"
        />
        <StatCard
          title="Available Rooms"
          value={loading ? "..." : availableRooms}
          subtitle={`of ${loading ? "..." : totalRooms} total`}
          icon={DoorOpen}
          variant="warning"
        />
        <StatCard
          title="Completed Exams"
          value={loading ? "..." : completedExams}
          subtitle="This semester"
          icon={ClipboardList}
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="dashboard-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/exam-officer/create-exam">
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">Create Exam</p>
                <p className="text-sm text-muted-foreground">
                  Set up a new exam
                </p>
              </div>
            </Link>
            <Link to="/exam-officer/seating">
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">Generate Seating</p>
                <p className="text-sm text-muted-foreground">
                  Auto-assign seats
                </p>
              </div>
            </Link>
            <Link to="/exam-officer/students">
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">Student Records</p>
                <p className="text-sm text-muted-foreground">
                  View all students
                </p>
              </div>
            </Link>
            <Link to="/exam-officer/rooms">
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <DoorOpen className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">Room Capacity</p>
                <p className="text-sm text-muted-foreground">Manage rooms</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Upcoming Exams
            </h3>
            <Link to="/exam-officer/exams">
              <Button variant="ghost" size="sm" className="text-primary">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-pulse text-muted-foreground">
                  Loading exams...
                </div>
              </div>
            ) : upcomingExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No upcoming exams</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Create an exam to get started
                </p>
              </div>
            ) : (
              upcomingExams.map((exam) => (
                <div
                  key={exam.exam_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {exam.exam_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {exam.subject_code}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {exam.year_level}
                      </span>
                      {exam.specialization && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          {exam.specialization}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-medium text-foreground whitespace-nowrap">
                      {formatDate(exam.exam_date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(exam.start_time)}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {exam.day_of_week}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Students */}
      <div className="mt-6 dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Recent Students
          </h3>
          <Link to="/exam-officer/students">
            <Button variant="ghost" size="sm" className="text-primary">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">
              Loading students...
            </div>
          </div>
        ) : recentStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <GraduationCap className="h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">No students found</p>
            <p className="text-sm text-muted-foreground/70">
              Add students to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentStudents.map((student) => (
              <div
                key={student.student_id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {student.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">
                    {student.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {student.student_number}
                    </p>
                    {student.retake && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                        Retake
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ExamOfficerDashboard;
