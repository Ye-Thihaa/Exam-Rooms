import React, { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { mockExams, mockRooms } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, Clock, Users } from 'lucide-react';

const ExamsOverview: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredExams = mockExams.filter((exam) => {
    const matchesSearch =
      exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getRoomName = (roomId?: string) => {
    if (!roomId) return 'Not Assigned';
    const room = mockRooms.find((r) => r.id === roomId);
    return room?.name || 'Unknown';
  };

  const statusColors: Record<string, string> = {
    scheduled: 'badge-primary',
    ongoing: 'badge-warning',
    completed: 'badge-success',
    cancelled: 'bg-red-100 text-red-800',
  };

  const columns = [
    {
      key: 'exam',
      header: 'Exam',
      render: (exam: typeof mockExams[0]) => (
        <div>
          <p className="font-medium text-foreground">{exam.name}</p>
          <p className="text-xs text-muted-foreground">
            {exam.code} • {exam.department}
          </p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (exam: typeof mockExams[0]) => (
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
      key: 'room',
      header: 'Room',
      render: (exam: typeof mockExams[0]) => (
        <span className="text-sm">{getRoomName(exam.roomId)}</span>
      ),
    },
    {
      key: 'students',
      header: 'Students',
      render: (exam: typeof mockExams[0]) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{exam.totalStudents}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (exam: typeof mockExams[0]) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[exam.status]}`}>
          {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: () => (
        <Button variant="ghost" size="sm">
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

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'scheduled', 'ongoing', 'completed', 'cancelled'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredExams}
        searchPlaceholder="Search exams by name, code, or department..."
        onSearch={setSearchQuery}
        searchValue={searchQuery}
        emptyMessage="No exams found"
      />
    </DashboardLayout>
  );
};

export default ExamsOverview;
