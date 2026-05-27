import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2, Download, RefreshCw, AlertTriangle, CheckCircle2,
  ShieldAlert, Calendar, MapPin, UserCheck, UserX, Users,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  teacherAssignmentTableQueries,
  TeacherAssignmentWithRoom,
} from "@/services/teacherAssignmentTableQueries";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomGroup {
  roomNumber: string;
  supervisor: TeacherAssignmentWithRoom | null;
  assistant: TeacherAssignmentWithRoom | null;
  hasConflict: boolean;
  isIncomplete: boolean;
}

interface DateGroup {
  date: string;
  dayOfWeek: string;
  rooms: RoomGroup[];
}

type RoomFilter = "all" | "incomplete" | "complete";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByDateAndRoom(assignments: TeacherAssignmentWithRoom[]): DateGroup[] {
  const dateMap = new Map<string, Map<string, {
    sup: TeacherAssignmentWithRoom | null;
    asst: TeacherAssignmentWithRoom | null;
  }>>();

  for (const a of assignments) {
    const date = a.exam_date ?? "Unknown";
    const room = a.room_number ?? "Unknown";
    if (!dateMap.has(date)) dateMap.set(date, new Map());
    const roomMap = dateMap.get(date)!;
    if (!roomMap.has(room)) roomMap.set(room, { sup: null, asst: null });
    const entry = roomMap.get(room)!;
    if (a.role === "Supervisor") entry.sup = a;
    else if (a.role === "Assistant") entry.asst = a;
  }

  return [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, roomMap]) => ({
      date,
      dayOfWeek: new Date(date).toLocaleDateString("en-US", { weekday: "long" }),
      rooms: [...roomMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([roomNumber, { sup, asst }]) => ({
          roomNumber,
          supervisor: sup,
          assistant: asst,
          hasConflict: (sup?.has_conflict ?? false) || (asst?.has_conflict ?? false),
          isIncomplete: sup === null || asst === null,
        })),
    }));
}

function formatDateChip(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short",
  });
}

// ─── TeacherCell ──────────────────────────────────────────────────────────────

