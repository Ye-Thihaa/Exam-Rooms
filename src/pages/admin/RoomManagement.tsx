import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Edit,
  DoorOpen,
  Monitor,
  Thermometer,
  Camera,
} from "lucide-react";

// ✅ adjust path
import { getAllRooms, getRoomStatistics, Room } from "@/services/Roomqueries";

type RoomVM = {
  id: number;
  name: string; // room_number
  building: string; // derived
  floor: string; // derived
  capacity: number;
  rows: number;
  seatsPerRow: number;
  facilities: string[];
  isAvailable: boolean;
  _raw: Room;
};

function deriveBuildingAndFloor(roomNumber: string): {
  building: string;
  floor: string;
} {
  // Extract digits from room number: "321", "321A", "B-321", etc.
  const digits = (roomNumber || "").replace(/\D/g, ""); // keep only 0-9

  if (digits.length >= 2) {
    return {
      building: digits[0], // first digit
      floor: digits[1], // second digit
    };
  }

  // fallback if room_number doesn't have enough digits
  return { building: "—", floor: "—" };
}

const RoomManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rooms, setRooms] = useState<RoomVM[]>([]);
  const [stats, setStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    totalCapacity: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const DEFAULT_FACILITIES = ["Projector", "AC"]; // you said all rooms have these
  const DEFAULT_ROWS = 6;
  const DEFAULT_SEATS_PER_ROW = 6;

  const facilityIcons: Record<string, React.ReactNode> = {
    Projector: <Monitor className="h-3 w-3" />,
    AC: <Thermometer className="h-3 w-3" />,
    CCTV: <Camera className="h-3 w-3" />,
  };

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const [roomRows, roomStats] = await Promise.all([
          getAllRooms(),
          getRoomStatistics(),
        ]);

        if (!mounted) return;

        const mapped: RoomVM[] = (roomRows || []).map((r) => {
          const { building, floor } = deriveBuildingAndFloor(r.room_number);

          return {
            id: r.room_id,
            name: r.room_number,
            building,
            floor,
            capacity: r.capacity,
            rows: DEFAULT_ROWS,
            seatsPerRow: DEFAULT_SEATS_PER_ROW,
            facilities: DEFAULT_FACILITIES,
            isAvailable: Boolean(r.is_available),
            _raw: r,
          };
        });

        setRooms(mapped);
        setStats({
          totalRooms: roomStats.totalRooms,
          availableRooms: roomStats.availableRooms,
          totalCapacity: roomStats.totalCapacity,
        });
      } catch (err: any) {
        console.error(err);
        if (!mounted) return;
        setErrorMsg(err?.message ?? "Failed to load rooms");
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

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rooms;

    return rooms.filter((room) => {
      return (
        room.name.toLowerCase().includes(q) ||
        room.building.toLowerCase().includes(q) ||
        room.floor.toLowerCase().includes(q)
      );
    });
  }, [rooms, searchQuery]);

  const columns = [
    {
      key: "name",
      header: "Room",
      render: (room: RoomVM) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DoorOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{room.name}</p>
            <p className="text-xs text-muted-foreground">
              Building {room.building} • Floor {room.floor}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      render: (room: RoomVM) => (
        <div>
          <p className="font-medium text-foreground">{room.capacity} seats</p>
          <p className="text-xs text-muted-foreground">
            {room.rows} rows × {room.seatsPerRow} seats
          </p>
        </div>
      ),
    },
    {
      key: "facilities",
      header: "Facilities",
      render: (room: RoomVM) => (
        <div className="flex flex-wrap gap-1.5">
          {room.facilities.map((facility) => (
            <span
              key={facility}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground"
            >
              {facilityIcons[facility] || null}
              {facility}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (room: RoomVM) => (
        <span className={`badge-${room.isAvailable ? "success" : "warning"}`}>
          {room.isAvailable ? "Available" : "In Use"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (room: RoomVM) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log("Edit room:", room._raw);
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Room Management"
        description="Manage examination rooms and their capacities"
        actions={
          <Button onClick={() => console.log("Add room clicked")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Room
          </Button>
        }
      />

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="dashboard-card text-center">
          <p className="text-3xl font-bold text-foreground">
            {isLoading ? "…" : stats.totalRooms}
          </p>
          <p className="text-sm text-muted-foreground">Total Rooms</p>
        </div>
        <div className="dashboard-card text-center">
          <p className="text-3xl font-bold text-primary">
            {isLoading ? "…" : stats.availableRooms}
          </p>
          <p className="text-sm text-muted-foreground">Available</p>
        </div>
        <div className="dashboard-card text-center">
          <p className="text-3xl font-bold text-foreground">
            {isLoading ? "…" : stats.totalCapacity}
          </p>
          <p className="text-sm text-muted-foreground">Total Capacity</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredRooms}
        searchPlaceholder="Search rooms by number, building, or floor..."
        onSearch={setSearchQuery}
        searchValue={searchQuery}
        emptyMessage={isLoading ? "Loading rooms..." : "No rooms found"}
      />
    </DashboardLayout>
  );
};

export default RoomManagement;
