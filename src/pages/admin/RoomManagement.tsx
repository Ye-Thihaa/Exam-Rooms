import React, { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { mockRooms } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Plus, Edit, DoorOpen, Monitor, Thermometer, Camera } from 'lucide-react';

const RoomManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = mockRooms.filter(
    room =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.building.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const facilityIcons: Record<string, React.ReactNode> = {
    'Projector': <Monitor className="h-3 w-3" />,
    'AC': <Thermometer className="h-3 w-3" />,
    'CCTV': <Camera className="h-3 w-3" />,
  };

  const columns = [
    {
      key: 'name',
      header: 'Room',
      render: (room: typeof mockRooms[0]) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DoorOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{room.name}</p>
            <p className="text-xs text-muted-foreground">
              {room.building} • Floor {room.floor}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (room: typeof mockRooms[0]) => (
        <div>
          <p className="font-medium text-foreground">{room.capacity} seats</p>
          <p className="text-xs text-muted-foreground">
            {room.rows} rows × {room.seatsPerRow} seats
          </p>
        </div>
      ),
    },
    {
      key: 'facilities',
      header: 'Facilities',
      render: (room: typeof mockRooms[0]) => (
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
      key: 'status',
      header: 'Status',
      render: (room: typeof mockRooms[0]) => (
        <span className={`badge-${room.isAvailable ? 'success' : 'warning'}`}>
          {room.isAvailable ? 'Available' : 'In Use'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: () => (
        <Button variant="ghost" size="sm">
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
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Room
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="dashboard-card text-center">
          <p className="text-3xl font-bold text-foreground">{mockRooms.length}</p>
          <p className="text-sm text-muted-foreground">Total Rooms</p>
        </div>
        <div className="dashboard-card text-center">
          <p className="text-3xl font-bold text-primary">
            {mockRooms.filter(r => r.isAvailable).length}
          </p>
          <p className="text-sm text-muted-foreground">Available</p>
        </div>
        <div className="dashboard-card text-center">
          <p className="text-3xl font-bold text-foreground">
            {mockRooms.reduce((sum, r) => sum + r.capacity, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Total Capacity</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredRooms}
        searchPlaceholder="Search rooms by name or building..."
        onSearch={setSearchQuery}
        searchValue={searchQuery}
        emptyMessage="No rooms found"
      />
    </DashboardLayout>
  );
};

export default RoomManagement;
