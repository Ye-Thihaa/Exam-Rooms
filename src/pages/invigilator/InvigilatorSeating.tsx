import React, { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import SeatingPlanGrid from '@/components/shared/SeatingPlanGrid';
import { mockExams, mockRooms, mockInvigilators, generateSeatingPlan } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Printer, ChevronDown } from 'lucide-react';

const InvigilatorSeating: React.FC = () => {
  const currentInvigilator = mockInvigilators[0];
  const assignedExams = mockExams.filter(e => 
    currentInvigilator.assignedExams.includes(e.id) && e.status === 'scheduled'
  );

  const [selectedExam, setSelectedExam] = useState(assignedExams[0]);
  const selectedRoom = mockRooms.find(r => r.id === selectedExam?.roomId) || mockRooms[0];
  const seats = selectedExam ? generateSeatingPlan(selectedRoom.id, selectedExam.id) : [];

  const handlePrint = () => {
    window.print();
  };

  if (assignedExams.length === 0) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Seating Plans"
          description="View seating arrangements for your assigned exams"
        />
        <div className="dashboard-card text-center py-12">
          <p className="text-muted-foreground">No seating plans available for your assigned exams</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Seating Plans"
        description="View seating arrangements for your assigned exams"
        actions={
          <Button variant="outline" onClick={handlePrint} className="no-print">
            <Printer className="h-4 w-4 mr-2" />
            Print Plan
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Exam Selector */}
        <div className="lg:col-span-1 space-y-4 no-print">
          <div className="dashboard-card">
            <h3 className="font-semibold text-foreground mb-4">Select Exam</h3>
            <div className="relative">
              <select
                value={selectedExam?.id || ''}
                onChange={(e) => {
                  const exam = assignedExams.find(ex => ex.id === e.target.value);
                  if (exam) setSelectedExam(exam);
                }}
                className="form-input pr-10"
              >
                {assignedExams.map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.code} - {exam.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {selectedExam && (
            <div className="dashboard-card">
              <h3 className="font-semibold text-foreground mb-4">Exam Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code</span>
                  <span className="font-medium">{selectedExam.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{selectedExam.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{selectedExam.startTime} - {selectedExam.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room</span>
                  <span className="font-medium">{selectedRoom.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Students</span>
                  <span className="font-medium">{selectedExam.totalStudents}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Seating Plan */}
        <div className="lg:col-span-3">
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedExam?.name || 'Seating Plan'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedRoom.name} • {selectedRoom.building}
                </p>
              </div>
            </div>

            <SeatingPlanGrid
              seats={seats}
              rows={selectedRoom.rows}
              seatsPerRow={selectedRoom.seatsPerRow}
              roomName={selectedRoom.name}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvigilatorSeating;
