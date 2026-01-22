import React from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import { mockExams, mockRooms, mockInvigilators } from '@/data/mockData';
import { Calendar, Clock, DoorOpen, ChevronRight } from 'lucide-react';

const InvigilatorSchedule: React.FC = () => {
  const currentInvigilator = mockInvigilators[0];
  const assignedExams = mockExams.filter(e => 
    currentInvigilator.assignedExams.includes(e.id)
  );

  // Group exams by date
  const groupedExams = assignedExams.reduce((acc, exam) => {
    if (!acc[exam.date]) {
      acc[exam.date] = [];
    }
    acc[exam.date].push(exam);
    return acc;
  }, {} as Record<string, typeof mockExams>);

  // Sort dates
  const sortedDates = Object.keys(groupedExams).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isPast = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Exam Schedule"
        description="Your complete supervision schedule"
      />

      {sortedDates.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No exams scheduled</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const exams = groupedExams[date];
            const past = isPast(date);
            const today = isToday(date);

            return (
              <div key={date} className={`${past ? 'opacity-60' : ''}`}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    today ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {formatDate(date)}
                      {today && (
                        <span className="ml-2 badge-primary">Today</span>
                      )}
                      {past && (
                        <span className="ml-2 text-xs text-muted-foreground">(Past)</span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {exams.length} exam{exams.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="ml-6 border-l-2 border-muted pl-6 space-y-4">
                  {exams.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((exam) => {
                    const room = mockRooms.find(r => r.id === exam.roomId);
                    return (
                      <div
                        key={exam.id}
                        className="relative dashboard-card hover:shadow-md transition-shadow"
                      >
                        {/* Timeline dot */}
                        <div className={`absolute -left-[calc(1.5rem+9px)] top-6 w-4 h-4 rounded-full border-2 ${
                          today ? 'bg-primary border-primary' : 'bg-background border-muted'
                        }`} />

                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{exam.name}</h4>
                            <p className="text-sm text-muted-foreground">{exam.code} • {exam.department}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span>{exam.startTime} - {exam.endTime}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DoorOpen className="h-4 w-4 text-primary" />
                            <span>{room?.name}, {room?.building}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Duration:</span>
                            <span>{exam.duration} mins</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default InvigilatorSchedule;
