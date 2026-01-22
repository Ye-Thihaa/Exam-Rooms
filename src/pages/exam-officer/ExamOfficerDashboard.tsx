import React from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { getDashboardStats, mockExams, mockStudents } from '@/data/mockData';
import { GraduationCap, BookOpen, DoorOpen, ClipboardList, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ExamOfficerDashboard: React.FC = () => {
  const stats = getDashboardStats();
  const upcomingExams = mockExams.filter(e => e.status === 'scheduled').slice(0, 4);

  return (
    <DashboardLayout>
      <PageHeader
        title="Exam Officer Dashboard"
        description="Manage examinations and seating arrangements"
        actions={
          <Link to="/exam-officer/create-exam">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Exam
            </Button>
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          subtitle="Active enrollment"
          icon={GraduationCap}
          variant="primary"
        />
        <StatCard
          title="Scheduled Exams"
          value={stats.upcomingExams}
          subtitle="Pending examination"
          icon={BookOpen}
          variant="success"
        />
        <StatCard
          title="Available Rooms"
          value={stats.availableRooms}
          subtitle={`of ${stats.totalRooms} total`}
          icon={DoorOpen}
          variant="warning"
        />
        <StatCard
          title="Completed Exams"
          value={stats.completedExams}
          subtitle="This semester"
          icon={ClipboardList}
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="dashboard-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/exam-officer/create-exam">
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">Create Exam</p>
                <p className="text-sm text-muted-foreground">Set up a new exam</p>
              </div>
            </Link>
            <Link to="/exam-officer/seating">
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">Generate Seating</p>
                <p className="text-sm text-muted-foreground">Auto-assign seats</p>
              </div>
            </Link>
            <Link to="/exam-officer/students">
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">Student Records</p>
                <p className="text-sm text-muted-foreground">View all students</p>
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
            <h3 className="text-lg font-semibold text-foreground">Upcoming Exams</h3>
            <Link to="/exam-officer/seating">
              <Button variant="ghost" size="sm" className="text-primary">
                Manage <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">{exam.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {exam.code} • {exam.totalStudents} students
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{exam.date}</p>
                  <p className="text-xs text-muted-foreground">{exam.startTime}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Students */}
      <div className="mt-6 dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Recent Students</h3>
          <Link to="/exam-officer/students">
            <Button variant="ghost" size="sm" className="text-primary">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockStudents.slice(0, 6).map((student) => (
            <div
              key={student.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {student.name.charAt(0)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{student.name}</p>
                <p className="text-sm text-muted-foreground">{student.studentId}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ExamOfficerDashboard;
