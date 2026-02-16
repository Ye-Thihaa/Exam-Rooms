import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { DoorOpen, Users, MapPin, Layers } from "lucide-react";
import supabase from "@/utils/supabase";

interface Room {
  room_id: number;
  room_number: string;
  capacity: number;
  room_type: string | null;
  is_available: boolean;
  floor?: number | null;
  rows?: number | null;
  seats_per_row?: number | null;
  facilities?: string[];
  building?: string;
}

const getFloorFromRoom = (roomNumber?: string): number | "-" => {
  if (!roomNumber || roomNumber.length < 2) return "-";

  const secondChar = roomNumber.trim()[1];
  const floor = Number(secondChar);

  return isNaN(floor) ? "-" : floor;
};

const getBuildingFromRoom = (roomNumber?: string): string => {
  if (!roomNumber) return "Unknown Building";

  const firstChar = roomNumber.trim()[0];
  if (firstChar === "3") return "Building 3";
  if (firstChar === "4") return "Building 4";

  return "Unknown Building";
};

const FIXED_ROWS = 6;
const FIXED_SEATS_PER_ROW = 6;
const FIXED_CAPACITY = FIXED_ROWS * FIXED_SEATS_PER_ROW;

const RoomCapacity: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.from("room").select("*");

      if (error) {
        setError(error.message);
        setRooms([]);
      } else {
        setRooms((data ?? []) as Room[]);
      }

      setLoading(false);
    };

    fetchRooms();
  }, []);

  // ✅ Choose what capacity to display:
  // Option A (recommended since layout fixed 6x6): always show 36
  const DISPLAY_CAPACITY = FIXED_CAPACITY;

  // Option B (if you want to display DB capacity instead):
  // const DISPLAY_CAPACITY = null as unknown as number;

  const totalCapacity = useMemo(() => {
    // If using fixed capacity:
    return rooms.length * DISPLAY_CAPACITY;

    // If using DB capacity instead:
    // return rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
  }, [rooms]);

  const availableCapacity = useMemo(() => {
    // If using fixed capacity:
    return rooms.filter((r) => r.is_available).length * DISPLAY_CAPACITY;

    // If using DB capacity instead:
    // return rooms
    //   .filter((r) => r.is_available)
    //   .reduce((sum, r) => sum + (r.capacity || 0), 0);
  }, [rooms]);

  if (loading)
    return (
      <DashboardLayout>
        <p>Loading...</p>
      </DashboardLayout>
    );

  if (error)
    return (
      <DashboardLayout>
        <p>Error: {error}</p>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <PageHeader
        title="Room Capacity"
        description="View and manage exam room capacities"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <DoorOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rooms.length}</p>
              <p className="text-sm text-muted-foreground">Total Rooms</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCapacity}</p>
              <p className="text-sm text-muted-foreground">Total Capacity</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{availableCapacity}</p>
              <p className="text-sm text-muted-foreground">
                Available Capacity
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Room Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => {
          const buildingLabel = getBuildingFromRoom(room.room_number);

          return (
            <div key={room.room_id} className="dashboard-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <DoorOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{room.room_number}</h3>
                    <p className="text-sm text-muted-foreground">
                      {buildingLabel}
                    </p>
                  </div>
                </div>

                <span
                  className={`badge-${room.is_available ? "success" : "warning"}`}
                >
                  {room.is_available ? "Available" : "In Use"}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" /> Capacity
                  </span>

                  {/* ✅ fixed capacity from layout 6x6 */}
                  <span className="font-medium">{FIXED_CAPACITY} seats</span>

                  {/* If you want DB capacity instead, use this:
                    <span className="font-medium">{room.capacity} seats</span>
                  */}
                </div>

                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Layers className="h-4 w-4" /> Layout
                  </span>

                  {/* ✅ fixed layout always 6x6 */}
                  <span className="font-medium">
                    {FIXED_ROWS} × {FIXED_SEATS_PER_ROW}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> Floor
                  </span>
                  <span className="font-medium">
                    Floor {getFloorFromRoom(room.room_number)}
                  </span>
                </div>
              </div>

              {/* Facilities */}
              {Array.isArray(room.facilities) && room.facilities.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {room.facilities.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 bg-muted rounded-full text-xs"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default RoomCapacity;
