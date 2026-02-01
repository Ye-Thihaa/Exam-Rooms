import React from "react";
import { SeatAssignment } from "@/data/mockData";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SeatingPlanGridProps {
  seats: SeatAssignment[];
  rows: number;
  seatsPerRow: number;
  roomName: string;
  showLegend?: boolean;
  onSeatClick?: (seat: SeatAssignment) => void;
  selectedSeat?: string;
  seatPrefix?: string; // ✅ NEW: default TNT
}

const SeatingPlanGrid: React.FC<SeatingPlanGridProps> = ({
  seats,
  rows,
  seatsPerRow,
  roomName,
  showLegend = true,
  onSeatClick,
  selectedSeat,
  seatPrefix = "TNT",
}) => {
  const rowLabels = "ABCDEFGHIJKLMNOPQRST".split("").slice(0, rows);

  return (
    <div className="space-y-4">
      {/* Room header */}
      <div className="text-center p-3 bg-primary/10 rounded-lg border-2 border-dashed border-primary/30">
        <span className="text-sm font-medium text-primary">
          FRONT - {roomName}
        </span>
      </div>

      {/* Seating grid */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-fit">
          {/* Column numbers */}
          <div className="flex gap-1 mb-2 pl-8">
            {Array.from({ length: seatsPerRow }, (_, i) => (
              <div
                key={i}
                className="w-12 h-6 flex items-center justify-center text-xs font-medium text-muted-foreground"
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Rows with seats */}
          {rowLabels.map((rowLabel, rowIndex) => (
            <div key={rowLabel} className="flex gap-1 mb-1">
              {/* Row label */}
              <div className="w-6 h-12 flex items-center justify-center text-xs font-medium text-muted-foreground">
                {rowLabel}
              </div>

              {/* Seats in this row */}
              {Array.from({ length: seatsPerRow }, (_, colIndex) => {
                // ✅ TNT seat numbering
                const seatIndex = rowIndex * seatsPerRow + colIndex + 1;
                const seatNumber = `${seatPrefix}-${seatIndex}`;

                const seat = seats.find((s) => s.seatNumber === seatNumber);
                const isSelected = selectedSeat === seatNumber;

                return (
                  <Tooltip key={seatNumber}>
                    <TooltipTrigger asChild>
                      <button
                        className={`
                          w-12 h-12 rounded-lg flex items-center justify-center 
                          text-[9px] font-semibold transition-all duration-200
                          ${
                            seat?.isOccupied
                              ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                              : "bg-secondary text-secondary-foreground border-2 border-dashed border-primary/20 hover:border-primary/40"
                          }
                          ${isSelected ? "ring-2 ring-ring ring-offset-2" : ""}
                          ${onSeatClick ? "cursor-pointer" : "cursor-default"}
                        `}
                        onClick={() => seat && onSeatClick?.(seat)}
                      >
                        {seat?.isOccupied && seat?.rollNumber ? (
                          <span className="truncate px-1">
                            {seat.rollNumber}
                          </span>
                        ) : (
                          <span className="text-[10px] opacity-50">Empty</span>
                        )}
                      </button>
                    </TooltipTrigger>

                    <TooltipContent>
                      <div className="text-sm">
                        <p className="font-medium">Seat {seatNumber}</p>
                        {seat?.isOccupied ? (
                          <>
                            {seat.rollNumber && (
                              <p className="text-muted-foreground font-medium">
                                {seat.rollNumber}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {seat.studentGroup}
                            </p>
                          </>
                        ) : (
                          <p className="text-muted-foreground">Available</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend - Removed as per requirement */}
    </div>
  );
};

export default SeatingPlanGrid;
