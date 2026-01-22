import React, { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import { mockUsers, mockInvigilators } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Shield, User, BookOpen, Users, Check, ChevronDown } from 'lucide-react';

const RoleAssignment: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const allUsers = [
    ...mockUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      currentRole: u.role,
    })),
    ...mockInvigilators.map(i => ({
      id: i.id,
      name: i.name,
      email: i.email,
      currentRole: 'invigilator' as const,
    })),
  ];

  const roles = [
    {
      id: 'admin',
      label: 'Administrator',
      icon: Shield,
      description: 'Full system access, manage users and settings',
      color: 'bg-red-500',
    },
    {
      id: 'exam_officer',
      label: 'Exam Officer',
      icon: BookOpen,
      description: 'Create exams, manage seating, view reports',
      color: 'bg-blue-500',
    },
    {
      id: 'invigilator',
      label: 'Invigilator',
      icon: Users,
      description: 'View assigned exams and seating plans',
      color: 'bg-amber-500',
    },
    {
      id: 'student',
      label: 'Student',
      icon: User,
      description: 'View personal exam schedule and seat info',
      color: 'bg-green-500',
    },
  ];

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    exam_officer: 'Exam Officer',
    invigilator: 'Invigilator',
    student: 'Student',
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Role Assignment"
        description="Assign roles and permissions to users"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-2 dashboard-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Select User</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {allUsers.map((user) => (
              <button
                key={user.id}
                className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all text-left ${
                  selectedUser === user.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
                onClick={() => setSelectedUser(user.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-primary text-xs">
                    {roleLabels[user.currentRole]}
                  </span>
                  {selectedUser === user.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Role Selection */}
        <div className="dashboard-card h-fit">
          <h3 className="text-lg font-semibold text-foreground mb-4">Assign Role</h3>
          
          {selectedUser ? (
            <div className="space-y-3">
              {roles.map((role) => {
                const selected = allUsers.find(u => u.id === selectedUser);
                const isCurrentRole = selected?.currentRole === role.id;

                return (
                  <button
                    key={role.id}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      isCurrentRole
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg ${role.color} flex items-center justify-center`}>
                        <role.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground">{role.label}</p>
                          {isCurrentRole && (
                            <span className="text-xs text-primary font-medium">Current</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {role.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}

              <Button className="w-full mt-4">
                Update Role
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Select a user to assign a role</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RoleAssignment;
