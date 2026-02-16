// components/shared/SeatingPlanGrid.tsx

import React, { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  const seatingRef = useRef<HTMLDivElement>(null);
  const rowLabels = "ABCDEFGHIJKLMNOPQRST".split("").slice(0, rows);

  // Create a lookup map for quick access
  const seatMap = new Map<string, SeatAssignment>();
  seats.forEach((seat) => {
    const key = `${seat.row}-${seat.column}`;
    seatMap.set(key, seat);
  });

  const assignedCount = seats.filter((s) => s.isOccupied).length;

  /**
   * Export seating plan to PDF
   */
  const handleExportToPDF = async () => {
    if (!seatingRef.current) return;

    try {
      // Hide the export button temporarily
      const exportButton = document.getElementById("pdf-export-button");
      if (exportButton) exportButton.style.display = "none";

      // Capture the seating plan as canvas
      const canvas = await html2canvas(seatingRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Show the button again
      if (exportButton) exportButton.style.display = "";

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Create PDF
      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? "portrait" : "landscape",
        unit: "mm",
        format: "a4",
      });

      // Add the image to PDF
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      // Save the PDF with simplified filename: roomno.pdf
      pdf.save(`${roomName}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Export Button */}
      <div className="flex justify-end mb-4">
        <Button
          id="pdf-export-button"
          variant="outline"
          size="sm"
          onClick={handleExportToPDF}
        >
          <Download className="h-4 w-4 mr-2" />
          Export to PDF
        </Button>
      </div>

      {/* Seating Plan Content */}
      <div ref={seatingRef} className="bg-white p-8">
        {/* Room Header */}
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
          <h1 className="text-3xl font-bold mb-2">EXAMINATION SEATING PLAN</h1>
          <h2 className="text-2xl font-semibold mb-2">Room {roomName}</h2>
        </div>

        {/* Front of Room Indicator */}
        <div className="border-2 border-gray-800 rounded-lg p-4 text-center bg-gray-100 mb-6">
          <span className="text-lg font-bold text-gray-800">
            ▼ FRONT OF EXAMINATION ROOM ▼
          </span>
        </div>

        {/* Seating Grid */}
        <div className="space-y-3 mb-6">
          {/* Column headers */}
          <div className="flex items-center gap-2 justify-center mb-2">
            <div className="w-8"></div> {/* Spacer for row labels */}
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${seatsPerRow}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: seatsPerRow }, (_, i) => (
                <div
                  key={i}
                  className="text-center text-xs font-medium text-gray-500"
                  style={{ width: "120px" }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {rowLabels.map((rowLabel, rowIndex) => (
            <div
              key={rowLabel}
              className="flex items-center gap-2 justify-center"
            >
              {/* Row label */}
              <div className="w-8 text-center text-sm font-medium text-gray-500">
                {rowLabel}
              </div>

              {/* Seats in this row */}
              <div
                className="grid gap-2"
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
                        className="aspect-square rounded border-2 border-gray-300 bg-gray-50 flex items-center justify-center"
                        style={{ width: "120px", height: "120px" }}
                      >
                        <span className="text-xs text-gray-400">—</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={colIndex}
                      className={`p-3 flex flex-col items-center justify-center rounded border-2 relative ${
                        seat.isOccupied
                          ? "border-gray-800 bg-white"
                          : "border-gray-300 bg-gray-50"
                      }`}
                      style={{ width: "120px", height: "120px" }}
                    >
                      {/* Seat position label (subtle, in corner) */}
                      <span className="absolute top-1 left-1 text-[10px] text-gray-400">
                        {rowLabel}
                        {column}
                      </span>

                      {seat.isOccupied && seat.studentNumber ? (
                        <>
                          <span className="font-bold text-sm leading-tight text-center break-all">
                            {seat.studentNumber}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeatingPlanGrid;
