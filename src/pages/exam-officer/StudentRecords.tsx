import React, { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { mockStudents } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';

const StudentRecords: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = mockStudents.filter(
    student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (student: typeof mockStudents[0]) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {student.name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{student.name}</p>
            <p className="text-xs text-muted-foreground">{student.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'studentId',
      header: 'ID',
      render: (student: typeof mockStudents[0]) => (
        <span className="font-mono text-sm">{student.studentId}</span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
    },
    {
      key: 'semester',
      header: 'Semester',
      render: (student: typeof mockStudents[0]) => (
        <span>Sem {student.semester}</span>
      ),
    },
    {
      key: 'exams',
      header: 'Enrolled Exams',
      render: (student: typeof mockStudents[0]) => (
        <span className="badge-primary">{student.enrolledExams.length} exams</span>
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
        title="Student Records"
        description="View and manage student enrollment data"
        actions={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />

      {/* Department stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {['Computer Science', 'Mathematics', 'Physics', 'Humanities'].map((dept) => {
          const count = mockStudents.filter(s => s.department === dept).length;
          return (
            <div key={dept} className="dashboard-card text-center">
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-sm text-muted-foreground truncate">{dept}</p>
            </div>
          );
        })}
      </div>

      <DataTable
        columns={columns}
        data={filteredStudents}
        searchPlaceholder="Search by name, ID, email, or department..."
        onSearch={setSearchQuery}
        searchValue={searchQuery}
        emptyMessage="No students found"
      />
    </DashboardLayout>
  );
};

export default StudentRecords;
