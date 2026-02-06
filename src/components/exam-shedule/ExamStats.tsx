import React from 'react';
import { Exam } from './examQueries';

interface ExamStatsProps {
  exams: Exam[];
  allExams: Exam[];
}

export const ExamStats: React.FC<ExamStatsProps> = ({ exams, allExams }) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate statistics
  const stats = {
    total: exams.length,
    upcoming: exams.filter(e => e.exam_date >= today).length,
    past: exams.filter(e => e.exam_date < today).length,
    thisWeek: exams.filter(e => {
      const examDate = new Date(e.exam_date);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return examDate >= new Date() && examDate <= weekFromNow;
    }).length,
    uniqueSubjects: new Set(exams.map(e => e.subject_code)).size,
    uniquePrograms: new Set(exams.map(e => e.program)).size,
  };

  // Get next upcoming exam
  const nextExam = exams
    .filter(e => e.exam_date >= today)
    .sort((a, b) => {
      const dateCompare = a.exam_date.localeCompare(b.exam_date);
      if (dateCompare !== 0) return dateCompare;
      return a.start_time.localeCompare(b.start_time);
    })[0];

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string): string => {
    return timeString.substring(0, 5);
  };

  const getDaysUntil = (dateString: string): number => {
    const examDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    examDate.setHours(0, 0, 0, 0);
    const diffTime = examDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Total Exams */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Exams</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            {exams.length !== allExams.length && (
              <p className="text-xs text-gray-500 mt-1">
                of {allExams.length} total
              </p>
            )}
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Upcoming Exams */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Upcoming</p>
            <p className="text-3xl font-bold text-green-600">{stats.upcoming}</p>
            {stats.thisWeek > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {stats.thisWeek} this week
              </p>
            )}
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Past Exams */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-3xl font-bold text-gray-600">{stats.past}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.uniqueSubjects} unique subjects
            </p>
          </div>
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Next Exam */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {nextExam ? (
          <div>
            <p className="text-sm text-gray-600 mb-2">Next Exam</p>
            <p className="font-semibold text-gray-900 mb-1 truncate">
              {nextExam.subject_code}
            </p>
            <p className="text-sm text-gray-600 mb-2 truncate">
              {nextExam.exam_name}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium">
                {formatDate(nextExam.exam_date)}
              </div>
              {getDaysUntil(nextExam.exam_date) <= 7 && (
                <div className="bg-red-100 text-red-800 px-2 py-1 rounded font-medium">
                  {getDaysUntil(nextExam.exam_date) === 0
                    ? 'Today!'
                    : getDaysUntil(nextExam.exam_date) === 1
                    ? 'Tomorrow'
                    : `In ${getDaysUntil(nextExam.exam_date)} days`}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-2">Next Exam</p>
            <p className="text-gray-500">No upcoming exams</p>
          </div>
        )}
      </div>

      {/* Program Breakdown - Full Width */}
      {stats.uniquePrograms > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Exams by Program</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from(new Set(exams.map(e => e.program))).map(program => {
              const count = exams.filter(e => e.program === program).length;
              const upcoming = exams.filter(e => e.program === program && e.exam_date >= today).length;
              return (
                <div key={program} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-1 truncate" title={program}>
                    {program}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">{count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {upcoming} upcoming
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
