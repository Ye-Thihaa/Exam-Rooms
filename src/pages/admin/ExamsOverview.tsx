import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Eye, Calendar, Clock, Users } from "lucide-react";

import { examQueries, Exam } from "@/services/examQueries";
import {
  examRoomQueries,
  ExamRoomWithDetails,
} from "@/services/examroomQueries ";

type ExamVM = {
  id: number;
  name: string;
  code: string;
  department: string;
  date: string;
  startTime: string;
  endTime: string;

  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  totalStudents: number;

  // for room display
  roomName: string;
};

function formatTime(t: string) {
  if (!t) return "";
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

function deriveStatus(examDate: string): "scheduled" | "completed" {
  const today = getTodayISO();
  return examDate >= today ? "scheduled" : "completed";
}

const ExamsOverview: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [exams, setExams] = useState<ExamVM[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        // ✅ 1) Get ALL exams (real)
        const examRows = await examQueries.getAll();

        // ✅ 2) Get ALL exam_room with room details (real)
        // We'll use this to map exam_id -> rooms + assigned_capacity
        const examRooms = await examRoomQueries.getAllWithDetails();

        // Build a map: exam_id -> list of rooms + total assigned_capacity
        const examRoomMap = new Map<
          number,
          { roomNames: string[]; totalAssigned: number }
        >();

        for (const er of examRooms as ExamRoomWithDetails[]) {
          const examId = er.exam_id;
          const roomNumber = er.room?.room_number ?? "";
          const assigned = er.assigned_capacity ?? 0;

          if (!examRoomMap.has(examId)) {
            examRoomMap.set(examId, { roomNames: [], totalAssigned: 0 });
          }

          const entry = examRoomMap.get(examId)!;
          if (roomNumber) entry.roomNames.push(roomNumber);
          entry.totalAssigned += assigned;
        }

        // ✅ 3) Convert DB rows to UI rows
        const mapped: ExamVM[] = (examRows || []).map((e: Exam) => {
          const meta = examRoomMap.get(e.exam_id);

          const roomName = meta?.roomNames?.length
            ? meta.roomNames.length === 1
              ? meta.roomNames[0]
              : `${meta.roomNames[0]} +${meta.roomNames.length - 1} more`
            : "Not Assigned";

          const totalStudents = meta?.totalAssigned ?? 0;

          return {
            id: e.exam_id,
            name: e.exam_name,
            code: e.subject_code,

            // Your old UI used "department".
            // In your DB you have "program", "specialization", etc.
            // We'll show program here (change if you prefer).
            department: e.program,

            date: e.exam_date,
            startTime: formatTime(e.start_time),
            endTime: formatTime(e.end_time),

            status: deriveStatus(e.exam_date),
            totalStudents,

            roomName,
          };
        });

        // sort by date + start time
        mapped.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.startTime.localeCompare(b.startTime);
        });

        if (!mounted) return;
        setExams(mapped);
      } catch (err: any) {
        console.error(err);
        if (!mounted) return;
        setErrorMsg(err?.message ?? "Failed to load exams");
      } finally {
        if (!mounted) return;
        setIsLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredExams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return exams.filter((exam) => {
      const matchesSearch =
        exam.name.toLowerCase().includes(q) ||
        exam.code.toLowerCase().includes(q) ||
        exam.department.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || exam.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [exams, searchQuery, statusFilter]);

  const statusColors: Record<string, string> = {
    scheduled: "badge-primary",
    ongoing: "badge-warning",
    completed: "badge-success",
    cancelled: "bg-red-100 text-red-800",
  };

  const columns = [
    {
      key: "exam",
      header: "Exam",
      render: (exam: ExamVM) => (
        <div>
          <p className="font-medium text-foreground">{exam.name}</p>
          <p className="text-xs text-muted-foreground">
            {exam.code} • {exam.department}
          </p>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      render: (exam: ExamVM) => (
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-foreground">{exam.date}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {exam.startTime} - {exam.endTime}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "room",
      header: "Room",
      render: (exam: ExamVM) => (
        <span className="text-sm">{exam.roomName}</span>
      ),
    },
    {
      key: "students",
      header: "Students",
      render: (exam: ExamVM) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{exam.totalStudents}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (exam: ExamVM) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            statusColors[exam.status]
          }`}
        >
          {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (exam: ExamVM) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // You can navigate to details page later
            console.log("View exam:", exam.id);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Exams Overview"
        description="View and manage all scheduled examinations"
      />

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["all", "scheduled", "ongoing", "completed", "cancelled"].map(
          (status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ),
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredExams}
        searchPlaceholder="Search exams by name, code, or department..."
        onSearch={setSearchQuery}
        searchValue={searchQuery}
        emptyMessage={isLoading ? "Loading exams..." : "No exams found"}
      />
    </DashboardLayout>
  );
};

export default ExamsOverview;
