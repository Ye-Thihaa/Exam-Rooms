import React from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import { mockExams, mockRooms, mockInvigilators } from '@/data/mockData';
import { Calendar, Clock, DoorOpen, Users } from 'lucide-react';

const AssignedExams: React.FC = () => {
  const currentInvigilator = mockInvigilators[0];
  const assignedExams = mockExams.filter(e => 
    currentInvigilator.assignedExams.includes(e.id)
  );

  const statusColors: Record<string, string> = {
    scheduled: 'badge-primary',
    ongoing: 'badge-warning',
    completed: 'badge-success',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Assigned Exams"
        description="View all examinations assigned to you for supervision"
      />

      <div className="space-y-4">
        {assignedExams.length === 0 ? (
          <div className="dashboard-card text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No exams assigned to you yet</p>
          </div>
        ) : (
          assignedExams.map((exam) => {
            const room = mockRooms.find(r => r.id === exam.roomId);
            return (
              <div key={exam.id} className="dashboard-card">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{exam.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {exam.code} • {exam.department}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p className="font-medium">{exam.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Time</p>
                          <p className="font-medium">{exam.startTime} - {exam.endTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DoorOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Room</p>
                          <p className="font-medium">{room?.name || 'TBA'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Students</p>
                          <p className="font-medium">{exam.totalStudents}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[exam.status]}`}>
                      {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                    </span>
                  </div>
                </div>

                {room && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      <strong>Location:</strong> {room.name}, {room.building}, Floor {room.floor}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {room.facilities.map((facility) => (
                        <span
                          key={facility}
                          className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground"
                        >
                          {facility}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
};

export default AssignedExams;
