import React, { useEffect, useState } from "react";
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

const RoomCapacity: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase.from("room").select("*");

      if (error) {
        setError(error.message);
      } else {
        setRooms(data as Room[]);
      }

      setLoading(false);
    };

    fetchRooms();
  }, []);

  const totalCapacity = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
  const availableCapacity = rooms
    .filter((r) => r.is_available)
    .reduce((sum, r) => sum + (r.capacity || 0), 0);

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
        {rooms.map((room) => (
          <div key={room.room_id} className="dashboard-card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DoorOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{room.room_number}</h3>
                  <p className="text-sm text-muted-foreground">
                    {room.building ?? "Unknown Building"}
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
                <span className="font-medium">{room.capacity} seats</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Layers className="h-4 w-4" /> Layout
                </span>
                <span className="font-medium">
                  {(room.rows || 0) + " × " + (room.seats_per_row || 0)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> Floor
                </span>
                <span className="font-medium">Floor {room.floor ?? "-"}</span>
              </div>
            </div>

            {/* Facilities */}
            {Array.isArray(room.facilities) && (
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
        ))}
      </div>
    </DashboardLayout>
  );
};

export default RoomCapacity;
