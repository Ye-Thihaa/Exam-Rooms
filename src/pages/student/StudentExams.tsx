import React from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import { mockStudents, mockExams, mockRooms } from '@/data/mockData';
import { BookOpen, Calendar, Clock, DoorOpen, Users, MapPin } from 'lucide-react';

const StudentExams: React.FC = () => {
  const currentStudent = mockStudents[0];
  
  const enrolledExamDetails = currentStudent.enrolledExams.map(examId => {
    const exam = mockExams.find(e => e.id === examId);
    const seatInfo = currentStudent.seatAssignments.find(sa => sa.examId === examId);
    const room = mockRooms.find(r => r.id === seatInfo?.roomId);
    return { exam, seatInfo, room };
  }).filter(e => e.exam);

  return (
    <DashboardLayout>
      <PageHeader
        title="Exam Details"
        description="Complete information about your enrolled examinations"
      />

      {enrolledExamDetails.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No exams enrolled</p>
        </div>
      ) : (
        <div className="space-y-6">
          {enrolledExamDetails.map(({ exam, seatInfo, room }) => (
            <div key={exam?.id} className="dashboard-card">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Exam Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{exam?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {exam?.code} • {exam?.subject}
                        </p>
                      </div>
                    </div>
                    <span className={`badge-${exam?.status === 'scheduled' ? 'primary' : 'success'}`}>
                      {exam?.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs">Date</span>
                      </div>
                      <p className="font-semibold text-foreground">{exam?.date}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">Time</span>
                      </div>
                      <p className="font-semibold text-foreground">
                        {exam?.startTime} - {exam?.endTime}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">Duration</span>
                      </div>
                      <p className="font-semibold text-foreground">{exam?.duration} minutes</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-xs">Department</span>
                      </div>
                      <p className="font-semibold text-foreground text-sm">{exam?.department}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-xs">Total Students</span>
                      </div>
                      <p className="font-semibold text-foreground">{exam?.totalStudents}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Room & Seat Info */}
                <div className="lg:w-64 lg:border-l lg:border-border lg:pl-6">
                  <h4 className="font-medium text-muted-foreground mb-3">Your Assignment</h4>
                  
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 text-center mb-4">
                    <p className="text-xs text-muted-foreground mb-1">Seat Number</p>
                    <p className="text-3xl font-bold text-primary">{seatInfo?.seatNumber}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Room</p>
                        <p className="font-medium text-foreground">{room?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Building</p>
                        <p className="font-medium text-foreground">{room?.building}, Floor {room?.floor}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1">
                    {room?.facilities.map((facility) => (
                      <span
                        key={facility}
                        className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground"
                      >
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentExams;
