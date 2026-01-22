import React from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import { mockStudents, mockExams, mockRooms } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, DoorOpen, Clock, BookOpen, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Get current student data (mock - using first student with matching ID or first student)
  const currentStudent = mockStudents.find(s => s.studentId === user?.studentId) || mockStudents[0];
  
  const enrolledExamDetails = currentStudent.enrolledExams.map(examId => {
    const exam = mockExams.find(e => e.id === examId);
    const seatInfo = currentStudent.seatAssignments.find(sa => sa.examId === examId);
    const room = mockRooms.find(r => r.id === seatInfo?.roomId);
    return { exam, seatInfo, room };
  }).filter(e => e.exam);

  const upcomingExams = enrolledExamDetails.filter(e => e.exam?.status === 'scheduled');
  const nextExam = upcomingExams[0];

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome, ${currentStudent.name}`}
        description="View your exam schedule and seat assignments"
      />

      {/* Student Info Card */}
      <div className="dashboard-card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {currentStudent.name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{currentStudent.name}</h2>
              <p className="text-sm text-muted-foreground">{currentStudent.email}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="badge-primary">{currentStudent.studentId}</span>
                <span className="text-sm text-muted-foreground">
                  {currentStudent.department} • Semester {currentStudent.semester}
                </span>
              </div>
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
        {nextExam && (
          <div className="lg:col-span-2">
            <div className="dashboard-card border-l-4 border-l-primary">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Your Next Exam</h3>
                <span className="badge-warning">Upcoming</span>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-foreground mb-1">
                    {nextExam.exam?.name}
                  </h4>
                  <p className="text-muted-foreground mb-4">
                    {nextExam.exam?.code} • {nextExam.exam?.department}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium">{nextExam.exam?.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="font-medium">{nextExam.exam?.startTime} - {nextExam.exam?.endTime}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:border-l md:border-border md:pl-6">
                  <div className="bg-primary/10 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Your Seat</p>
                    <p className="text-3xl font-bold text-primary">{nextExam.seatInfo?.seatNumber}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {nextExam.room?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {nextExam.room?.building}
                    </p>
                  </div>
                </div>
              </div>
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
                <p className="text-2xl font-bold text-foreground">{currentStudent.enrolledExams.length}</p>
                <p className="text-sm text-muted-foreground">Enrolled Exams</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{upcomingExams.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Exams List */}
      <div className="mt-6 dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">All Your Exams</h3>
          <Link to="/student/exams">
            <Button variant="ghost" size="sm" className="text-primary">
              View Details <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrolledExamDetails.map(({ exam, seatInfo, room }) => (
            <div
              key={exam?.id}
              className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{exam?.name}</p>
                  <p className="text-sm text-muted-foreground">{exam?.code}</p>
                </div>
                <span className={`badge-${exam?.status === 'scheduled' ? 'primary' : 'success'}`}>
                  {exam?.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{exam?.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{room?.name} • {seatInfo?.seatNumber}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
