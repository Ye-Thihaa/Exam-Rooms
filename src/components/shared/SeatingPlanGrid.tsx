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
                          w-12 h-12 rounded-lg flex flex-col items-center justify-center 
                          text-xs font-medium transition-all duration-200
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
                        <span className="text-[10px] opacity-70">
                          {seatNumber}
                        </span>
                        {seat?.isOccupied && (
                          <span className="text-[8px] mt-0.5 truncate max-w-[40px]">
                            {seat.studentId}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>

                    <TooltipContent>
                      <div className="text-sm">
                        <p className="font-medium">Seat {seatNumber}</p>
                        {seat?.isOccupied ? (
                          <>
                            <p className="text-muted-foreground">
                              {seat.studentName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {seat.studentId}
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

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary" />
            <span className="text-sm text-muted-foreground">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-secondary border-2 border-dashed border-primary/30" />
            <span className="text-sm text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-secondary ring-2 ring-ring ring-offset-2" />
            <span className="text-sm text-muted-foreground">Selected</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatingPlanGrid;
