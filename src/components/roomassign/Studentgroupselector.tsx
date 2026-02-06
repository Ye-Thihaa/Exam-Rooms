import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface StudentGroup {
  year_level: string;
  sem: string;
  program: string;
  specialization: string;
}

interface StudentGroupSelectorProps {
  label: string;
  group: StudentGroup;

  availableYearLevels: string[];
  availableSemesters: string[];
  availablePrograms: string[];
  availableSpecializations: string[];

  onYearChange: (value: string) => void;
  onSemesterChange: (value: string) => void;
  onProgramChange: (value: string) => void;
  onSpecializationChange: (value: string) => void;

  studentCount: number;
  disabledProgram?: string;
}

const StudentGroupSelector: React.FC<StudentGroupSelectorProps> = ({
  label,
  group,
  availableYearLevels,
  availableSemesters,
  availablePrograms,
  availableSpecializations,
  onYearChange,
  onSemesterChange,
  onProgramChange,
  onSpecializationChange,
  studentCount,
  disabledProgram,
}) => {
  // Determine if fields should be locked based on year level
  const isProgramLocked = ["1", "2"].includes(group.year_level);
  const isSpecializationLocked = ["1", "2", "3"].includes(group.year_level);

  // Get display values
  const getYearDisplay = () => {
    return group.year_level ? `Year ${group.year_level}` : "Select year";
  };

  const getSemesterDisplay = () => {
    return group.sem ? `Sem ${group.sem}` : "Select semester";
  };

  const getProgramDisplay = () => {
    if (!group.program) return "Select program";
    // Shorten long program names for display
    if (group.program === "Computer Science and Technology") return "CST";
    if (group.program === "Computer Science") return "CS";
    if (group.program === "Computer Technology") return "CT";
    return group.program;
  };

  const getSpecializationDisplay = () => {
    if (!group.year_level) return "Select year first";
    if (group.year_level === "4" && !group.program)
      return "Select program first";
    if (!availableSpecializations.length) return "N/A";
    return group.specialization || "Select spec";
  };

  return (
    <div>
      <Label className="text-base font-semibold mb-3 block">{label}</Label>

      <div className="grid grid-cols-5 gap-3">
        {/* Year Level */}
        <div>
          <Label className="text-xs">Year Level</Label>
          <Select value={group.year_level || ""} onValueChange={onYearChange}>
            <SelectTrigger className="bg-white">
              <SelectValue>{getYearDisplay()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableYearLevels.map((year) => (
                <SelectItem key={year} value={year}>
                  Year {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Semester - Now always enabled for all years */}
        <div>
          <Label className="text-xs">Semester</Label>
          <Select
            value={group.sem || ""}
            onValueChange={onSemesterChange}
            disabled={!group.year_level}
          >
            <SelectTrigger className="bg-white">
              <SelectValue>{getSemesterDisplay()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableSemesters.map((sem) => (
                <SelectItem key={sem} value={sem}>
                  Sem {sem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Program */}
        <div>
          <Label className="text-xs">Program</Label>
          <Select
            value={group.program || ""}
            onValueChange={onProgramChange}
            disabled={!group.year_level || isProgramLocked}
          >
            <SelectTrigger
              className={isProgramLocked ? "bg-gray-100" : "bg-white"}
            >
              <SelectValue>{getProgramDisplay()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availablePrograms.map((program) => (
                <SelectItem
                  key={program}
                  value={program}
                  disabled={program === disabledProgram}
                >
                  {program === "Computer Science and Technology"
                    ? "CST"
                    : program === "Computer Science"
                      ? "CS"
                      : program === "Computer Technology"
                        ? "CT"
                        : program}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Specialization */}
        <div>
          <Label className="text-xs">Specialization</Label>
          <Select
            value={group.specialization || ""}
            onValueChange={onSpecializationChange}
            disabled={
              !group.year_level ||
              isSpecializationLocked ||
              availableSpecializations.length === 0
            }
          >
            <SelectTrigger
              className={
                isSpecializationLocked || !availableSpecializations.length
                  ? "bg-gray-100"
                  : "bg-white"
              }
            >
              <SelectValue>{getSpecializationDisplay()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableSpecializations.map((spec) => (
                <SelectItem key={spec} value={spec}>
                  {spec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Students Count */}
        <div>
          <Label className="text-xs">Students</Label>
          <Input
            type="number"
            value={studentCount}
            disabled
            className="bg-muted"
          />
        </div>
      </div>
    </div>
  );
};

export default StudentGroupSelector;
