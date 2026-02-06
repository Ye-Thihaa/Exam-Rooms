// components/shared/SeatingPlanGrid.tsx

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SeatAssignment {
  seatNumber: string;
  row: string;
  column: number;
  isOccupied: boolean;
  studentId?: number;
  studentNumber?: string;
  studentName?: string;
  studentGroup?: string;
}

interface SeatingPlanGridProps {
  seats: SeatAssignment[];
  rows: number;
  seatsPerRow: number;
  roomName: string;
  seatPrefix?: string;
}

const SeatingPlanGrid: React.FC<SeatingPlanGridProps> = ({
  seats,
  rows,
  seatsPerRow,
  roomName,
  seatPrefix = "",
}) => {
  const rowLabels = "ABCDEFGHIJKLMNOPQRST".split("").slice(0, rows);

  // Create a lookup map for quick access
  const seatMap = new Map<string, SeatAssignment>();
  seats.forEach((seat) => {
    const key = `${seat.row}-${seat.column}`;
    seatMap.set(key, seat);
  });

  return (
    <div className="space-y-4">
      {/* Room Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Room {roomName}</h2>
        <Badge variant="outline" className="text-sm">
          {seats.filter((s) => s.isOccupied).length} / {seats.length} seats
          occupied
        </Badge>
      </div>

      {/* Front of Room Indicator */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center bg-gray-50">
        <span className="text-sm font-medium text-gray-600">FRONT OF ROOM</span>
      </div>

      {/* Seating Grid */}
      <div className="space-y-3">
        {rowLabels.map((rowLabel, rowIndex) => (
          <div key={rowLabel} className="flex items-center gap-2">
            {/* Row Label */}
            <div className="w-8 h-20 flex items-center justify-center">
              <span className="font-bold text-lg text-gray-700">
                {rowLabel}
              </span>
            </div>

            {/* Seats in this row */}
            <div
              className="flex-1 grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${seatsPerRow}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: seatsPerRow }, (_, colIndex) => {
                const column = colIndex + 1;
                const seatKey = `${rowLabel}-${column}`;
                const seat = seatMap.get(seatKey);

                if (!seat) {
                  return (
                    <div
                      key={colIndex}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 flex items-center justify-center"
                    >
                      <span className="text-xs text-gray-400">N/A</span>
                    </div>
                  );
                }

                return (
                  <Card
                    key={colIndex}
                    className={`aspect-square p-2 flex flex-col items-center justify-center transition-all hover:shadow-md cursor-pointer ${
                      seat.isOccupied
                        ? "bg-teal-600 text-white hover:bg-teal-700"
                        : "bg-white text-gray-400 border-2 border-dashed border-gray-300"
                    }`}
                    title={
                      seat.isOccupied
                        ? `${seat.studentNumber}\n${seat.studentName}\n${seat.studentGroup}`
                        : "Empty Seat"
                    }
                  >
                    {seat.isOccupied ? (
                      <>
                        <span className="font-bold text-xs mb-1 truncate w-full text-center">
                          {seat.studentNumber}
                        </span>
                        <span className="text-[10px] opacity-90 truncate w-full text-center">
                          {seat.studentName?.split(" ")[0]}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-medium">Empty</span>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Column Numbers (on the right) */}
            <div className="w-8 h-20 flex items-center justify-center">
              <span className="font-bold text-lg text-gray-700">
                {rowLabel}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Column Number Labels */}
      <div className="flex items-center gap-2">
        <div className="w-8"></div>
        <div
          className="flex-1 grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${seatsPerRow}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: seatsPerRow }, (_, i) => (
            <div
              key={i}
              className="text-center text-sm font-semibold text-gray-600"
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div className="w-8"></div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-teal-600"></div>
          <span className="text-sm font-medium">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border-2 border-dashed border-gray-300 bg-white"></div>
          <span className="text-sm font-medium">Empty</span>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-teal-600">
            {seats.filter((s) => s.isOccupied).length}
          </div>
          <div className="text-sm text-gray-600">Occupied Seats</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">
            {seats.filter((s) => !s.isOccupied).length}
          </div>
          <div className="text-sm text-gray-600">Empty Seats</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{seats.length}</div>
          <div className="text-sm text-gray-600">Total Capacity</div>
        </Card>
      </div>
    </div>
  );
};

export default SeatingPlanGrid;
