import React, { useState, useRef, useCallback } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  Upload,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  Download,
  Users,
  GraduationCap,
  BookOpen,
  Eye,
  EyeOff,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import supabase from "@/utils/supabase";

// ─── Types ─────────────────────────────────────────────────────────────────
type TableType = "student" | "teacher" | "exam";

interface ColumnHint {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example: string;
}
interface TableSchema {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  columns: ColumnHint[];
  dbTable: string;
  requiredColumns: string[];
  excelHeaders: string[];
}
interface UploadState {
  file: File | null;
  status: "idle" | "parsing" | "previewing" | "uploading" | "success" | "error";
  parsedData: Record<string, any>[];
  errors: string[];
  warnings: string[];
  successCount: number;
}

// ─── Schemas ────────────────────────────────────────────────────────────────
const TABLE_SCHEMAS: Record<TableType, TableSchema> = {
  student: {
    label: "Students",
    icon: Users,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    dbTable: "student",
    requiredColumns: ["student_number", "name", "year_level", "retake"],
    excelHeaders: [
      "student_number",
      "name",
      "year_level",
      "retake",
      "major",
      "sem",
      "specialization",
    ],
    columns: [
      {
        name: "student_number",
        type: "TEXT",
        required: true,
        description: "Unique student ID number",
        example: "2021-00123",
      },
      {
        name: "name",
        type: "TEXT",
        required: true,
        description: "Full name of the student",
        example: "Juan Dela Cruz",
      },
      {
        name: "year_level",
        type: "NUMBER (1–4)",
        required: true,
        description: "Current year level",
        example: "2",
      },
      {
        name: "retake",
        type: "BOOLEAN",
        required: true,
        description: "Is the student retaking? (TRUE / FALSE)",
        example: "FALSE",
      },
      {
        name: "major",
        type: "TEXT",
        required: false,
        description: "Student's major (optional)",
        example: "Computer Science",
      },
      {
        name: "sem",
        type: "NUMBER (1–2)",
        required: false,
        description: "Current semester (optional)",
        example: "1",
      },
      {
        name: "specialization",
        type: "TEXT",
        required: false,
        description: "Specialization track (optional)",
        example: "Artificial Intelligence",
      },
    ],
  },
  teacher: {
    label: "Teachers",
    icon: GraduationCap,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    dbTable: "teacher",
    requiredColumns: ["rank", "name", "department", "total_periods_assigned"],
    excelHeaders: ["rank", "name", "department", "total_periods_assigned"],
    columns: [
      {
        name: "rank",
        type: "TEXT",
        required: true,
        description: "Academic rank / title",
        example: "Professor",
      },
      {
        name: "name",
        type: "TEXT",
        required: true,
        description: "Full name of the teacher",
        example: "Dr. Maria Santos",
      },
      {
        name: "department",
        type: "TEXT",
        required: true,
        description: "Department the teacher belongs to",
        example: "College of Engineering",
      },
      {
        name: "total_periods_assigned",
        type: "NUMBER",
        required: true,
        description: "Invigilation periods already assigned",
        example: "0",
      },
    ],
  },
  exam: {
    label: "Exams",
    icon: BookOpen,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    dbTable: "exam",
    requiredColumns: [
      "subject_code",
      "exam_name",
      "exam_date",
      "session",
      "academic_year",
      "semester",
      "year_level",
      "program",
      "start_time",
      "end_time",
      "day_of_week",
    ],
    excelHeaders: [
      "subject_code",
      "exam_name",
      "exam_date",
      "session",
      "academic_year",
      "semester",
      "year_level",
      "program",
      "specialization",
      "start_time",
      "end_time",
      "day_of_week",
    ],
    columns: [
      {
        name: "subject_code",
        type: "TEXT",
        required: true,
        description: "Unique course/subject code",
        example: "CS101",
      },
      {
        name: "exam_name",
        type: "TEXT",
        required: true,
        description: "Full name of the exam",
        example: "Intro to Computing",
      },
      {
        name: "exam_date",
        type: "DATE (YYYY-MM-DD)",
        required: true,
        description: "Date of the exam",
        example: "2025-06-15",
      },
      {
        name: "session",
        type: "TEXT",
        required: true,
        description: "Session label (Morning / Afternoon)",
        example: "Morning",
      },
      {
        name: "academic_year",
        type: "TEXT",
        required: true,
        description: "Academic year",
        example: "2024-2025",
      },
      {
        name: "semester",
        type: "TEXT",
        required: true,
        description: "Semester the exam belongs to",
        example: "1st Semester",
      },
      {
        name: "year_level",
        type: "TEXT",
        required: true,
        description: "Target year level",
        example: "2nd Year",
      },
      {
        name: "program",
        type: "TEXT",
        required: true,
        description: "Degree program",
        example: "BS Computer Science",
      },
      {
        name: "specialization",
        type: "TEXT",
        required: false,
        description: "Specialization track (optional)",
        example: "Web Development",
      },
      {
        name: "start_time",
        type: "TIME (HH:MM)",
        required: true,
        description: "Exam start time (24-hour)",
        example: "08:00",
      },
      {
        name: "end_time",
        type: "TIME (HH:MM)",
        required: true,
        description: "Exam end time (24-hour)",
        example: "10:00",
      },
      {
        name: "day_of_week",
        type: "TEXT",
        required: true,
        description: "Day of the week",
        example: "Monday",
      },
    ],
  },
};

