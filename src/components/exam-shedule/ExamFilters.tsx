import React, { useState, useEffect } from 'react';
import { Exam } from './examQueries';

interface FilterState {
  program?: string;
  yearLevel?: string;
  specialization?: string;
  semester?: string;
  academicYear?: string;
  session?: string;
  searchTerm?: string;
}

interface ExamFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  exams: Exam[];
}

export const ExamFilters: React.FC<ExamFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  exams,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract unique values from exams
  const uniquePrograms = [...new Set(exams.map(e => e.program))].sort();
  const uniqueYearLevels = [...new Set(exams.map(e => e.year_level))].sort();
  const uniqueSpecializations = [...new Set(exams.map(e => e.specialization).filter(Boolean))].sort();
  const uniqueSemesters = [...new Set(exams.map(e => e.semester))].sort();
  const uniqueAcademicYears = [...new Set(exams.map(e => e.academic_year))].sort();
  const uniqueSessions = [...new Set(exams.map(e => e.session))].sort();

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters };
    if (value === '') {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFilterChange(newFilters);
  };

  const activeFilterCount = Object.keys(filters).filter(key => 
    key !== 'searchTerm' || filters.searchTerm
  ).length;

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Filter Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-sm font-medium">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={onClearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar - Always Visible */}
      <div className="p-4 border-b">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by course name or subject code..."
            value={filters.searchTerm || ''}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Expandable Filters */}
      {isExpanded && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Program Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Program
            </label>
            <select
              value={filters.program || ''}
              onChange={(e) => handleFilterChange('program', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Programs</option>
              {uniquePrograms.map(program => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </select>
          </div>

          {/* Year Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year Level
            </label>
            <select
              value={filters.yearLevel || ''}
              onChange={(e) => handleFilterChange('yearLevel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Year Levels</option>
              {uniqueYearLevels.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semester
            </label>
            <select
              value={filters.semester || ''}
              onChange={(e) => handleFilterChange('semester', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Semesters</option>
              {uniqueSemesters.map(semester => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year
            </label>
            <select
              value={filters.academicYear || ''}
              onChange={(e) => handleFilterChange('academicYear', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Academic Years</option>
              {uniqueAcademicYears.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Session Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session
            </label>
            <select
              value={filters.session || ''}
              onChange={(e) => handleFilterChange('session', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Sessions</option>
              {uniqueSessions.map(session => (
                <option key={session} value={session}>
                  {session}
                </option>
              ))}
            </select>
          </div>

          {/* Specialization Filter */}
          {uniqueSpecializations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialization
              </label>
              <select
                value={filters.specialization || ''}
                onChange={(e) => handleFilterChange('specialization', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Specializations</option>
                {uniqueSpecializations.map(spec => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="p-4 border-t bg-gray-50 rounded-b-lg">
          <div className="flex flex-wrap gap-2">
            {filters.program && (
              <FilterTag
                label="Program"
                value={filters.program}
                onRemove={() => handleFilterChange('program', '')}
              />
            )}
            {filters.yearLevel && (
              <FilterTag
                label="Year"
                value={filters.yearLevel}
                onRemove={() => handleFilterChange('yearLevel', '')}
              />
            )}
            {filters.semester && (
              <FilterTag
                label="Semester"
                value={filters.semester}
                onRemove={() => handleFilterChange('semester', '')}
              />
            )}
            {filters.academicYear && (
              <FilterTag
                label="Academic Year"
                value={filters.academicYear}
                onRemove={() => handleFilterChange('academicYear', '')}
              />
            )}
            {filters.session && (
              <FilterTag
                label="Session"
                value={filters.session}
                onRemove={() => handleFilterChange('session', '')}
              />
            )}
            {filters.specialization && (
              <FilterTag
                label="Specialization"
                value={filters.specialization}
                onRemove={() => handleFilterChange('specialization', '')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Filter Tag Component
interface FilterTagProps {
  label: string;
  value: string;
  onRemove: () => void;
}

const FilterTag: React.FC<FilterTagProps> = ({ label, value, onRemove }) => {
  return (
    <div className="flex items-center gap-1.5 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm">
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
