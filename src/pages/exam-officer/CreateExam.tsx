import React, { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageHeader from '@/components/shared/PageHeader';
import { mockRooms } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, BookOpen, Users, DoorOpen, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const CreateExam: React.FC = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    subject: '',
    department: '',
    date: '',
    startTime: '',
    endTime: '',
    duration: 180,
    roomId: '',
    totalStudents: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Exam Created Successfully',
      description: `${formData.name} (${formData.code}) has been scheduled.`,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'totalStudents' ? Number(value) : value,
    }));
  };

  const departments = [
    'Computer Science',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Humanities',
    'Engineering',
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Create New Exam"
        description="Set up a new examination with room and time allocation"
        actions={
          <Link to="/exam-officer">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="dashboard-card space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Exam Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Exam Code *</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., CS301"
                  required
                />
              </div>
              <div>
                <label className="form-label">Exam Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., Data Structures & Algorithms"
                  required
                />
              </div>
              <div>
                <label className="form-label">Subject *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., Computer Science"
                  required
                />
              </div>
              <div>
                <label className="form-label">Department *</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Start Time *</label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">End Time *</label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Duration (minutes)</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="form-input"
                  min="30"
                  max="300"
                />
              </div>
            </div>
          </div>

          {/* Room & Students */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-primary" />
              Room & Capacity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Exam Room *</label>
                <select
                  name="roomId"
                  value={formData.roomId}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="">Select Room</option>
                  {mockRooms.filter(r => r.isAvailable).map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name} - {room.building} (Capacity: {room.capacity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Expected Students *</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="number"
                    name="totalStudents"
                    value={formData.totalStudents || ''}
                    onChange={handleChange}
                    className="form-input pl-10"
                    placeholder="Number of students"
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
            <Link to="/exam-officer">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Create Exam
            </Button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default CreateExam;
