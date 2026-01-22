import React, { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import SeatingPlanGrid from '@/components/shared/SeatingPlanGrid';
import { mockExams, mockRooms, generateSeatingPlan, SeatAssignment } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { RefreshCw, Printer, Download, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SeatingGenerator: React.FC = () => {
  const { toast } = useToast();
  const [selectedExam, setSelectedExam] = useState(mockExams[0]);
  const [selectedRoom, setSelectedRoom] = useState(mockRooms[0]);
  const [seats, setSeats] = useState<SeatAssignment[]>(() =>
    generateSeatingPlan(mockRooms[0].id, mockExams[0].id)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<string | undefined>();

  const handleExamChange = (examId: string) => {
    const exam = mockExams.find(e => e.id === examId);
    if (exam) {
      setSelectedExam(exam);
      const room = mockRooms.find(r => r.id === exam.roomId) || mockRooms[0];
      setSelectedRoom(room);
      setSeats(generateSeatingPlan(room.id, exam.id));
      setSelectedSeat(undefined);
    }
  };

  const handleGenerateSeating = async () => {
    setIsGenerating(true);
    // Simulate generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSeats(generateSeatingPlan(selectedRoom.id, selectedExam.id));
    setIsGenerating(false);
    toast({
      title: 'Seating Plan Generated',
      description: 'New seating arrangement has been created successfully.',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const occupiedSeats = seats.filter(s => s.isOccupied).length;

  return (
    <DashboardLayout>
      <PageHeader
        title="Exam Room Generator"
        description="Generate and manage seating arrangements for examinations"
        actions={
          <div className="flex items-center gap-2 no-print">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <div className="lg:col-span-1 space-y-4 no-print">
          <div className="dashboard-card">
            <h3 className="font-semibold text-foreground mb-4">Select Exam</h3>
            <div className="relative">
              <select
                value={selectedExam.id}
                onChange={(e) => handleExamChange(e.target.value)}
                className="form-input pr-10"
              >
                {mockExams.filter(e => e.status === 'scheduled').map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.code} - {exam.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

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
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{selectedExam.department}</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h3 className="font-semibold text-foreground mb-4">Seat Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Seats</span>
                <span className="text-lg font-bold text-foreground">{selectedRoom.capacity}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Occupied</span>
                <span className="text-lg font-bold text-primary">{occupiedSeats}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Available</span>
                <span className="text-lg font-bold text-green-600">{selectedRoom.capacity - occupiedSeats}</span>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Occupancy</span>
                  <span className="font-medium">{Math.round((occupiedSeats / selectedRoom.capacity) * 100)}%</span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(occupiedSeats / selectedRoom.capacity) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleGenerateSeating}
            disabled={isGenerating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate / Regenerate'}
          </Button>
        </div>

        {/* Seating Plan */}
        <div className="lg:col-span-3">
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Seating Plan</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedRoom.name} • {selectedRoom.building}
                </p>
              </div>
              <span className="badge-primary">
                {selectedRoom.rows} × {selectedRoom.seatsPerRow} Layout
              </span>
            </div>

            <SeatingPlanGrid
              seats={seats}
              rows={selectedRoom.rows}
              seatsPerRow={selectedRoom.seatsPerRow}
              roomName={selectedRoom.name}
              onSeatClick={(seat) => setSelectedSeat(seat.seatNumber)}
              selectedSeat={selectedSeat}
            />
          </div>

          {/* Selected Seat Info */}
          {selectedSeat && (
            <div className="mt-4 dashboard-card animate-slide-up">
              <h4 className="font-semibold text-foreground mb-3">Selected Seat: {selectedSeat}</h4>
              {(() => {
                const seat = seats.find(s => s.seatNumber === selectedSeat);
                if (seat?.isOccupied) {
                  return (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Student Name</p>
                        <p className="font-medium">{seat.studentName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Student ID</p>
                        <p className="font-medium">{seat.studentId}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Row</p>
                        <p className="font-medium">Row {seat.row}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Column</p>
                        <p className="font-medium">Seat {seat.column}</p>
                      </div>
                    </div>
                  );
                }
                return <p className="text-muted-foreground">This seat is currently available.</p>;
              })()}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SeatingGenerator;
