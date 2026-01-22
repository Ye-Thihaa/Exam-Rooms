import React from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import { mockRooms } from '@/data/mockData';
import { DoorOpen, Users, MapPin, Layers } from 'lucide-react';

const RoomCapacity: React.FC = () => {
  const totalCapacity = mockRooms.reduce((sum, room) => sum + room.capacity, 0);
  const availableCapacity = mockRooms
    .filter(r => r.isAvailable)
    .reduce((sum, room) => sum + room.capacity, 0);

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
              <p className="text-2xl font-bold text-foreground">{mockRooms.length}</p>
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
              <p className="text-2xl font-bold text-foreground">{totalCapacity}</p>
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
              <p className="text-2xl font-bold text-foreground">{availableCapacity}</p>
              <p className="text-sm text-muted-foreground">Available Capacity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Room Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockRooms.map((room) => (
          <div key={room.id} className="dashboard-card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DoorOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{room.name}</h3>
                  <p className="text-sm text-muted-foreground">{room.building}</p>
                </div>
              </div>
              <span className={`badge-${room.isAvailable ? 'success' : 'warning'}`}>
                {room.isAvailable ? 'Available' : 'In Use'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Capacity
                </span>
                <span className="font-medium text-foreground">{room.capacity} seats</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  Layout
                </span>
                <span className="font-medium text-foreground">
                  {room.rows} × {room.seatsPerRow}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Floor
                </span>
                <span className="font-medium text-foreground">Floor {room.floor}</span>
              </div>
            </div>

            {/* Capacity Bar */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Capacity Usage</span>
                <span>{room.isAvailable ? '0%' : '85%'}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: room.isAvailable ? '0%' : '85%' }}
                />
              </div>
            </div>

            {/* Facilities */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {room.facilities.map((facility) => (
                <span
                  key={facility}
                  className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground"
                >
                  {facility}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default RoomCapacity;
