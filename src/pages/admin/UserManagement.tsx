import React, { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { mockUsers, mockInvigilators } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, MoreVertical } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Combine users and invigilators for display
  const allUsers = [
    ...mockUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department || 'N/A',
      status: 'Active',
    })),
    ...mockInvigilators.map(i => ({
      id: i.id,
      name: i.name,
      email: i.email,
      role: 'invigilator',
      department: i.department,
      status: 'Active',
    })),
  ];

  const filteredUsers = allUsers.filter(
    user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    exam_officer: 'Exam Officer',
    invigilator: 'Invigilator',
    student: 'Student',
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (user: typeof allUsers[0]) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user.name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: typeof allUsers[0]) => (
        <span className="badge-primary">{roleLabels[user.role]}</span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: typeof allUsers[0]) => (
        <span className="badge-success">{user.status}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: () => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="User Management"
        description="Manage all system users and their access"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={filteredUsers}
        searchPlaceholder="Search users by name, email, or department..."
        onSearch={setSearchQuery}
        searchValue={searchQuery}
        emptyMessage="No users found"
      />
    </DashboardLayout>
  );
};

export default UserManagement;
