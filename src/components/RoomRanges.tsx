import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  DoorOpen,
  Users,
  RefreshCw,
  ArrowRight,
  Building2,
  GraduationCap,
  Download,
  FileText,
} from "lucide-react";
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
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRoomRanges();
  }, []);

  const fetchRoomRanges = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
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

            const primaryRange = calculateRange(primaryGroup);
            const secondaryRange = calculateRange(secondaryGroup);

            return {
              examRoom,
              primaryRange,
              secondaryRange,
            };
          } catch (err) {
            console.error(
              `Error fetching seating for room ${examRoom.exam_room_id}:`,
              err,
            );
            return {
              examRoom,
              primaryRange: null,
              secondaryRange: null,
            };
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

  const getTotalStudents = () => {
    return roomRanges.reduce((total, room) => {
      const primaryCount = room.primaryRange?.count || 0;
      const secondaryCount = room.secondaryRange?.count || 0;
      return total + primaryCount + secondaryCount;
    }, 0);
  };

  const getRoomsWithAssignments = () => {
    return roomRanges.filter((room) => room.primaryRange || room.secondaryRange)
      .length;
  };

  const exportToPDF = async () => {
    if (!contentRef.current) return;

    setExporting(true);
    try {
      // Capture the content as canvas
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "a4");
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        position,
        imgWidth,
        imgHeight,
      );
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
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

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `Room_Ranges_${timestamp}.pdf`;

      // Save PDF
      pdf.save(filename);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      alert("Failed to export to PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
          <div>
            <p className="font-semibold text-lg">Loading Room Ranges</p>
            <p className="text-sm text-muted-foreground">
              Fetching seating assignments...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-destructive/50 bg-destructive/5 max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Building2 className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please try refreshing the page
              </p>
            </div>
            <Button
              onClick={() => fetchRoomRanges()}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (roomRanges.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <DoorOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-lg">No Room Assignments</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create room assignments and generate seating plans to see
                student ranges
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={contentRef} className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Total Rooms
                </p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {roomRanges.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-200/50 dark:bg-blue-800/50 flex items-center justify-center">
                <DoorOpen className="h-6 w-6 text-blue-700 dark:text-blue-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Rooms with Students
                </p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {getRoomsWithAssignments()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-200/50 dark:bg-green-800/50 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-green-700 dark:text-green-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Total Students
                </p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {getTotalStudents()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-200/50 dark:bg-purple-800/50 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-purple-700 dark:text-purple-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button
          onClick={exportToPDF}
          disabled={exporting || roomRanges.length === 0}
          variant="default"
          size="default"
          className="gap-2"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Export to PDF
            </>
          )}
        </Button>

        <Button
          onClick={() => fetchRoomRanges(true)}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh Data
        </Button>
      </div>

      {/* Room Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {roomRanges.map(({ examRoom, primaryRange, secondaryRange }) => (
          <Card
            key={examRoom.exam_room_id}
            className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden"
          >
            {/* Room Header */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <DoorOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">
                      Room {examRoom.room?.room_number || "N/A"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Capacity:{" "}
                      {examRoom.assigned_capacity ||
                        examRoom.room?.capacity ||
                        0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-5 space-y-5">
              {/* Primary Group */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="default"
                    className="text-xs font-semibold px-3 py-1"
                  >
                    PRIMARY GROUP
                  </Badge>
                  {primaryRange && (
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      {primaryRange.count} students
                    </span>
                  )}
                </div>

                {examRoom.year_level_primary &&
                examRoom.sem_primary &&
                examRoom.program_primary ? (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2 flex flex-wrap gap-1">
                      <span className="bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded">
                        Year {examRoom.year_level_primary}
                      </span>
                      <span className="bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded">
                        Sem {examRoom.sem_primary}
                      </span>
                      <span className="bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded">
                        {examRoom.program_primary}
                      </span>
                      {examRoom.specialization_primary && (
                        <span className="bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded">
                          {examRoom.specialization_primary}
                        </span>
                      )}
                    </div>
                    {primaryRange ? (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="font-mono text-sm font-bold text-blue-900 dark:text-blue-100 bg-white dark:bg-blue-950 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700">
                          {primaryRange.min}
                        </span>
                        <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-mono text-sm font-bold text-blue-900 dark:text-blue-100 bg-white dark:bg-blue-950 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700">
                          {primaryRange.max}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-blue-600 dark:text-blue-400 italic mt-2">
                        No students assigned yet
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-xl p-4 border border-dashed border-muted-foreground/30">
                    <p className="text-xs text-muted-foreground italic text-center">
                      No primary group assigned
                    </p>
                  </div>
                )}
              </div>

              {/* Secondary Group */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className="text-xs font-semibold px-3 py-1"
                  >
                    SECONDARY GROUP
                  </Badge>
                  {secondaryRange && (
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      {secondaryRange.count} students
                    </span>
                  )}
                </div>

                {examRoom.year_level_secondary &&
                examRoom.sem_secondary &&
                examRoom.program_secondary ? (
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                    <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2 flex flex-wrap gap-1">
                      <span className="bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded">
                        Year {examRoom.year_level_secondary}
                      </span>
                      <span className="bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded">
                        Sem {examRoom.sem_secondary}
                      </span>
                      <span className="bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded">
                        {examRoom.program_secondary}
                      </span>
                      {examRoom.specialization_secondary && (
                        <span className="bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded">
                          {examRoom.specialization_secondary}
                        </span>
                      )}
                    </div>
                    {secondaryRange ? (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="font-mono text-sm font-bold text-amber-900 dark:text-amber-100 bg-white dark:bg-amber-950 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700">
                          {secondaryRange.min}
                        </span>
                        <ArrowRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="font-mono text-sm font-bold text-amber-900 dark:text-amber-100 bg-white dark:bg-amber-950 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700">
                          {secondaryRange.max}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 dark:text-amber-400 italic mt-2">
                        No students assigned yet
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-xl p-4 border border-dashed border-muted-foreground/30">
                    <p className="text-xs text-muted-foreground italic text-center">
                      No secondary group assigned
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RoomRangesEnhanced;
