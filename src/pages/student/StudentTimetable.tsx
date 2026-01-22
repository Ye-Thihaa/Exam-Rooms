import React from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import { mockStudents, mockExams, mockRooms } from '@/data/mockData';
import { Calendar, Clock, DoorOpen, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StudentTimetable: React.FC = () => {
  const currentStudent = mockStudents[0];
  
  const enrolledExamDetails = currentStudent.enrolledExams.map(examId => {
    const exam = mockExams.find(e => e.id === examId);
    const seatInfo = currentStudent.seatAssignments.find(sa => sa.examId === examId);
    const room = mockRooms.find(r => r.id === seatInfo?.roomId);
    return { exam, seatInfo, room };
  }).filter(e => e.exam).sort((a, b) => 
    new Date(a.exam!.date).getTime() - new Date(b.exam!.date).getTime()
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      year: date.getFullYear(),
    };
  };

  const handlePrint = () => {
    window.print();
  };

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
            <p className="font-semibold text-foreground">{currentStudent.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Student ID</p>
            <p className="font-semibold text-foreground">{currentStudent.studentId}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Department</p>
            <p className="font-semibold text-foreground">{currentStudent.department}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Semester</p>
            <p className="font-semibold text-foreground">Semester {currentStudent.semester}</p>
          </div>
        </div>
      </div>

      {/* Timetable */}
      <div className="space-y-4">
        {enrolledExamDetails.length === 0 ? (
          <div className="dashboard-card text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No exams scheduled</p>
          </div>
        ) : (
          enrolledExamDetails.map(({ exam, seatInfo, room }, index) => {
            const dateInfo = formatDate(exam!.date);
            const isCompleted = exam?.status === 'completed';
            
            return (
              <div
                key={exam?.id}
                className={`dashboard-card flex flex-col md:flex-row gap-4 md:items-center ${
                  isCompleted ? 'opacity-60' : ''
                }`}
              >
                {/* Date Column */}
                <div className="flex-shrink-0 flex md:flex-col items-center md:items-start gap-3 md:gap-0 md:w-20">
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex flex-col items-center justify-center ${
                    isCompleted ? 'bg-muted' : 'bg-primary text-primary-foreground'
                  }`}>
                    <span className="text-xs font-medium">{dateInfo.month}</span>
                    <span className="text-xl font-bold">{dateInfo.date}</span>
                  </div>
                  <span className="text-sm text-muted-foreground md:mt-1">{dateInfo.day}</span>
                </div>

                {/* Exam Details */}
                <div className="flex-1 md:border-l md:border-border md:pl-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{exam?.name}</h3>
                      <p className="text-sm text-muted-foreground">{exam?.code} • {exam?.subject}</p>
                    </div>
                    <span className={`badge-${isCompleted ? 'success' : 'primary'}`}>
                      {isCompleted ? 'Completed' : 'Scheduled'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Time</p>
                        <p className="font-medium">{exam?.startTime} - {exam?.endTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-primary" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Room</p>
                        <p className="font-medium">{room?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Building</p>
                        <p className="font-medium">{room?.building}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">#</span>
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground">Seat</p>
                        <p className="font-bold text-primary">{seatInfo?.seatNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentTimetable;
