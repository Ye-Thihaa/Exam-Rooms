import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import {
  Users,
  BookOpen,
  DoorOpen,
  ClipboardList,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import supabase from "@/utils/supabase";
import { examQueries, Exam } from "@/services/examQueries"; // ✅ adjust path
import { getTotalStudentCount } from "@/services/studentQueries"; // ✅ adjust path

type RoomRow = {
  room_id: number;
  room_number: string;
  capacity: number;
  room_type: string;
  rows: number;
  cols: number;

  // optional if your room table has these
  building?: string | null;
  floor?: number | null;
  is_available?: boolean | null;
};

type RoomCardVM = {
  id: number;
  name: string;
  building: string;
  floor: number | string;
  capacity: number;
  isAvailable: boolean;
};

function formatDate(d: string) {
  return d; // "YYYY-MM-DD"
}

function formatTime(t: string) {
  if (!t) return "";
  return t.length >= 5 ? t.slice(0, 5) : t; // "HH:MM"
}
function deriveBuildingAndFloor(roomNumber: string): {
  building: string;
  floor: string;
} {
  const digits = (roomNumber || "").replace(/\D/g, ""); // keep only numbers
  if (digits.length >= 2) return { building: digits[0], floor: digits[1] };
  return { building: "—", floor: "—" };
}

const AdminDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [counts, setCounts] = useState({
    totalUsers: 0, // optional (see note below)
    totalStudents: 0,
    totalExams: 0,
    upcomingExams: 0,
    totalRooms: 0,
    availableRooms: 0,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const upcomingExams = useMemo(() => exams.slice(0, 5), [exams]);

  function deriveBuildingAndFloor(roomNumber: string): {
    building: string;
    floor: string;
  } {
    const digits = (roomNumber || "").replace(/\D/g, "");
    if (digits.length >= 2) return { building: digits[0], floor: digits[1] };
    return { building: "—", floor: "—" };
  }

  const roomCards = useMemo<RoomCardVM[]>(() => {
    return rooms.slice(0, 5).map((r) => {
      const { building, floor } = deriveBuildingAndFloor(r.room_number);

      return {
        id: r.room_id,
        name: r.room_number ?? `Room ${r.room_id}`,
        building: `Building ${building}`,
        floor, // "2"
        capacity: r.capacity ?? 0,
        isAvailable:
          typeof (r as any).is_available === "boolean"
            ? Boolean((r as any).is_available)
            : true,
      };
    });
  }, [rooms]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        // ✅ 1) Upcoming exams (real)
        const upcoming = await examQueries.getUpcoming();

        // ✅ 2) Rooms (real)
        const { data: roomData, error: roomErr } = await supabase
          .from("room")
          .select("*")
          .order("room_number", { ascending: true });

        if (roomErr) throw roomErr;

        // ✅ 3) Counts
        const today = new Date().toISOString().split("T")[0];

        const [
          totalStudents,
          totalExamsRes,
          upcomingExamsRes,
          totalRoomsRes,
          availableRoomsRes,
        ] = await Promise.all([
          getTotalStudentCount(), // ✅ from student table

          supabase
            .from("exam")
            .select("exam_id", { count: "exact", head: true }),

          supabase
            .from("exam")
            .select("exam_id", { count: "exact", head: true })
            .gte("exam_date", today),

          supabase
            .from("room")
            .select("room_id", { count: "exact", head: true }),

          // If you don't have is_available, this might error → fallback below
          supabase
            .from("room")
            .select("room_id", { count: "exact", head: true })
            .eq("is_available", true),
        ]);

        const totalRooms = totalRoomsRes.count ?? 0;
        const availableRooms = availableRoomsRes.error
          ? totalRooms
          : (availableRoomsRes.count ?? totalRooms);

        if (!mounted) return;

        setExams(upcoming);
        setRooms((roomData ?? []) as RoomRow[]);

        setCounts({
          totalUsers: 0, // ✅ keep 0 unless you add a public users table
          totalStudents: totalStudents ?? 0,
          totalExams: totalExamsRes.count ?? 0,
          upcomingExams: upcomingExamsRes.count ?? 0,
          totalRooms,
          availableRooms,
        });
      } catch (err: any) {
        console.error(err);
        if (!mounted) return;
        setErrorMsg(err?.message ?? "Failed to load dashboard data");
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

  return (
    <DashboardLayout>
      <PageHeader
        title="Admin Dashboard"
        description="Overview of the examination system"
      />

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Users"
          value={isLoading ? "…" : counts.totalUsers}
          subtitle="(optional) add public users table"
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Total Students"
          value={isLoading ? "…" : counts.totalStudents}
          subtitle="From student table"
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Total Exams"
          value={isLoading ? "…" : counts.totalExams}
          subtitle={`${isLoading ? "…" : counts.upcomingExams} upcoming`}
          icon={BookOpen}
          variant="success"
        />
        <StatCard
          title="Exam Rooms"
          value={isLoading ? "…" : counts.totalRooms}
          subtitle={`${isLoading ? "…" : counts.availableRooms} available`}
          icon={DoorOpen}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Exams */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Upcoming Exams
            </h3>
            <Link to="/admin/exams">
              <Button variant="ghost" size="sm" className="text-primary">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : upcomingExams.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No upcoming exams found.
              </div>
            ) : (
              upcomingExams.map((exam) => (
                <div
                  key={exam.exam_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {exam.exam_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {exam.subject_code} • {exam.program}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(exam.exam_date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(exam.start_time)} -{" "}
                      {formatTime(exam.end_time)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Room Status */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Room Status
            </h3>
            <Link to="/admin/rooms">
              <Button variant="ghost" size="sm" className="text-primary">
                Manage <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : roomCards.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No rooms found.
              </div>
            ) : (
              roomCards.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <DoorOpen className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{room.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {room.building} • Floor {room.floor}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {room.capacity} seats
                    </span>
                    <span
                      className={`badge-${room.isAvailable ? "success" : "warning"}`}
                    >
                      {room.isAvailable ? "Available" : "In Use"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 dashboard-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/admin/users">
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col gap-2"
            >
              <Users className="h-6 w-6 text-primary" />
              <span>Manage Users</span>
            </Button>
          </Link>
          <Link to="/admin/exams">
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col gap-2"
            >
              <BookOpen className="h-6 w-6 text-primary" />
              <span>View Exams</span>
            </Button>
          </Link>
          <Link to="/admin/rooms">
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col gap-2"
            >
              <DoorOpen className="h-6 w-6 text-primary" />
              <span>Room Setup</span>
            </Button>
          </Link>
          <Link to="/admin/roles">
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col gap-2"
            >
              <ClipboardList className="h-6 w-6 text-primary" />
              <span>Assign Roles</span>
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
