import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { examRoomQueries } from "@/services/examroomQueries";
import { seatingAssignmentQueries } from "@/services/seatingassignmentQueries";
import type { ExamRoomWithDetails } from "@/services/examroomQueries";
import type { SeatingAssignmentWithDetails } from "@/services/seatingassignmentQueries";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface StudentRange {
  min: string;
  max: string;
  count: number;
}

interface RoomRangeData {
  examRoom: ExamRoomWithDetails;
  primaryRange: StudentRange | null;
  secondaryRange: StudentRange | null;
}

const RoomRangesEnhanced: React.FC = () => {
  const [roomRanges, setRoomRanges] = useState<RoomRangeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tableRef = React.useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    fetchRoomRanges();
  }, []);

  const fetchRoomRanges = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);

      const examRoomsResult = await examRoomQueries.getAllWithDetails();
      if (!examRoomsResult.success || !examRoomsResult.data) {
        throw new Error("Failed to fetch exam rooms");
      }

      const roomRangesData: RoomRangeData[] = await Promise.all(
        examRoomsResult.data.map(async (examRoom) => {
          try {
            const seatingAssignments =
              await seatingAssignmentQueries.getByExamRoomId(
                examRoom.exam_room_id!,
              );
            const primaryGroup = seatingAssignments.filter(
              (s) => s.student_group === "A",
            );
            const secondaryGroup = seatingAssignments.filter(
              (s) => s.student_group === "B",
            );
            return {
              examRoom,
              primaryRange: calculateRange(primaryGroup),
              secondaryRange: calculateRange(secondaryGroup),
            };
          } catch {
            return { examRoom, primaryRange: null, secondaryRange: null };
          }
        }),
      );

      setRoomRanges(roomRangesData);
    } catch (err) {
      console.error("Error fetching room ranges:", err);
      setError("Failed to load room ranges");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateRange = (
    assignments: SeatingAssignmentWithDetails[],
  ): StudentRange | null => {
    if (assignments.length === 0) return null;
    const studentNumbers = assignments
      .map((a) => a.student?.student_number)
      .filter((num): num is string => !!num)
      .sort();
    if (studentNumbers.length === 0) return null;
    return {
      min: studentNumbers[0],
      max: studentNumbers[studentNumbers.length - 1],
      count: studentNumbers.length,
    };
  };

  const formatGroupInfo = (
    examRoom: ExamRoomWithDetails,
    group: "primary" | "secondary",
  ) => {
    const yearLevel =
      group === "primary"
        ? examRoom.year_level_primary
        : examRoom.year_level_secondary;
    const sem =
      group === "primary" ? examRoom.sem_primary : examRoom.sem_secondary;
    const program =
      group === "primary"
        ? examRoom.program_primary
        : examRoom.program_secondary;
    const spec =
      group === "primary"
        ? examRoom.specialization_primary
        : examRoom.specialization_secondary;

    if (!yearLevel || !sem || !program) return null;
    return { yearLevel, sem, program, spec };
  };

  const exportToPDF = async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        position,
        imgWidth,
        imgHeight,
      );
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          0,
          position,
          imgWidth,
          imgHeight,
        );
        heightLeft -= pageHeight;
      }

      const timestamp = new Date().toISOString().split("T")[0];
      pdf.save(`Room_Ranges_${timestamp}.pdf`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      alert("Failed to export to PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading room ranges...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <p className="text-sm text-destructive">{error}</p>
        <Button onClick={() => fetchRoomRanges()} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (roomRanges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
        <p className="text-sm">No room assignments found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Action Buttons - excluded from PDF */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Room Ranges</h2>
        <div className="flex gap-2">
          <Button
            onClick={exportToPDF}
            disabled={exporting}
            size="sm"
            className="gap-1.5"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? "Exporting..." : "Export PDF"}
          </Button>
          <Button
            onClick={() => fetchRoomRanges(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table — thead and title shown on screen only, tbody exported to PDF */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r w-24">
                Room No.
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r">
                Group A Info
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r w-44">
                Group A Range
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r">
                Group B Info
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-44">
                Group B Range
              </th>
            </tr>
          </thead>
          <tbody ref={tableRef}>
            {roomRanges.map(
              ({ examRoom, primaryRange, secondaryRange }, idx) => {
                const primaryInfo = formatGroupInfo(examRoom, "primary");
                const secondaryInfo = formatGroupInfo(examRoom, "secondary");

                return (
                  <tr
                    key={examRoom.exam_room_id}
                    className={`border-b last:border-b-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    {/* Room Number */}
                    <td className="px-4 py-3 border-r font-medium text-gray-900 align-top">
                      <span className="font-semibold">
                        {examRoom.room?.room_number || "N/A"}
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Cap:{" "}
                        {examRoom.assigned_capacity ??
                          examRoom.room?.capacity ??
                          0}
                      </div>
                    </td>

                    {/* Group A Info */}
                    <td className="px-4 py-3 border-r align-top">
                      {primaryInfo ? (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-800">
                            {primaryInfo.program}
                          </div>
                          <div className="text-xs text-gray-500">
                            Year {primaryInfo.yearLevel} · Sem {primaryInfo.sem}
                          </div>
                          {primaryInfo.spec && (
                            <div className="text-xs text-gray-500">
                              {primaryInfo.spec}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">
                          Not assigned
                        </span>
                      )}
                    </td>

                    {/* Group A Range */}
                    <td className="px-4 py-3 border-r align-top">
                      {primaryRange ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono text-sm">
                            <span className="text-gray-700">
                              {primaryRange.min}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-gray-700">
                              {primaryRange.max}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {primaryRange.count} student
                            {primaryRange.count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">
                          No students
                        </span>
                      )}
                    </td>

                    {/* Group B Info */}
                    <td className="px-4 py-3 border-r align-top">
                      {secondaryInfo ? (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-800">
                            {secondaryInfo.program}
                          </div>
                          <div className="text-xs text-gray-500">
                            Year {secondaryInfo.yearLevel} · Sem{" "}
                            {secondaryInfo.sem}
                          </div>
                          {secondaryInfo.spec && (
                            <div className="text-xs text-gray-500">
                              {secondaryInfo.spec}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">
                          Not assigned
                        </span>
                      )}
                    </td>

                    {/* Group B Range */}
                    <td className="px-4 py-3 align-top">
                      {secondaryRange ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono text-sm">
                            <span className="text-gray-700">
                              {secondaryRange.min}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-gray-700">
                              {secondaryRange.max}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {secondaryRange.count} student
                            {secondaryRange.count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">
                          No students
                        </span>
                      )}
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoomRangesEnhanced;
