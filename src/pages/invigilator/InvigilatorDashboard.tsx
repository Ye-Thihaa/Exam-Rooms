import React from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { mockExams, mockRooms, mockInvigilators } from '@/data/mockData';
import { BookOpen, DoorOpen, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const InvigilatorDashboard: React.FC = () => {
  // Get current invigilator (mock - using first one)
  const currentInvigilator = mockInvigilators[0];
  const assignedExams = mockExams.filter(e => 
    currentInvigilator.assignedExams.includes(e.id)
  );
  const upcomingExams = assignedExams.filter(e => e.status === 'scheduled');

  return (
    <DashboardLayout>
      <PageHeader
        title="Invigilator Dashboard"
        description={`Welcome back, ${currentInvigilator.name}`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Assigned Exams"
          value={assignedExams.length}
          subtitle="Total assignments"
          icon={BookOpen}
          variant="primary"
        />
        <StatCard
          title="Upcoming"
          value={upcomingExams.length}
          subtitle="Pending supervision"
          icon={Calendar}
          variant="success"
        />
        <StatCard
          title="Completed"
          value={assignedExams.filter(e => e.status === 'completed').length}
          subtitle="This semester"
          icon={Clock}
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Exams */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Your Upcoming Exams</h3>
            <Link to="/invigilator/exams">
              <Button variant="ghost" size="sm" className="text-primary">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingExams.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No upcoming exams assigned
              </p>
            ) : (
              upcomingExams.map((exam) => {
                const room = mockRooms.find(r => r.id === exam.roomId);
                return (
                  <div
                    key={exam.id}
                    className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{exam.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {exam.code} • {exam.department}
                        </p>
                      </div>
                      <span className="badge-primary">{exam.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{exam.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{exam.startTime} - {exam.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2 col-span-2">
                        <DoorOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{room?.name} - {room?.building}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="space-y-4">
          <div className="dashboard-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Your Information</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{currentInvigilator.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{currentInvigilator.department}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-sm">{currentInvigilator.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{currentInvigilator.phone}</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/invigilator/seating">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Seating Plans
                </Button>
              </Link>
              <Link to="/invigilator/schedule">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </Link>
              <Link to="/invigilator/rooms">
                <Button variant="outline" className="w-full justify-start">
                  <DoorOpen className="h-4 w-4 mr-2" />
                  My Rooms
                </Button>
              </Link>
              <Link to="/invigilator/exams">
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Exams
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvigilatorDashboard;
