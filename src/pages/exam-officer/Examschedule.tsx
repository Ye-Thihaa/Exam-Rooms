import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { examQueries, Exam } from "@/services/examQueries";
import {
  Calendar,
  List,
  Clock,
  Plus,
  Search,
  Filter,
  Download,
  BookOpen,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";

type ViewMode = "upcoming" | "calendar" | "list";

interface FilterState {
  program?: string;
  yearLevel?: string;
  specialization?: string;
  semester?: string;
  academicYear?: string;
  session?: string;
  searchTerm?: string;
}

const ExamSchedulePage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("upcoming");
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);

  // Filter options
  const [programs, setPrograms] = useState<string[]>([]);
  const [yearLevels, setYearLevels] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [semesters, setSemesters] = useState<string[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);

  useEffect(() => {
    loadExams();
    loadFilterOptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, exams, viewMode]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await examQueries.getAll();
      setExams(data);
      setError(null);
    } catch (err) {
      setError("Failed to load exams");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [progs, years, specs, allExams] = await Promise.all([
        examQueries.getUniquePrograms(),
        examQueries.getUniqueYearLevels(),
        examQueries.getUniqueSpecializations(),
        examQueries.getAll(),
      ]);

      setPrograms(progs);
      setYearLevels(years);
      setSpecializations(specs);

      const uniqueSemesters = [...new Set(allExams.map((e) => e.semester))];
      const uniqueAcademicYears = [
        ...new Set(allExams.map((e) => e.academic_year)),
      ];
      const uniqueSessions = [...new Set(allExams.map((e) => e.session))];

      setSemesters(uniqueSemesters.sort());
      setAcademicYears(uniqueAcademicYears.sort());
      setSessions(uniqueSessions.sort());
    } catch (err) {
      console.error("Failed to load filter options:", err);
    }
  };

  const applyFilters = () => {
    let result = [...exams];

    if (filters.program)
      result = result.filter((e) => e.program === filters.program);
    if (filters.yearLevel)
      result = result.filter((e) => e.year_level === filters.yearLevel);
    if (filters.specialization)
      result = result.filter(
        (e) => e.specialization === filters.specialization,
      );
    if (filters.semester)
      result = result.filter((e) => e.semester === filters.semester);
    if (filters.academicYear)
      result = result.filter((e) => e.academic_year === filters.academicYear);
    if (filters.session)
      result = result.filter((e) => e.session === filters.session);
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          e.exam_name.toLowerCase().includes(term) ||
          e.subject_code.toLowerCase().includes(term),
      );
    }

    if (viewMode === "upcoming") {
      const today = new Date().toISOString().split("T")[0];
      result = result.filter((e) => e.exam_date >= today);
    }

    setFilteredExams(result);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDaysUntil = (dateString: string): number => {
    const examDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    examDate.setHours(0, 0, 0, 0);
    const diffTime = examDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const today = new Date().toISOString().split("T")[0];
  const upcomingCount = exams.filter((e) => e.exam_date >= today).length;
  const pastCount = exams.filter((e) => e.exam_date < today).length;
  const thisWeekCount = exams.filter((e) => {
    const examDate = new Date(e.exam_date);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return examDate >= new Date() && examDate <= weekFromNow;
  }).length;

  const activeFilterCount = Object.keys(filters).filter(
    (key) => key !== "searchTerm" || filters.searchTerm,
  ).length;

  const groupedExams = filteredExams.reduce(
    (acc, exam) => {
      const date = exam.exam_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(exam);
      return acc;
    },
    {} as Record<string, Exam[]>,
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Exam Schedule"
        description="View and manage examination schedules"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link to="/exam-officer/create-exam">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Exam
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="dashboard-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Exams</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? "..." : exams.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Upcoming</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? "..." : upcomingCount}
              </p>
              {!loading && thisWeekCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {thisWeekCount} this week
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Completed</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? "..." : pastCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Programs</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? "..." : programs.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* View Controls & Filters */}
      <div className="dashboard-card mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              <Button
                variant={viewMode === "upcoming" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("upcoming")}
              >
                <Clock className="h-4 w-4 mr-2" />
                Upcoming
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4 mr-2" />
                All Exams
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by course name or subject code..."
              value={filters.searchTerm || ""}
              onChange={(e) =>
                setFilters({ ...filters, searchTerm: e.target.value })
              }
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Program
                </label>
                <select
                  value={filters.program || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, program: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Programs</option>
                  {programs.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Year Level
                </label>
                <select
                  value={filters.yearLevel || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, yearLevel: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Year Levels</option>
                  {yearLevels.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Semester
                </label>
                <select
                  value={filters.semester || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, semester: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Semesters</option>
                  {semesters.map((semester) => (
                    <option key={semester} value={semester}>
                      {semester}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Academic Year
                </label>
                <select
                  value={filters.academicYear || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, academicYear: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Academic Years</option>
                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Session
                </label>
                <select
                  value={filters.session || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, session: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Sessions</option>
                  {sessions.map((session) => (
                    <option key={session} value={session}>
                      {session}
                    </option>
                  ))}
                </select>
              </div>

              {specializations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Specialization
                  </label>
                  <select
                    value={filters.specialization || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, specialization: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Specializations</option>
                    {specializations.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeFilterCount > 0 && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="dashboard-card">
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">
              Loading exams...
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="dashboard-card">
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadExams} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="dashboard-card">
          <div className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No Exams Found
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {activeFilterCount > 0
                ? "Try adjusting your filters to see more results."
                : "No exam schedules are currently available."}
            </p>
            {activeFilterCount > 0 && (
              <Button onClick={clearFilters} variant="outline" className="mt-4">
                Clear All Filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedExams)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dateExams]) => {
              const isUpcoming = date >= today;
              return (
                <div key={date} className="dashboard-card overflow-hidden">
                  <div
                    className={`px-6 py-4 border-b border-border ${isUpcoming ? "bg-primary/5" : "bg-muted/50"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {formatDate(date)}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {dateExams[0].day_of_week} • {dateExams.length} exam
                          {dateExams.length !== 1 ? "s" : ""} scheduled
                        </p>
                      </div>
                      {isUpcoming && (
                        <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-border">
                    {dateExams
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((exam) => {
                        const daysUntil = isUpcoming
                          ? getDaysUntil(exam.exam_date)
                          : null;
                        return (
                          <div
                            key={exam.exam_id}
                            className="p-6 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <h4 className="text-lg font-semibold text-foreground">
                                    {exam.subject_code}
                                  </h4>
                                  <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-medium">
                                    {exam.session}
                                  </span>
                                  {daysUntil !== null && daysUntil <= 7 && (
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        daysUntil === 0
                                          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                          : daysUntil === 1
                                            ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                                      }`}
                                    >
                                      {daysUntil === 0
                                        ? "Today!"
                                        : daysUntil === 1
                                          ? "Tomorrow"
                                          : `In ${daysUntil} days`}
                                    </span>
                                  )}
                                </div>

                                <p className="text-foreground mb-3">
                                  {exam.exam_name}
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">
                                      Time:
                                    </span>
                                    <p className="font-medium text-foreground">
                                      {formatTime(exam.start_time)} -{" "}
                                      {formatTime(exam.end_time)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Program:
                                    </span>
                                    <p className="font-medium text-foreground">
                                      {exam.program}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Year Level:
                                    </span>
                                    <p className="font-medium text-foreground">
                                      {exam.year_level}
                                    </p>
                                  </div>
                                  {exam.specialization && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        Specialization:
                                      </span>
                                      <p className="font-medium text-foreground">
                                        {exam.specialization}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ExamSchedulePage;
