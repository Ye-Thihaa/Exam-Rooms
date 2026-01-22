import React from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import { mockStudents, mockExams, mockRooms } from '@/data/mockData';
import { DoorOpen, MapPin, Calendar, Clock, Users, Layers } from 'lucide-react';

const StudentSeat: React.FC = () => {
  const currentStudent = mockStudents[0];
  
  const seatAssignments = currentStudent.seatAssignments.map(sa => {
    const exam = mockExams.find(e => e.id === sa.examId);
    const room = mockRooms.find(r => r.id === sa.roomId);
    return { ...sa, exam, room };
  }).filter(sa => sa.exam && sa.room);

  return (
    <DashboardLayout>
      <PageHeader
        title="My Seat Information"
        description="View your assigned seats for all examinations"
      />

      {seatAssignments.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <DoorOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No seat assignments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {seatAssignments.map((assignment) => (
            <div key={`${assignment.examId}-${assignment.seatNumber}`} className="dashboard-card">
              {/* Exam Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{assignment.exam?.name}</h3>
                  <p className="text-sm text-muted-foreground">{assignment.exam?.code}</p>
                </div>
                <span className={`badge-${assignment.exam?.status === 'scheduled' ? 'primary' : 'success'}`}>
                  {assignment.exam?.status}
                </span>
              </div>

              {/* Seat Highlight */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Your Assigned Seat</p>
                <p className="text-4xl font-bold text-primary">{assignment.seatNumber}</p>
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <DoorOpen className="h-4 w-4" />
                  <span>{assignment.room?.name}</span>
                </div>
              </div>

              {/* Room Details */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Room Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs">Location</span>
                    </div>
                    <p className="font-medium text-foreground text-sm">{assignment.room?.building}</p>
                    <p className="text-xs text-muted-foreground">Floor {assignment.room?.floor}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Layers className="h-4 w-4" />
                      <span className="text-xs">Layout</span>
                    </div>
                    <p className="font-medium text-foreground text-sm">
                      {assignment.room?.rows} × {assignment.room?.seatsPerRow}
                    </p>
                    <p className="text-xs text-muted-foreground">{assignment.room?.capacity} seats</p>
                  </div>
                </div>
              </div>

              {/* Exam Schedule */}
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-3">Exam Schedule</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm">{assignment.exam?.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      {assignment.exam?.startTime} - {assignment.exam?.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm">{assignment.exam?.totalStudents} students</span>
                  </div>
                </div>
              </div>

              {/* Room Facilities */}
              <div className="mt-4">
                <div className="flex flex-wrap gap-1.5">
                  {assignment.room?.facilities.map((facility) => (
                    <span
                      key={facility}
                      className="px-2 py-0.5 bg-secondary rounded-full text-xs text-secondary-foreground"
                    >
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentSeat;
