import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Download, Eye, Loader2, Filter, X } from "lucide-react";
import {
  getAllStudents,
  getStudentsByYearLevel,
  getRetakeStudents,
  Student,
} from "@/services/studentQueries";

type FilterType = "all" | "retake" | "year1" | "year2" | "year3" | "year4";

// Extended Student type with id field
type StudentWithId = Student & { id: number };

const StudentRecords: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<StudentWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch students based on active filter
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        let data: StudentWithId[];

        switch (activeFilter) {
          case "retake":
            data = await getRetakeStudents();
            break;
          case "year1":
            data = await getStudentsByYearLevel(1);
            break;
          case "year2":
            data = await getStudentsByYearLevel(2);
            break;
          case "year3":
            data = await getStudentsByYearLevel(3);
            break;
          case "year4":
            data = await getStudentsByYearLevel(4);
            break;
          default:
            data = await getAllStudents();
        }

        setStudents(data);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [activeFilter]);

  // Filter students locally for search (include specialization too)
  const filteredStudents = students.filter((student) => {
    const q = searchQuery.toLowerCase();

    return (
      student.name.toLowerCase().includes(q) ||
      student.student_number.toLowerCase().includes(q) ||
      (student.major && student.major.toLowerCase().includes(q)) ||
      (student.specialization &&
        student.specialization.toLowerCase().includes(q))
    );
  });

  // Calculate statistics
  const stats = {
    total: students.length,
    retake: students.filter((s) => s.retake).length,
    year1: students.filter((s) => s.year_level === 1).length,
    year2: students.filter((s) => s.year_level === 2).length,
    year3: students.filter((s) => s.year_level === 3).length,
    year4: students.filter((s) => s.year_level === 4).length,
  };

  // ✅ Major + Specialization distribution
  const majorSpecStats = students.reduce(
    (acc, student) => {
      const major = student.major || "Undeclared";
      const spec = student.specialization || "N/A";
      const key = `${major} • ${spec}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Sort by count desc
  const allMajorSpecs = Object.entries(majorSpecStats).sort(
    ([, a], [, b]) => b - a,
  );
  // Map program names to short codes
  const PROGRAM_CODE: Record<string, string> = {
    "Computer Science and Technology": "CST",
    "Computer Science": "CS",
    "Computer Technology": "CT",
  };

  // Program distribution (CST/CS/CT)
  const programStats = students.reduce(
    (acc, s) => {
      const code = (s.major && PROGRAM_CODE[s.major]) || s.major || "Unknown";
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const allPrograms = Object.entries(programStats).sort(
    ([, a], [, b]) => b - a,
  );

  // Specialization distribution (SE/KE/BIS/HPC/CN/ES/CSEC...)
  const specializationStats = students.reduce(
    (acc, s) => {
      const spec = s.specialization || "N/A";
      acc[spec] = (acc[spec] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const allSpecializations = Object.entries(specializationStats).sort(
    ([, a], [, b]) => b - a,
  );
  // Export to CSV (include specialization)
  const handleExport = () => {
    const headers = [
      "No.",
      "Student ID",
      "Student Number",
      "Name",
      "Year Level",
      "Major",
      "Specialization",
      "Semester",
      "Retake",
    ];

    const csvData = filteredStudents.map((s, index) => [
      index + 1,
      s.student_id,
      s.student_number,
      s.name,
      s.year_level,
      s.major || "",
      s.specialization || "",
      s.sem ?? "",
      s.retake ? "Yes" : "No",
    ]);

    const csv = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_${activeFilter}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filterButtons: Array<{
    label: string;
    value: FilterType;
    count: number;
  }> = [
    { label: "All Students", value: "all", count: stats.total },
    { label: "Retake", value: "retake", count: stats.retake },
    { label: "Year 1", value: "year1", count: stats.year1 },
    { label: "Year 2", value: "year2", count: stats.year2 },
    { label: "Year 3", value: "year3", count: stats.year3 },
    { label: "Year 4", value: "year4", count: stats.year4 },
  ];

  const columns = [
    {
      key: "no",
      header: "No.",
      render: (_: StudentWithId, index: number) => (
        <span className="font-medium text-muted-foreground">{index + 1}</span>
      ),
    },
    {
      key: "student",
      header: "Student",
      render: (student: StudentWithId) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary">
              {student.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">
              {student.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {student.student_number}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "student_id",
      header: "Student ID",
      render: (student: StudentWithId) => (
        <span className="font-mono text-sm">#{student.student_id}</span>
      ),
    },
    {
      key: "major",
      header: "Program",
      render: (student: StudentWithId) => (
        <span className="text-sm">{student.major || "Undeclared"}</span>
      ),
    },
    // ✅ NEW COLUMN
    {
      key: "specialization",
      header: "Specialization",
      render: (student: StudentWithId) => (
        <span className="text-sm">{student.specialization || "N/A"}</span>
      ),
    },
    {
      key: "year_level",
      header: "Year Level",
      render: (student: StudentWithId) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
          Year {student.year_level}
        </span>
      ),
    },
    {
      key: "semester",
      header: "Semester",
      render: (student: StudentWithId) => (
        <span className="text-sm">
          {student.sem ? `Sem ${student.sem}` : "N/A"}
        </span>
      ),
    },
    {
      key: "retake",
      header: "Status",
      render: (student: StudentWithId) =>
        student.retake ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
            Retake
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
            Regular
          </span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (student: StudentWithId) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => console.log("View student:", student.student_id)}
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
        title="Student Records"
        description={`Viewing ${filteredStudents.length} of ${students.length} students`}
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
              disabled={filteredStudents.length === 0}
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

      {/* Program % (CST / CT / CS) */}
      {loading ? (
        <div className="mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Students by Program
            </h3>
            <p className="text-sm text-muted-foreground">
              Percentage distribution (CST / CT / CS)
            </p>
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
                Students by Program
              </h3>
              <p className="text-sm text-muted-foreground">
                {allPrograms.length} programs • {students.length} total students
              </p>
            </div>

            {allPrograms.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {allPrograms.map(([program, count]) => (
                  <div
                    key={program}
                    className="dashboard-card text-center hover:border-primary/30 transition-all cursor-pointer hover:shadow-sm"
                    title={program}
                  >
                    <p className="text-2xl font-bold text-foreground mb-1">
                      {count}
                    </p>
                    <p className="text-sm text-muted-foreground truncate px-2">
                      {program}
                    </p>
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(count / students.length) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((count / students.length) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-card text-center py-8">
                <p className="text-muted-foreground">
                  No student data available
                </p>
              </div>
            )}
          </div>

          {/* Specialization % (SE/KE/BIS/HPC...) */}
          <div className="mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Students by Specialization
              </h3>
              <p className="text-sm text-muted-foreground">
                {allSpecializations.length} specializations • {students.length}{" "}
                total students
              </p>
            </div>

            {allSpecializations.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {allSpecializations.map(([spec, count]) => (
                  <div
                    key={spec}
                    className="dashboard-card text-center hover:border-primary/30 transition-all cursor-pointer hover:shadow-sm"
                    title={spec}
                  >
                    <p className="text-2xl font-bold text-foreground mb-1">
                      {count}
                    </p>
                    <p className="text-sm text-muted-foreground truncate px-2">
                      {spec}
                    </p>
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(count / students.length) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((count / students.length) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-card text-center py-8">
                <p className="text-muted-foreground">
                  No specialization data available
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Data Table */}
      {loading ? (
        <div className="dashboard-card flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredStudents}
          searchPlaceholder="Search by name, student number, program, or specialization..."
          onSearch={setSearchQuery}
          searchValue={searchQuery}
          emptyMessage={
            searchQuery
              ? "No students found matching your search"
              : activeFilter !== "all"
                ? `No students found with the selected filter`
                : "No students found. Add students to get started."
          }
          getRowId={(student) => student.id}
        />
      )}
    </DashboardLayout>
  );
};

export default StudentRecords;
