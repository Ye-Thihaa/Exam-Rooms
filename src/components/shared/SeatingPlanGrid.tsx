// components/shared/SeatingPlanGrid.tsx

import React, { useRef } from "react";
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
  groupType?: "A" | "B";
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

  const seatMap = new Map<string, SeatAssignment>();
  seats.forEach((seat) => {
    const key = `${seat.row}-${seat.column}`;
    seatMap.set(key, seat);
  });

  const assignedCount = seats.filter((s) => s.isOccupied).length;
  const totalSeats = rows * seatsPerRow;
  const vacantCount = totalSeats - assignedCount;
  const utilizationPct = Math.round((assignedCount / totalSeats) * 100);

  const groupACount = seats.filter((s) => s.isOccupied && s.groupType === "A").length;
  const groupBCount = seats.filter((s) => s.isOccupied && s.groupType === "B").length;

  const handleExportToPDF = async () => {
    if (!seatingRef.current) return;
    try {
      const exportButton = document.getElementById("pdf-export-button");
      if (exportButton) exportButton.style.display = "none";

      const canvas = await html2canvas(seatingRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      if (exportButton) exportButton.style.display = "";

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? "portrait" : "landscape",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`${roomName}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <div className="space-y-0">
      {/* ── Stats Header ───────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "1px",
          background: "var(--color-border-tertiary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          overflow: "hidden",
          marginBottom: "1.5rem",
        }}
      >
        {[
          {
            label: "Total Seats",
            value: totalSeats,
            icon: "ti-layout-grid",
            accent: "#185FA5",
            bg: "#E6F1FB",
          },
          {
            label: "Assigned",
            value: assignedCount,
            icon: "ti-user-check",
            accent: "#0F6E56",
            bg: "#E1F5EE",
          },
          {
            label: "Vacant",
            value: vacantCount,
            icon: "ti-user-minus",
            accent: "#5F5E5A",
            bg: "#F1EFE8",
          },
          {
            label: "Group A",
            value: groupACount,
            icon: "ti-tag",
            accent: "#534AB7",
            bg: "#EEEDFE",
          },
          {
            label: "Group B",
            value: groupBCount,
            icon: "ti-tag",
            accent: "#993C1D",
            bg: "#FAECE7",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--color-background-primary)",
              padding: "1rem 1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background: stat.bg,
                  color: stat.accent,
                  fontSize: "13px",
                }}
              >
                <i className={`ti ${stat.icon}`} aria-hidden="true" />
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-secondary)",
                  fontWeight: 400,
                  letterSpacing: "0.01em",
                }}
              >
                {stat.label}
              </span>
            </div>
            <span
              style={{
                fontSize: "26px",
                fontWeight: 500,
                color: "var(--color-text-primary)",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Utilization bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "1.5rem",
        }}
      >
        <span
          style={{ fontSize: "12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}
        >
          Room utilization
        </span>
        <div
          style={{
            flex: 1,
            height: "4px",
            background: "var(--color-border-tertiary)",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${utilizationPct}%`,
              background: "#1D9E75",
              borderRadius: "999px",
              transition: "width 0.6s ease",
            }}
          />
        </div>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--color-text-primary)",
            whiteSpace: "nowrap",
            minWidth: "36px",
            textAlign: "right",
          }}
        >
          {utilizationPct}%
        </span>
      </div>

      {/* ── Export Button ───────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
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

      {/* ── Seating Grid ────────────────────────────────────────── */}
      <div ref={seatingRef} style={{ background: "#fff", padding: "2rem" }}>
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "2rem",
            paddingBottom: "1rem",
            borderBottom: "2px solid #1a1a1a",
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            EXAMINATION SEATING PLAN
          </h1>
          <h2 style={{ fontSize: "16px", fontWeight: 500, margin: 0, color: "#444" }}>
            Room {roomName}
          </h2>
        </div>

        {/* Front indicator */}
        <div
          style={{
            border: "1.5px solid #1a1a1a",
            borderRadius: "6px",
            padding: "8px 16px",
            textAlign: "center",
            background: "#f5f5f5",
            marginBottom: "1.5rem",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#1a1a1a",
          }}
        >
          ▼ FRONT OF EXAMINATION ROOM ▼
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            justifyContent: "flex-end",
            marginBottom: "1rem",
          }}
        >
          {[
            { color: "#EEEDFE", border: "#534AB7", label: "Group A" },
            { color: "#FAECE7", border: "#993C1D", label: "Group B" },
            { color: "#f5f5f5", border: "#ccc", label: "Vacant" },
          ].map((item) => (
            <div
              key={item.label}
              style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#555" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  background: item.color,
                  border: `1.5px solid ${item.border}`,
                  borderRadius: "3px",
                }}
              />
              {item.label}
            </div>
          ))}
        </div>

        {/* Column number headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `28px repeat(${seatsPerRow}, 1fr)`,
            gap: "3px",
            marginBottom: "3px",
          }}
        >
          <div />
          {Array.from({ length: seatsPerRow }, (_, i) => (
            <div
              key={i}
              style={{
                textAlign: "center",
                fontSize: "10px",
                color: "#999",
                fontWeight: 500,
                padding: "2px 0",
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {rowLabels.map((rowLabel) => (
            <div
              key={rowLabel}
              style={{
                display: "grid",
                gridTemplateColumns: `28px repeat(${seatsPerRow}, 1fr)`,
                gap: "3px",
                alignItems: "center",
              }}
            >
              {/* Row label */}
              <div
                style={{
                  textAlign: "center",
                  fontSize: "10px",
                  color: "#999",
                  fontWeight: 500,
                }}
              >
                {rowLabel}
              </div>

              {/* Seats */}
              {Array.from({ length: seatsPerRow }, (_, colIndex) => {
                const column = colIndex + 1;
                const seatKey = `${rowLabel}-${column}`;
                const seat = seatMap.get(seatKey);

                if (!seat) {
                  return (
                    <div
                      key={colIndex}
                      style={{
                        aspectRatio: "1",
                        borderRadius: "4px",
                        background: "#fafafa",
                        border: "1px dashed #ddd",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "52px",
                      }}
                    >
                      <span style={{ color: "#ccc", fontSize: "11px" }}>—</span>
                    </div>
                  );
                }

                const isGroupA = seat.isOccupied && seat.groupType === "A";
                const isGroupB = seat.isOccupied && seat.groupType === "B";

                const seatBg = isGroupA
                  ? "#EEEDFE"
                  : isGroupB
                  ? "#FAECE7"
                  : "#fafafa";
                const seatBorder = isGroupA
                  ? "#AFA9EC"
                  : isGroupB
                  ? "#F0997B"
                  : "#e0e0e0";
                const numberColor = isGroupA
                  ? "#3C3489"
                  : isGroupB
                  ? "#712B13"
                  : "#bbb";

                return (
                  <div
                    key={colIndex}
                    style={{
                      aspectRatio: "1",
                      borderRadius: "4px",
                      background: seatBg,
                      border: `1.5px solid ${seatBorder}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      minHeight: "52px",
                      padding: "4px",
                    }}
                  >
                    {/* Seat position badge */}
                    <span
                      style={{
                        position: "absolute",
                        top: "2px",
                        left: "3px",
                        fontSize: "8px",
                        color: isGroupA ? "#7F77DD" : isGroupB ? "#D85A30" : "#ccc",
                        fontWeight: 500,
                        lineHeight: 1,
                      }}
                    >
                      {rowLabel}{column}
                    </span>

                    {seat.isOccupied && seat.studentNumber ? (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: numberColor,
                          textAlign: "center",
                          wordBreak: "break-all",
                          lineHeight: 1.2,
                          marginTop: "6px",
                        }}
                      >
                        {seat.studentNumber}
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#ccc", marginTop: "6px" }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeatingPlanGrid;