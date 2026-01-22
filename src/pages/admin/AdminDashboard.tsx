import React from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { getDashboardStats, mockExams, mockRooms } from '@/data/mockData';
import { Users, BookOpen, DoorOpen, ClipboardList, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminDashboard: React.FC = () => {
  const stats = getDashboardStats();
  const upcomingExams = mockExams.filter(e => e.status === 'scheduled').slice(0, 5);

  return (
    <DashboardLayout>
      <PageHeader
        title="Admin Dashboard"
        description="Overview of the examination system"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          subtitle="Active accounts"
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          subtitle="Enrolled students"
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Total Exams"
          value={stats.totalExams}
          subtitle={`${stats.upcomingExams} upcoming`}
          icon={BookOpen}
          variant="success"
        />
        <StatCard
          title="Exam Rooms"
          value={stats.totalRooms}
          subtitle={`${stats.availableRooms} available`}
          icon={DoorOpen}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Exams */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Upcoming Exams</h3>
            <Link to="/admin/exams">
              <Button variant="ghost" size="sm" className="text-primary">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{exam.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {exam.code} • {exam.department}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{exam.date}</p>
                  <p className="text-xs text-muted-foreground">
                    {exam.startTime} - {exam.endTime}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Status */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Room Status</h3>
            <Link to="/admin/rooms">
              <Button variant="ghost" size="sm" className="text-primary">
                Manage <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {mockRooms.slice(0, 5).map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <DoorOpen className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{room.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {room.building} • Floor {room.floor}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {room.capacity} seats
                  </span>
                  <span
                    className={`badge-${room.isAvailable ? 'success' : 'warning'}`}
                  >
                    {room.isAvailable ? 'Available' : 'In Use'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 dashboard-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/admin/users">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
              <Users className="h-6 w-6 text-primary" />
              <span>Manage Users</span>
            </Button>
          </Link>
          <Link to="/admin/exams">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span>View Exams</span>
            </Button>
          </Link>
          <Link to="/admin/rooms">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
              <DoorOpen className="h-6 w-6 text-primary" />
              <span>Room Setup</span>
            </Button>
          </Link>
          <Link to="/admin/roles">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              <span>Assign Roles</span>
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
