import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Download, Eye, Loader2, Filter, X } from "lucide-react";
import { teacherQueries, Teacher } from "@/services/teacherQueries";

// Extended Teacher type with id field for DataTable
type TeacherWithId = Teacher & { id: number };

type FilterType = "all" | "highWorkload" | "cs" | "ct" | "is" | "se" | "ai";

const TeacherView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [teachers, setTeachers] = useState<TeacherWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all teachers from Supabase
  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      try {
        const data = await teacherQueries.getAll();
        // Map teacher_id to id for DataTable compatibility
        const teachersWithId: TeacherWithId[] = data.map((teacher) => ({
          ...teacher,
          id: teacher.teacher_id,
        }));
        setTeachers(teachersWithId);
      } catch (error) {
        console.error("Error fetching teachers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  // Apply filters locally (client-side filtering)
  const getFilteredTeachers = () => {
    switch (activeFilter) {
      case "highWorkload":
        return teachers.filter((t) => (t.total_periods_assigned || 0) >= 18);
      case "cs":
        return teachers.filter((t) => t.department === "Computer Science");
      case "ct":
        return teachers.filter((t) => t.department === "Computer Technology");
      case "is":
        return teachers.filter((t) => t.department === "Information Systems");
      case "se":
        return teachers.filter((t) => t.department === "Software Engineering");
      case "ai":
        return teachers.filter(
          (t) => t.department === "Artificial Intelligence"
        );
      default:
        return teachers;
    }
  };

  const filteredByCategory = getFilteredTeachers();

  // Filter teachers locally for search
  const filteredTeachers = filteredByCategory.filter((teacher) => {
    const q = searchQuery.toLowerCase();

    return (
      (teacher.name && teacher.name.toLowerCase().includes(q)) ||
      (teacher.department && teacher.department.toLowerCase().includes(q)) ||
      (teacher.rank && teacher.rank.toLowerCase().includes(q)) ||
      teacher.teacher_id.toString().includes(q)
    );
  });

  // Calculate statistics
  const stats = {
    total: teachers.length,
    highWorkload: teachers.filter((t) => (t.total_periods_assigned || 0) >= 18)
      .length,
    cs: teachers.filter((t) => t.department === "Computer Science").length,
    ct: teachers.filter((t) => t.department === "Computer Technology").length,
    is: teachers.filter((t) => t.department === "Information Systems").length,
    se: teachers.filter((t) => t.department === "Software Engineering").length,
    ai: teachers.filter((t) => t.department === "Artificial Intelligence")
      .length,
  };

  // Department distribution
  const departmentStats = teachers.reduce(
    (acc, teacher) => {
      const dept = teacher.department || "Undeclared";
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const allDepartments = Object.entries(departmentStats).sort(
    ([, a], [, b]) => b - a
  );

  // Rank distribution
  const rankStats = teachers.reduce(
    (acc, teacher) => {
      const rank = teacher.rank || "N/A";
      acc[rank] = (acc[rank] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const allRanks = Object.entries(rankStats).sort(([, a], [, b]) => b - a);

  // Workload distribution
  const workloadStats = {
    light: teachers.filter((t) => (t.total_periods_assigned || 0) < 12).length,
    medium: teachers.filter(
      (t) =>
        (t.total_periods_assigned || 0) >= 12 &&
        (t.total_periods_assigned || 0) < 18
    ).length,
    high: teachers.filter((t) => (t.total_periods_assigned || 0) >= 18).length,
  };

  // Export to CSV
  const handleExport = () => {
    const headers = [
      "No.",
      "Teacher ID",
      "Name",
      "Rank",
      "Department",
      "Total Periods Assigned",
    ];

    const csvData = filteredTeachers.map((t, index) => [
      index + 1,
      t.teacher_id,
      t.name || "",
      t.rank || "",
      t.department || "",
      t.total_periods_assigned ?? "",
    ]);

    const csv = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teachers_${activeFilter}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filterButtons: Array<{
    label: string;
    value: FilterType;
    count: number;
  }> = [
    { label: "All Teachers", value: "all", count: stats.total },
    {
      label: "High Workload",
      value: "highWorkload",
      count: stats.highWorkload,
    },
    { label: "Computer Science", value: "cs", count: stats.cs },
    { label: "Computer Technology", value: "ct", count: stats.ct },
    { label: "Information Systems", value: "is", count: stats.is },
    { label: "Software Engineering", value: "se", count: stats.se },
    { label: "Artificial Intelligence", value: "ai", count: stats.ai },
  ];

  const columns = [
    {
      key: "no",
      header: "No.",
      render: (_: TeacherWithId, index: number) => (
        <span className="font-medium text-muted-foreground">{index + 1}</span>
      ),
    },
    {
      key: "teacher",
      header: "Teacher",
      render: (teacher: TeacherWithId) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary">
              {teacher.name?.charAt(0).toUpperCase() || "?"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">
              {teacher.name || "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground">
              {teacher.rank || "N/A"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "teacher_id",
      header: "Teacher ID",
      render: (teacher: TeacherWithId) => (
        <span className="font-mono text-sm">#{teacher.teacher_id}</span>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (teacher: TeacherWithId) => (
        <span className="text-sm">{teacher.department || "Undeclared"}</span>
      ),
    },
    {
      key: "total_periods",
      header: "Total Periods",
      render: (teacher: TeacherWithId) => {
        const periods = teacher.total_periods_assigned || 0;
        const workloadLevel =
          periods >= 18 ? "high" : periods >= 12 ? "medium" : "light";
        const colorClasses = {
          high: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
          medium:
            "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
          light:
            "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
        };

        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[workloadLevel]}`}
          >
            {periods} periods
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (teacher: TeacherWithId) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => console.log("View teacher:", teacher.teacher_id)}
          className="hover:bg-primary/10"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Teacher Records"
        description={`Viewing ${filteredTeachers.length} of ${teachers.length} teachers`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilter !== "all" && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
                  1
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={filteredTeachers.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      {/* Filter Chips */}
      {showFilters && (
        <div className="mb-6 dashboard-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">Filter by:</h3>
            {activeFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveFilter("all")}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {filterButtons.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === filter.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {filter.label}
                <span className="ml-1.5 opacity-70">({filter.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="dashboard-card animate-pulse">
              <div className="h-6 bg-muted rounded w-32 mb-2"></div>
              <div className="h-8 bg-muted rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="dashboard-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Total Teachers
            </h3>
            <p className="text-3xl font-bold text-foreground">
              {teachers.length}
            </p>
          </div>
          <div className="dashboard-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Departments
            </h3>
            <p className="text-3xl font-bold text-foreground">
              {allDepartments.length}
            </p>
          </div>
          <div className="dashboard-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Average Workload
            </h3>
            <p className="text-3xl font-bold text-foreground">
              {teachers.length > 0
                ? (
                    teachers.reduce(
                      (sum, t) => sum + (t.total_periods_assigned || 0),
                      0
                    ) / teachers.length
                  ).toFixed(1)
                : 0}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                periods
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Department Distribution */}
      {loading ? (
        <div className="mb-6">
          <div className="mb-4">
            <div className="h-6 bg-muted rounded w-48 mb-2"></div>
            <div className="h-4 bg-muted rounded w-64"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="dashboard-card text-center animate-pulse">
                <div className="h-8 bg-muted rounded w-12 mx-auto mb-2"></div>
                <div className="h-4 bg-muted rounded w-24 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Teachers by Department
              </h3>
              <p className="text-sm text-muted-foreground">
                {allDepartments.length} departments • {teachers.length} total
                teachers
              </p>
            </div>

            {allDepartments.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {allDepartments.map(([department, count]) => (
                  <div
                    key={department}
                    className="dashboard-card text-center hover:border-primary/30 transition-all cursor-pointer hover:shadow-sm"
                    title={department}
                  >
                    <p className="text-2xl font-bold text-foreground mb-1">
                      {count}
                    </p>
                    <p className="text-sm text-muted-foreground truncate px-2">
                      {department}
                    </p>
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(count / teachers.length) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((count / teachers.length) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-card text-center py-8">
                <p className="text-muted-foreground">
                  No department data available
                </p>
              </div>
            )}
          </div>

          {/* Rank Distribution */}
          <div className="mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Teachers by Rank
              </h3>
              <p className="text-sm text-muted-foreground">
                {allRanks.length} ranks • {teachers.length} total teachers
              </p>
            </div>

            {allRanks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {allRanks.map(([rank, count]) => (
                  <div
                    key={rank}
                    className="dashboard-card text-center hover:border-primary/30 transition-all cursor-pointer hover:shadow-sm"
                    title={rank}
                  >
                    <p className="text-2xl font-bold text-foreground mb-1">
                      {count}
                    </p>
                    <p className="text-sm text-muted-foreground truncate px-2">
                      {rank}
                    </p>
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(count / teachers.length) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((count / teachers.length) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-card text-center py-8">
                <p className="text-muted-foreground">No rank data available</p>
              </div>
            )}
          </div>

          {/* Workload Distribution */}
          <div className="mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Workload Distribution
              </h3>
              <p className="text-sm text-muted-foreground">
                Based on periods assigned per teacher
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="dashboard-card text-center border-green-200 dark:border-green-900/30">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {workloadStats.light}
                </p>
                <p className="text-sm text-muted-foreground">
                  Light (&lt; 12 periods)
                </p>
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{
                      width: `${teachers.length > 0 ? (workloadStats.light / teachers.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="dashboard-card text-center border-yellow-200 dark:border-yellow-900/30">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                  {workloadStats.medium}
                </p>
                <p className="text-sm text-muted-foreground">
                  Medium (12-17 periods)
                </p>
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all"
                    style={{
                      width: `${teachers.length > 0 ? (workloadStats.medium / teachers.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="dashboard-card text-center border-red-200 dark:border-red-900/30">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                  {workloadStats.high}
                </p>
                <p className="text-sm text-muted-foreground">
                  High (≥ 18 periods)
                </p>
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all"
                    style={{
                      width: `${teachers.length > 0 ? (workloadStats.high / teachers.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Data Table */}
      {loading ? (
        <div className="dashboard-card flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading teachers...</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredTeachers}
          searchPlaceholder="Search by name, department, rank, or ID..."
          onSearch={setSearchQuery}
          searchValue={searchQuery}
          emptyMessage={
            searchQuery
              ? "No teachers found matching your search"
              : activeFilter !== "all"
                ? `No teachers found with the selected filter`
                : "No teachers found. Add teachers to get started."
          }
          getRowId={(teacher) => teacher.id}
        />
      )}
    </DashboardLayout>
  );
};

export default TeacherView;