// ─── Download sample ────────────────────────────────────────────────────────
function downloadSampleExcel(tableType: TableType) {
  const schema = TABLE_SCHEMAS[tableType];
  const sampleRow: Record<string, any> = {};
  schema.columns.forEach((col) => {
    sampleRow[col.name] = col.example;
  });
  const ws = XLSX.utils.json_to_sheet([sampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, schema.label);
  XLSX.writeFile(wb, `sample_${tableType}.xlsx`);
}

// ─── Validation ─────────────────────────────────────────────────────────────
function validateRows(rows: Record<string, any>[], tableType: TableType) {
  const schema = TABLE_SCHEMAS[tableType];
  const errors: string[] = [];
  const warnings: string[] = [];
  const valid: Record<string, any>[] = [];

  rows.forEach((rawRow, i) => {
    const row = { ...rawRow };
    const rowNum = i + 2;
    const rowErrors: string[] = [];

    schema.requiredColumns.forEach((col) => {
      if (row[col] === undefined || row[col] === null || row[col] === "")
        rowErrors.push(`Row ${rowNum}: "${col}" is required but missing.`);
    });

    if (tableType === "student") {
      const yl = Number(row.year_level);
      if (isNaN(yl) || yl < 1 || yl > 4)
        rowErrors.push(`Row ${rowNum}: "year_level" must be 1–4.`);
      else row.year_level = yl;

      const retakeStr = String(row.retake ?? "").toUpperCase();
      if (
        retakeStr !== "TRUE" &&
        retakeStr !== "FALSE" &&
        row.retake !== true &&
        row.retake !== false
      )
        rowErrors.push(`Row ${rowNum}: "retake" must be TRUE or FALSE.`);
      else row.retake = retakeStr === "TRUE" || row.retake === true;

      if (row.sem !== undefined && row.sem !== null && row.sem !== "") {
        const sem = Number(row.sem);
        if (isNaN(sem) || (sem !== 1 && sem !== 2))
          warnings.push(
            `Row ${rowNum}: "sem" should be 1 or 2. Found: ${row.sem}`,
          );
        else row.sem = sem;
      } else row.sem = null;

      if (!row.major) row.major = null;
      if (!row.specialization) row.specialization = null;
    }

    if (tableType === "teacher") {
      const p = Number(row.total_periods_assigned);
      if (isNaN(p) || p < 0)
        rowErrors.push(`Row ${rowNum}: "total_periods_assigned" must be >= 0.`);
      else row.total_periods_assigned = p;
    }

    if (tableType === "exam") {
      if (row.exam_date) {
        const dateStr = String(row.exam_date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const serial = Number(row.exam_date);
          if (!isNaN(serial)) {
            const parsed = XLSX.SSF.parse_date_code(serial);
            if (parsed) {
              row.exam_date = `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
            } else
              warnings.push(
                `Row ${rowNum}: "exam_date" format unrecognized: ${row.exam_date}`,
              );
          } else
            warnings.push(
              `Row ${rowNum}: "exam_date" should be YYYY-MM-DD. Found: ${row.exam_date}`,
            );
        }
      }
      if (!row.specialization) row.specialization = null;
    }

    if (rowErrors.length > 0) errors.push(...rowErrors);
    else valid.push(row);
  });

  return { valid, errors, warnings };
}

// ─── SchemaHintCard ─────────────────────────────────────────────────────────
const SchemaHintCard: React.FC<{ tableType: TableType }> = ({ tableType }) => {
  const [open, setOpen] = useState(false);
  const schema = TABLE_SCHEMAS[tableType];
  const Icon = schema.icon;

  return (
    <div className={`rounded-xl border ${schema.borderColor} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 ${schema.bgColor} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${schema.color}`} />
          <span className={`text-sm font-semibold ${schema.color}`}>
            Excel Structure for {schema.label}
          </span>
          <span className="text-xs text-muted-foreground bg-white/70 px-2 py-0.5 rounded-full border">
            {schema.columns.length} columns
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={(e) => {
              e.stopPropagation();
              downloadSampleExcel(tableType);
            }}
          >
            <Download className="h-3 w-3" /> Sample
          </Button>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {open && (
        <div className="p-4 bg-white">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Row 1 must be the header row with these exact column names
            (case-sensitive).
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {[
                    "Column Name",
                    "Type",
                    "Required",
                    "Description",
                    "Example",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-semibold text-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schema.columns.map((col) => (
                  <tr
                    key={col.name}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-3 py-2 font-mono font-medium text-foreground">
                      {col.name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {col.type}
                    </td>
                    <td className="px-3 py-2">
                      {col.required ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 inline-block" />
                          Optional
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {col.description}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground bg-muted/30">
                      {col.example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 flex gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span>
                <strong>Tip:</strong> Column order in your Excel file doesn't
                matter, but every header name must match exactly. Download the
                Sample to get a ready-to-fill template.
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── UploadZone ─────────────────────────────────────────────────────────────
interface UploadZoneProps {
  tableType: TableType;
  state: UploadState;
  onFileSelect: (f: File, t: TableType) => void;
  onConfirmUpload: (t: TableType) => void;
  onReset: (t: TableType) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({
  tableType,
  state,
  onFileSelect,
  onConfirmUpload,
  onReset,
}) => {
  const schema = TABLE_SCHEMAS[tableType];
  const Icon = schema.icon;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file, tableType);
    },
    [onFileSelect, tableType],
  );

  const previewColumns =
    state.parsedData.length > 0 ? Object.keys(state.parsedData[0]) : [];
  const previewRows = state.parsedData.slice(0, 5);

  return (
    <div
      className={`rounded-xl border-2 ${schema.borderColor} overflow-hidden`}
    >
      {/* Header */}
      <div
        className={`${schema.bgColor} px-5 py-4 border-b ${schema.borderColor}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <Icon className={`h-5 w-5 ${schema.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Upload {schema.label}
            </h3>
            <p className="text-xs text-muted-foreground">
              .xlsx or .xls files supported
            </p>
          </div>
          {state.status === "success" && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {state.successCount} records inserted
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 bg-white">
        {/* Idle */}
        {state.status === "idle" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-3 py-10
              ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drag & drop your file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>.xlsx, .xls</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileSelect(f, tableType);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {/* Spinner */}
        {(state.status === "parsing" || state.status === "uploading") && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Loader2 className={`h-8 w-8 animate-spin ${schema.color}`} />
            <p className="text-sm text-muted-foreground">
              {state.status === "parsing"
                ? "Parsing your Excel file…"
                : "Inserting records into database…"}
            </p>
          </div>
        )}

        {/* Preview */}
        {state.status === "previewing" && (
          <div className="space-y-4">
            {/* Stats chips */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{state.file?.name}</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-emerald-700 font-medium">
                  {state.parsedData.length} valid rows
                </span>
              </div>
              {state.errors.length > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700 font-medium">
                    {state.errors.length} errors
                  </span>
                </div>
              )}
              {state.warnings.length > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-700 font-medium">
                    {state.warnings.length} warnings
                  </span>
                </div>
              )}
            </div>

            {state.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> Validation Errors (these
                  rows will be skipped)
                </p>
                {state.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600 pl-5">
                    {err}
                  </p>
                ))}
              </div>
            )}

            {state.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Warnings (rows will
                  still be inserted)
                </p>
                {state.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600 pl-5">
                    {w}
                  </p>
                ))}
              </div>
            )}

            {state.parsedData.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  {showPreview ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {showPreview ? "Hide" : "Show"} preview (first 5 rows)
                </button>
                {showPreview && (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-2 py-1.5 text-left text-muted-foreground font-medium w-8">
                            #
                          </th>
                          {previewColumns.map((col) => (
                            <th
                              key={col}
                              className="px-2 py-1.5 text-left font-mono font-semibold text-foreground whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {previewRows.map((row, i) => (
                          <tr key={i} className="hover:bg-muted/20">
                            <td className="px-2 py-1.5 text-muted-foreground">
                              {i + 1}
                            </td>
                            {previewColumns.map((col) => (
                              <td
                                key={col}
                                className="px-2 py-1.5 text-foreground whitespace-nowrap"
                              >
                                {row[col] === null || row[col] === undefined ? (
                                  <span className="text-muted-foreground/50 italic">
                                    null
                                  </span>
                                ) : (
                                  String(row[col])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {state.parsedData.length > 5 && (
                      <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground border-t border-border">
                        … and {state.parsedData.length - 5} more rows
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button
                size="sm"
                onClick={() => onConfirmUpload(tableType)}
                disabled={state.parsedData.length === 0}
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" /> Insert{" "}
                {state.parsedData.length} records
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReset(tableType)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Success */}
        {state.status === "success" && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">
                Successfully inserted!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {state.successCount} {schema.label.toLowerCase()} records added
                to the database.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReset(tableType)}
            >
              Upload another file
            </Button>
          </div>
        )}

        {/* Error */}
        {state.status === "error" && (
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  Upload failed
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {state.errors[0] || "An unexpected error occurred."}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onReset(tableType)}
            >
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const defaultUploadState = (): UploadState => ({
  file: null,
  status: "idle",
  parsedData: [],
  errors: [],
  warnings: [],
  successCount: 0,
});

const InsertDataPage: React.FC = () => {
  const [uploadStates, setUploadStates] = useState<
    Record<TableType, UploadState>
  >({
    student: defaultUploadState(),
    teacher: defaultUploadState(),
    exam: defaultUploadState(),
  });

  const updateState = (tableType: TableType, patch: Partial<UploadState>) =>
    setUploadStates((prev) => ({
      ...prev,
      [tableType]: { ...prev[tableType], ...patch },
    }));

  const handleFileSelect = async (file: File, tableType: TableType) => {
    updateState(tableType, {
      file,
      status: "parsing",
      errors: [],
      warnings: [],
    });
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, {
        defval: null,
      });
      if (rows.length === 0) {
        updateState(tableType, {
          status: "error",
          errors: ["The file is empty or has no data rows."],
        });
        return;
      }
      const { valid, errors, warnings } = validateRows(rows, tableType);
      updateState(tableType, {
        status: "previewing",
        parsedData: valid,
        errors,
        warnings,
      });
    } catch (e: any) {
      updateState(tableType, {
        status: "error",
        errors: [e?.message || "Failed to parse the file."],
      });
    }
  };

  const handleConfirmUpload = async (tableType: TableType) => {
    const state = uploadStates[tableType];
    if (!state.parsedData.length) return;
    updateState(tableType, { status: "uploading" });
    const schema = TABLE_SCHEMAS[tableType];
    try {
      const CHUNK = 500;
      let inserted = 0;
      for (let i = 0; i < state.parsedData.length; i += CHUNK) {
        const { error } = await supabase
          .from(schema.dbTable)
          .insert(state.parsedData.slice(i, i + CHUNK));
        if (error) throw new Error(error.message);
        inserted += Math.min(CHUNK, state.parsedData.length - i);
      }
      updateState(tableType, { status: "success", successCount: inserted });
    } catch (e: any) {
      updateState(tableType, {
        status: "error",
        errors: [e?.message || "Database insertion failed."],
      });
    }
  };

  const handleReset = (tableType: TableType) =>
    setUploadStates((prev) => ({ ...prev, [tableType]: defaultUploadState() }));

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Table2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Insert Data</h1>
            <p className="text-sm text-muted-foreground">
              Bulk-import Students, Teachers, or Exams via Excel files
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 space-y-1">
            <p className="font-semibold">How it works</p>
            <p>
              1. Expand the <strong>Excel Structure</strong> hint below to see
              required columns and formats.
            </p>
            <p>
              2. Click <strong>Sample</strong> to download a pre-filled
              template.
            </p>
            <p>
              3. Upload your completed file — data is validated and previewed
              before any insert happens.
            </p>
          </div>
        </div>

        {/* Sections */}
        {(["student", "teacher", "exam"] as TableType[]).map((tableType) => {
          const schema = TABLE_SCHEMAS[tableType];
          const Icon = schema.icon;
          return (
            <section key={tableType} className="space-y-4">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${schema.color}`} />
                <h2 className="text-lg font-semibold text-foreground">
                  {schema.label}
                </h2>
                <div className={`h-px flex-1 border-t ${schema.borderColor}`} />
              </div>
              <SchemaHintCard tableType={tableType} />
              <UploadZone
                tableType={tableType}
                state={uploadStates[tableType]}
                onFileSelect={handleFileSelect}
                onConfirmUpload={handleConfirmUpload}
                onReset={handleReset}
              />
            </section>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default InsertDataPage;
