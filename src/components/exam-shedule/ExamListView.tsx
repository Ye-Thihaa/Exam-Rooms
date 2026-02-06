import React, { useState } from 'react';
import { Exam } from './examQueries';

interface ExamListViewProps {
  exams: Exam[];
}

export const ExamListView: React.FC<ExamListViewProps> = ({ exams }) => {
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'subject' | 'program'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sort exams
  const sortedExams = [...exams].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = a.exam_date.localeCompare(b.exam_date) || 
                    a.start_time.localeCompare(b.start_time);
        break;
      case 'subject':
        comparison = a.subject_code.localeCompare(b.subject_code);
        break;
      case 'program':
        comparison = a.program.localeCompare(b.program) ||
                    a.year_level.localeCompare(b.year_level);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Group by date
  const groupedExams = sortedExams.reduce((acc, exam) => {
    const date = exam.exam_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(exam);
    return acc;
  }, {} as Record<string, Exam[]>);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string): string => {
    return timeString.substring(0, 5); // Convert HH:MM:SS to HH:MM
  };

  const isUpcoming = (dateString: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return dateString >= today;
  };

  const toggleSort = (field: 'date' | 'subject' | 'program') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 font-medium">Sort by:</span>
          <button
            onClick={() => toggleSort('date')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              sortBy === 'date'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => toggleSort('subject')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              sortBy === 'subject'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Subject {sortBy === 'subject' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => toggleSort('program')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              sortBy === 'program'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Program {sortBy === 'program' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Exams List */}
      <div className="space-y-6">
        {Object.entries(groupedExams).map(([date, dateExams]) => (
          <div key={date} className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Date Header */}
            <div className={`px-6 py-4 border-b ${
              isUpcoming(date) ? 'bg-blue-50' : 'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {formatDate(date)}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {dateExams.length} exam{dateExams.length !== 1 ? 's' : ''} scheduled
                  </p>
                </div>
                {isUpcoming(date) && (
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Upcoming
                  </span>
                )}
              </div>
            </div>

            {/* Exam Cards */}
            <div className="divide-y">
              {dateExams.map((exam) => (
                <div
                  key={exam.exam_id}
                  className="p-6 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => setSelectedExam(exam)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {exam.subject_code}
                        </h4>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {exam.session}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 mb-3">{exam.exam_name}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Time:</span>
                          <p className="font-medium text-gray-900">
                            {formatTime(exam.start_time)} - {formatTime(exam.end_time)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Program:</span>
                          <p className="font-medium text-gray-900">{exam.program}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Year Level:</span>
                          <p className="font-medium text-gray-900">{exam.year_level}</p>
                        </div>
                        {exam.specialization && (
                          <div>
                            <span className="text-gray-500">Specialization:</span>
                            <p className="font-medium text-gray-900">{exam.specialization}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button className="ml-4 text-blue-600 hover:text-blue-700">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Exam Detail Modal */}
      {selectedExam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Exam Details</h3>
              <button
                onClick={() => setSelectedExam(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedExam.subject_code}
                </h4>
                <p className="text-lg text-gray-700">{selectedExam.exam_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm text-gray-500">Date</label>
                  <p className="font-medium text-gray-900">{formatDate(selectedExam.exam_date)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Day</label>
                  <p className="font-medium text-gray-900">{selectedExam.day_of_week}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Start Time</label>
                  <p className="font-medium text-gray-900">{formatTime(selectedExam.start_time)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">End Time</label>
                  <p className="font-medium text-gray-900">{formatTime(selectedExam.end_time)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Session</label>
                  <p className="font-medium text-gray-900">{selectedExam.session}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Semester</label>
                  <p className="font-medium text-gray-900">{selectedExam.semester}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Academic Year</label>
                  <p className="font-medium text-gray-900">{selectedExam.academic_year}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Program</label>
                  <p className="font-medium text-gray-900">{selectedExam.program}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Year Level</label>
                  <p className="font-medium text-gray-900">{selectedExam.year_level}</p>
                </div>
                {selectedExam.specialization && (
                  <div>
                    <label className="text-sm text-gray-500">Specialization</label>
                    <p className="font-medium text-gray-900">{selectedExam.specialization}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