const TeacherCell: React.FC<{
  assignment: TeacherAssignmentWithRoom | null;
  role: "Supervisor" | "Assistant";
}> = ({ assignment, role }) => {
  const isSup = role === "Supervisor";

  if (!assignment) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-dashed border-gray-200">
        <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <UserX className="h-3.5 w-3.5 text-gray-400" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{role}</p>
          <p className="text-xs text-gray-400 italic">Not assigned</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
      assignment.has_conflict
        ? "bg-red-50 border-red-200"
        : isSup ? "bg-blue-50 border-blue-200" : "bg-purple-50 border-purple-200"
    }`}>
      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
        assignment.has_conflict ? "bg-red-100" : isSup ? "bg-blue-100" : "bg-purple-100"
      }`}>
        <UserCheck className={`h-3.5 w-3.5 ${
          assignment.has_conflict ? "text-red-500" : isSup ? "text-blue-600" : "text-purple-600"
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-wide ${
          assignment.has_conflict ? "text-red-500" : isSup ? "text-blue-600" : "text-purple-600"
        }`}>{role}</p>
        <p className="text-xs font-semibold text-gray-900 truncate">{assignment.teacher?.name ?? "—"}</p>
        <p className="text-[10px] text-gray-500 truncate">
          {assignment.teacher?.rank ?? "—"}
          {assignment.has_conflict && (
            <span className="ml-1 text-red-500 font-semibold">· Dept conflict</span>
          )}
        </p>
      </div>
      {assignment.has_conflict && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const TeacherAssignmentsTable: React.FC = () => {
  const [assignments, setAssignments] = useState<TeacherAssignmentWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [roomFilter, setRoomFilter] = useState<RoomFilter>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { load(); }, []);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await teacherAssignmentTableQueries.getAllWithRoomDetails();
      setAssignments(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load assignments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const exportToPDF = async () => {
  if (assignments.length === 0) return;
  setExporting(true);

  try {
    // Create a hidden div with all the data rendered as HTML
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 794px;
      background: white;
      font-family: 'Pyidaungsu', 'Noto Sans Myanmar', 'Myanmar Text', sans-serif;
      padding: 32px;
      box-sizing: border-box;
    `;

    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
    });

    let html = `
      <div style="background:#4f46e5;color:white;padding:12px 16px;border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:16px;font-weight:700;">Teacher Assignments Report</span>
        <span style="font-size:11px;">Generated: ${today}</span>
      </div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:16px;padding:8px 12px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
        Total assignments: ${assignments.length} &nbsp;|&nbsp; Exam dates: ${allDates.length} &nbsp;|&nbsp; Conflicts: ${conflictCount}
      </div>
    `;

    for (const dg of filteredDateGroups) {
      html += `
        <div style="margin-bottom:20px;">
          <div style="background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px 8px 0 0;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:700;font-size:12px;color:#111827;">${dg.dayOfWeek}, ${dg.date}</span>
            <span style="font-size:11px;color:#6b7280;">${dg.rooms.length} room(s)</span>
          </div>
          <div style="border:1px solid #d1d5db;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
      `;

      for (const room of dg.rooms) {
        const supName = room.supervisor?.teacher?.name ?? null;
        const supRank = room.supervisor?.teacher?.rank ?? null;
        const supConflict = room.supervisor?.has_conflict ?? false;
        const asstName = room.assistant?.teacher?.name ?? null;
        const asstRank = room.assistant?.teacher?.rank ?? null;
        const asstConflict = room.assistant?.has_conflict ?? false;

        const statusBadge = room.isIncomplete
          ? `<span style="background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;padding:2px 6px;border-radius:9999px;">INCOMPLETE</span>`
          : `<span style="background:#d1fae5;color:#065f46;font-size:9px;font-weight:700;padding:2px 6px;border-radius:9999px;">COMPLETE</span>`;
        const conflictBadge = room.hasConflict
          ? `<span style="background:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;padding:2px 6px;border-radius:9999px;margin-left:4px;">CONFLICT</span>`
          : "";

        const teacherBox = (
          name: string | null,
          rank: string | null,
          role: string,
          isConflict: boolean,
        ) => {
          const bg = isConflict ? "#fff1f2" : role === "Supervisor" ? "#eff6ff" : "#f5f3ff";
          const border = isConflict ? "#fca5a5" : role === "Supervisor" ? "#bfdbfe" : "#ddd6fe";
          const roleColor = isConflict ? "#dc2626" : role === "Supervisor" ? "#2563eb" : "#7c3aed";

          if (!name) {
            return `
              <div style="flex:1;background:#f9fafb;border:1px dashed #d1d5db;border-radius:6px;padding:8px 10px;">
                <div style="font-size:8px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${role}</div>
                <div style="font-size:11px;color:#9ca3af;font-style:italic;">Not assigned</div>
              </div>`;
          }

          return `
            <div style="flex:1;background:${bg};border:1px solid ${border};border-radius:6px;padding:8px 10px;">
              <div style="font-size:8px;font-weight:700;color:${roleColor};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${role}</div>
              <div style="font-size:12px;font-weight:600;color:#111827;font-family:'Pyidaungsu','Noto Sans Myanmar','Myanmar Text',sans-serif;margin-bottom:2px;">${name}</div>
              <div style="font-size:10px;color:${isConflict ? "#dc2626" : "#6b7280"};">
                ${rank ?? ""}${isConflict ? " · <strong>Dept conflict</strong>" : ""}
              </div>
            </div>`;
        };

        html += `
          <div style="padding:10px 12px;border-bottom:1px solid #f3f4f6;background:${room.isIncomplete ? "#fffbeb" : room.hasConflict ? "#fff5f5" : "white"};">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="font-weight:700;font-size:12px;color:#111827;">Room ${room.roomNumber}</span>
              <span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 8px;border-radius:9999px;">Morning</span>
              <div style="margin-left:auto;display:flex;gap:4px;">${statusBadge}${conflictBadge}</div>
            </div>
            <div style="display:flex;gap:8px;">
              ${teacherBox(supName, supRank, "Supervisor", supConflict)}
              ${teacherBox(asstName, asstRank, "Assistant", asstConflict)}
            </div>
          </div>
        `;
      }

      html += `</div></div>`;
    }

    html += `
      <div style="text-align:center;font-size:9px;color:#9ca3af;margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;">
        Confidential — For Internal Use Only
      </div>
    `;

    container.innerHTML = html;
    document.body.appendChild(container);

    // Wait for fonts to render
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 300));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
    });

    document.body.removeChild(container);

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF("p", "mm", "a4");
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Teacher_Assignments_${new Date().toISOString().split("T")[0]}.pdf`);
  } catch (err) {
    console.error("PDF export error:", err);
    alert("Failed to export PDF. Please try again.");
  } finally {
    setExporting(false);
  }
};

  const allDateGroups = groupByDateAndRoom(assignments);
  const allDates = allDateGroups.map((dg) => dg.date);
  const conflictCount = assignments.filter((a) => a.has_conflict).length;

  // Stats across ALL dates (for filter badge counts — respects date filter)
  const visibleByDate = selectedDate
    ? allDateGroups.filter((dg) => dg.date === selectedDate)
    : allDateGroups;

  const allVisibleRooms = visibleByDate.flatMap((dg) => dg.rooms);
  const incompleteCount = allVisibleRooms.filter((r) => r.isIncomplete).length;
  const completeCount = allVisibleRooms.filter((r) => !r.isIncomplete).length;

  // Apply all filters
  const filteredDateGroups = visibleByDate
    .map((dg) => ({
      ...dg,
      rooms: dg.rooms.filter((r) => {
        if (showConflictsOnly && !r.hasConflict) return false;
        if (roomFilter === "incomplete" && !r.isIncomplete) return false;
        if (roomFilter === "complete" && r.isIncomplete) return false;
        return true;
      }),
    }))
    .filter((dg) => dg.rooms.length > 0);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading assignments…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={() => load()} variant="outline" size="sm">Retry</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold">Teacher Assignments</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {assignments.length} total assignments · {allDates.length} exam date{allDates.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportToPDF}
              disabled={exporting || assignments.length === 0}
              size="sm" className="gap-1.5"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Exporting…" : "Export PDF"}
            </Button>
            <Button
              onClick={() => load(true)} disabled={refreshing}
              variant="outline" size="sm" className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Conflict banner ───────────────────────────────────────────── */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${
          conflictCount > 0
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          {conflictCount > 0 ? (
            <>
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>
                <strong>{conflictCount} conflict{conflictCount !== 1 ? "s" : ""} detected</strong> — teacher assigned to exam from their own department.
              </span>
              <button
                className="ml-auto underline text-xs font-semibold"
                onClick={() => setShowConflictsOnly((v) => !v)}
              >
                {showConflictsOnly ? "Show all" : "Show conflicts only"}
              </button>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span><strong>No department conflicts</strong> — all {assignments.length} assignments are clean.</span>
            </>
          )}
        </div>

        {/* ── Date chips ───────────────────────────────────────────────── */}
        {allDates.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Filter by Date
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedDate(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedDate === null
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary"
                }`}
              >
                All Dates
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedDate === null ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                }`}>
                  {allDates.length}
                </span>
              </button>
              {allDateGroups.map((dg) => {
                const isActive = selectedDate === dg.date;
                const hasIncomplete = dg.rooms.some((r) => r.isIncomplete);
                const hasConflict = dg.rooms.some((r) => r.hasConflict);
                return (
                  <button
                    key={dg.date}
                    onClick={() => setSelectedDate(isActive ? null : dg.date)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isActive
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary"
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    {formatDateChip(dg.date)}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                      {dg.rooms.length}
                    </span>
                    {hasIncomplete && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-amber-300" : "bg-amber-400"}`} />
                    )}
                    {hasConflict && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-red-300" : "bg-red-500"}`} />
                    )}
                  </button>
                );
              })}
            </div>
            {selectedDate && (
              <p className="text-xs text-muted-foreground">
                Showing <strong>{new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong>
                <button className="ml-2 underline text-primary" onClick={() => setSelectedDate(null)}>
                  Clear
                </button>
              </p>
            )}
          </div>
        )}

        {/* ── Room completeness filter ──────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
            Room Filter:
          </span>
          {(["all", "incomplete", "complete"] as RoomFilter[]).map((f) => {
            const labels: Record<RoomFilter, string> = {
              all: `All Rooms (${allVisibleRooms.length})`,
              incomplete: `Missing Teacher (${incompleteCount})`,
              complete: `Both Assigned (${completeCount})`,
            };
            const inactiveColors: Record<RoomFilter, string> = {
              all: "bg-white text-gray-600 border-gray-300 hover:border-gray-500",
              incomplete: "bg-white text-amber-600 border-amber-300 hover:border-amber-500",
              complete: "bg-white text-emerald-600 border-emerald-300 hover:border-emerald-500",
            };
            const activeColors: Record<RoomFilter, string> = {
              all: "bg-gray-800 text-white border-gray-800",
              incomplete: "bg-amber-500 text-white border-amber-500",
              complete: "bg-emerald-600 text-white border-emerald-600",
            };
            return (
              <button
                key={f}
                onClick={() => setRoomFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  roomFilter === f ? activeColors[f] : inactiveColors[f]
                }`}
              >
                {f === "incomplete" && <span className="mr-1">⚠️</span>}
                {f === "complete" && <span className="mr-1">✅</span>}
                {labels[f]}
              </button>
            );
          })}
        </div>

        {/* ── Date groups ───────────────────────────────────────────────── */}
        <div ref={contentRef} className="space-y-6">
          {filteredDateGroups.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground border rounded-xl bg-gray-50">
              No assignments match the current filters.
            </div>
          ) : (
            filteredDateGroups.map((dg) => (
              <div key={dg.date} className="bg-white border rounded-xl overflow-hidden shadow-sm">

                {/* Date header */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{dg.date}</p>
                      <p className="text-xs text-muted-foreground">{dg.dayOfWeek}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      {dg.rooms.length} room{dg.rooms.length !== 1 ? "s" : ""}
                    </span>
                    {dg.rooms.some((r) => r.isIncomplete) && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                        {dg.rooms.filter((r) => r.isIncomplete).length} incomplete
                      </span>
                    )}
                    {dg.rooms.some((r) => r.hasConflict) && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                        {dg.rooms.filter((r) => r.hasConflict).length} conflict{dg.rooms.filter((r) => r.hasConflict).length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Room rows */}
                <div className="divide-y">
                  {dg.rooms.map((room) => (
                    <div
                      key={room.roomNumber}
                      className={`px-5 py-4 ${
                        room.isIncomplete ? "bg-amber-50/30" : room.hasConflict ? "bg-red-50/20" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-bold text-gray-900">Room {room.roomNumber}</span>
                        {(room.supervisor?.session || room.assistant?.session) && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {room.supervisor?.session ?? room.assistant?.session}
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-1.5">
                          {room.isIncomplete ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              <UserX className="h-3 w-3" />
                              Incomplete
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              <Users className="h-3 w-3" />
                              Complete
                            </span>
                          )}
                          {room.hasConflict && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              <AlertTriangle className="h-3 w-3" />
                              Conflict
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <TeacherCell assignment={room.supervisor} role="Supervisor" />
                        <TeacherCell assignment={room.assistant} role="Assistant" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherAssignmentsTable;