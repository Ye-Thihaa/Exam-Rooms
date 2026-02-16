import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  MapPin,
  Link2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { examRoomLinkageService } from "@/services/examRoomLinkage";
import type {
  DateGroupedLinkage,
  ExamRoomLinkage,
} from "@/services/examRoomLinkage";
import { seatingAssignmentQueries } from "@/services/seatingassignmentQueries";
import SpecialExamSeatingPlanGrid from "@/components/shared/SpecialExamSeatingPlanGrid";

interface SeatingModalState {
  isOpen: boolean;
  examRoomId: number | null;
  roomNumber: string;
  roomCapacity: number;
  rows: number;
  cols: number;
  hasGroupA: boolean;
  hasGroupB: boolean;
}

const SpecialExamSeatingAssignment: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [linkages, setLinkages] = useState<DateGroupedLinkage[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Seating modal state
  const [seatingModal, setSeatingModal] = useState<SeatingModalState>({
    isOpen: false,
    examRoomId: null,
    roomNumber: "",
    roomCapacity: 0,
    rows: 0,
    cols: 0,
    hasGroupA: false,
    hasGroupB: false,
  });
  const [seatingData, setSeatingData] = useState<any[]>([]);
  const [isLoadingSeating, setIsLoadingSeating] = useState(false);
  const [seatingError, setSeatingError] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const [linkagesResult, statsResult] = await Promise.all([
          examRoomLinkageService.getAll(),
          examRoomLinkageService.getStats(),
        ]);

        if (!linkagesResult.success) {
          throw new Error(linkagesResult.error || "Failed to load linkages");
        }

        if (statsResult.success) {
          setStats(statsResult.data);
        }

        setLinkages(linkagesResult.data || []);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err?.message ?? "Failed to load exam room linkages");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Open seating modal and fetch seating data
  const handleViewSeating = async (linkage: ExamRoomLinkage) => {
    // Determine which groups have exams
    const hasGroupA =
      linkage.linkedExams?.primary && linkage.linkedExams.primary.length > 0;
    const hasGroupB =
      linkage.linkedExams?.secondary &&
      linkage.linkedExams.secondary.length > 0;

    // Derive rows/cols from capacity or use a default
    const capacity = linkage.roomCapacity ?? 36;
    const cols = 6;
    const rows = Math.ceil(capacity / cols);

    setSeatingModal({
      isOpen: true,
      examRoomId: linkage.examRoomId,
      roomNumber: linkage.roomNumber,
      roomCapacity: capacity,
      rows,
      cols,
      hasGroupA,
      hasGroupB,
    });
    setSeatingData([]);
    setSeatingError(null);
    setIsLoadingSeating(true);

    try {
      const assignments = await seatingAssignmentQueries.getByExamRoomId(
        linkage.examRoomId,
      );

      // Transform into SeatAssignment shape expected by SpecialExamSeatingPlanGrid
      const seats = assignments.map((a: any) => ({
        seatNumber: a.seat_number,
        row: a.row_label ?? a.seat_number?.charAt(0) ?? "A",
        column: a.column_number,
        isOccupied: true,
        studentId: a.student_id,
        studentNumber: a.student?.student_number ?? String(a.student_id),
        studentName: a.student?.name ?? "",
        studentGroup: a.student_group, // "A" or "B"
      }));

      setSeatingData(seats);
    } catch (err: any) {
      console.error(err);
      setSeatingError(err?.message ?? "Failed to load seating assignments");
    } finally {
      setIsLoadingSeating(false);
    }
  };

  const handleCloseModal = () => {
    setSeatingModal((prev) => ({ ...prev, isOpen: false }));
    setSeatingData([]);
    setSeatingError(null);
  };

  // Get status color and icon
  const getLinkageStatus = (linkage: ExamRoomLinkage) => {
    if (linkage.totalLinkedExams === 0) {
      return {
        color: "text-red-500",
        bg: "bg-red-50 dark:bg-red-950/20",
        icon: <AlertCircle className="h-4 w-4" />,
        label: "No exams linked",
      };
    }
    return {
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-950/20",
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: `${linkage.totalLinkedExams} exam${linkage.totalLinkedExams > 1 ? "s" : ""} linked`,
    };
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Special Exam Seating Assignments"
        description="Overview of exam room assignments and their linked exams"
      />

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Rooms</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalRooms}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-primary opacity-20" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Exams</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalExams}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Exam Dates</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalDates}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Exams/Room</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.averageExamsPerRoom}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500 opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {stats &&
        (stats.roomsWithoutExams > 0 || stats.examsWithoutRooms > 0) && (
          <div className="mb-6 p-4 rounded-lg border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="space-y-1">
                {stats.roomsWithoutExams > 0 && (
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ {stats.roomsWithoutExams} room(s) have no linked exams
                  </p>
                )}
                {stats.examsWithoutRooms > 0 && (
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ {stats.examsWithoutRooms} exam(s) are not assigned to any
                    room
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Main Content */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading exam room linkages...
          </div>
        ) : linkages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No exam room linkages found
          </div>
        ) : (
          linkages.map((dateGroup) => (
            <div
              key={dateGroup.examDate}
              className="bg-card border rounded-lg overflow-hidden"
            >
              {/* Date Header */}
              <div
                className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() =>
                  setSelectedDate(
                    selectedDate === dateGroup.examDate
                      ? null
                      : dateGroup.examDate,
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {dateGroup.examDate}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {dateGroup.dayOfWeek}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {dateGroup.totalRooms} Rooms
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dateGroup.totalExams} Unique Exams
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    {selectedDate === dateGroup.examDate ? "−" : "+"}
                  </Button>
                </div>
              </div>

              {/* Expanded Content */}
              {selectedDate === dateGroup.examDate && (
                <div className="p-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dateGroup.linkages.map((linkage) => {
                      const status = getLinkageStatus(linkage);
                      return (
                        <div
                          key={linkage.examRoomId}
                          className="border rounded-lg p-4 bg-background flex flex-col"
                        >
                          {/* Room Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <div>
                                <p className="font-semibold text-foreground">
                                  {linkage.roomNumber}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Capacity: {linkage.roomCapacity}
                                </p>
                              </div>
                            </div>
                            <div
                              className={`flex items-center gap-1 ${status.color}`}
                            >
                              {status.icon}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className={`${status.bg} rounded p-2 mb-3`}>
                            <div className="flex items-center gap-2">
                              <Link2 className={`h-4 w-4 ${status.color}`} />
                              <span
                                className={`text-sm font-medium ${status.color}`}
                              >
                                {status.label}
                              </span>
                            </div>
                          </div>

                          {/* Groups */}
                          <div className="space-y-2">
                            {linkage.primaryGroup && (
                              <div className="border-l-2 border-blue-500 pl-2">
                                <p className="text-xs font-medium text-foreground">
                                  Primary Group
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Y{linkage.primaryGroup.yearLevel} - S
                                  {linkage.primaryGroup.semester} |{" "}
                                  {linkage.primaryGroup.program}
                                </p>
                                {linkage.primaryGroup.specialization && (
                                  <p className="text-xs text-muted-foreground">
                                    {linkage.primaryGroup.specialization}
                                  </p>
                                )}
                                <p className="text-xs text-blue-600 font-medium mt-1">
                                  {linkage.linkedExams.primary.length} exam(s)
                                </p>
                              </div>
                            )}

                            {linkage.secondaryGroup && (
                              <div className="border-l-2 border-green-500 pl-2">
                                <p className="text-xs font-medium text-foreground">
                                  Secondary Group
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Y{linkage.secondaryGroup.yearLevel} - S
                                  {linkage.secondaryGroup.semester} |{" "}
                                  {linkage.secondaryGroup.program}
                                </p>
                                {linkage.secondaryGroup.specialization && (
                                  <p className="text-xs text-muted-foreground">
                                    {linkage.secondaryGroup.specialization}
                                  </p>
                                )}
                                <p className="text-xs text-green-600 font-medium mt-1">
                                  {linkage.linkedExams.secondary.length} exam(s)
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Students */}
                          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                            Total Students: {linkage.totalStudents}
                          </div>

                          {/* Linked Exams Preview */}
                          {linkage.totalLinkedExams > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Linked Exams:
                              </p>
                              <div className="space-y-1">
                                {linkage.linkedExams.primary
                                  .slice(0, 2)
                                  .map((exam) => (
                                    <p
                                      key={exam.exam_id}
                                      className="text-xs text-foreground truncate"
                                    >
                                      • {exam.subject_code} - {exam.exam_name}
                                    </p>
                                  ))}
                                {linkage.linkedExams.secondary
                                  .slice(0, 2)
                                  .map((exam) => (
                                    <p
                                      key={exam.exam_id}
                                      className="text-xs text-foreground truncate"
                                    >
                                      • {exam.subject_code} - {exam.exam_name}
                                    </p>
                                  ))}
                                {linkage.totalLinkedExams > 4 && (
                                  <p className="text-xs text-muted-foreground italic">
                                    +{linkage.totalLinkedExams - 4} more...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ── View Seating Assignment Button ── */}
                          <div className="mt-4 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSeating(linkage);
                              }}
                            >
                              <LayoutGrid className="h-4 w-4" />
                              View Seating Assignment
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Seating Assignment Modal ── */}
      <Dialog open={seatingModal.isOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Seating Assignment — Room {seatingModal.roomNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            {isLoadingSeating ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Loading seating assignments...</p>
              </div>
            ) : seatingError ? (
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {seatingError}
              </div>
            ) : seatingData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <LayoutGrid className="h-10 w-10 opacity-30" />
                <p className="text-sm">
                  No seating assignments found for this room.
                </p>
              </div>
            ) : (
              <SpecialExamSeatingPlanGrid
                seats={seatingData}
                rows={seatingModal.rows}
                seatsPerRow={seatingModal.cols}
                roomName={seatingModal.roomNumber}
                hasGroupA={seatingModal.hasGroupA}
                hasGroupB={seatingModal.hasGroupB}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SpecialExamSeatingAssignment;
