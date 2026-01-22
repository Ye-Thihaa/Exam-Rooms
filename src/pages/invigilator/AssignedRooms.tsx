import React from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import { mockExams, mockRooms, mockInvigilators } from '@/data/mockData';
import { DoorOpen, Users, MapPin, Layers, Monitor, Thermometer, Camera } from 'lucide-react';

const AssignedRooms: React.FC = () => {
  const currentInvigilator = mockInvigilators[0];
  const assignedExams = mockExams.filter(e => 
    currentInvigilator.assignedExams.includes(e.id) && e.status === 'scheduled'
  );
  
  // Get unique rooms from assigned exams
  const assignedRoomIds = [...new Set(assignedExams.map(e => e.roomId).filter(Boolean))];
  const assignedRooms = mockRooms.filter(r => assignedRoomIds.includes(r.id));

  const facilityIcons: Record<string, React.ReactNode> = {
    'Projector': <Monitor className="h-3 w-3" />,
    'AC': <Thermometer className="h-3 w-3" />,
    'CCTV': <Camera className="h-3 w-3" />,
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Assigned Rooms"
        description="Exam rooms assigned to you for supervision"
      />

      {assignedRooms.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <DoorOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No rooms assigned for upcoming exams</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignedRooms.map((room) => {
            const roomExams = assignedExams.filter(e => e.roomId === room.id);
            return (
              <div key={room.id} className="dashboard-card">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <DoorOpen className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground">{room.name}</h3>
                    <p className="text-sm text-muted-foreground">{room.building}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">Capacity</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">{room.capacity} seats</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Layers className="h-4 w-4" />
                      <span className="text-xs">Layout</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">{room.rows} × {room.seatsPerRow}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs">Floor</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">Floor {room.floor}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <span className="text-xs">Exams</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">{roomExams.length} scheduled</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {room.facilities.map((facility) => (
                    <span
                      key={facility}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary rounded-full text-xs font-medium text-secondary-foreground"
                    >
                      {facilityIcons[facility] || null}
                      {facility}
                    </span>
                  ))}
                </div>

                {roomExams.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Upcoming Exams in this Room:</p>
                    <div className="space-y-2">
                      {roomExams.map((exam) => (
                        <div key={exam.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-primary/5">
                          <span className="font-medium">{exam.code}</span>
                          <span className="text-muted-foreground">{exam.date} at {exam.startTime}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AssignedRooms;
