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
import { StudentGroup } from "../../pages/exam-officer/RoomAssignment";

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
  // ✅ Determine if fields should be locked based on year level

  // Semester is locked for Year 1, 2, 3 (always semester 1)
  // Only Year 4 can choose semester 1 or 2
  const isSemesterLocked = ["1", "2", "3"].includes(group.year_level);

  // Program is locked for Year 1, 2 (always CST)
  // Year 3 and 4 can choose programs
  const isProgramLocked = ["1", "2"].includes(group.year_level);

  // ✅ Specialization logic:
  // - Year 1, 2: Locked to CST (auto-filled)
  // - Year 3: Locked to program value (CS -> CS, CT -> CT)
  // - Year 4: User must select based on program
  const isSpecializationLocked = ["1", "2", "3"].includes(group.year_level);

  return (
    <div>
      <Label className="text-base font-semibold mb-3 block">{label}</Label>

      <div className="grid grid-cols-5 gap-3">
        {/* Year Level */}
        <div>
          <Label className="text-xs">Year Level</Label>
          <Select value={group.year_level || ""} onValueChange={onYearChange}>
            <SelectTrigger>
              <SelectValue placeholder="Year" />
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

        {/* Semester */}
        <div>
          <Label className="text-xs">Semester</Label>
          <Select
            value={group.sem || ""}
            onValueChange={onSemesterChange}
            disabled={!group.year_level || isSemesterLocked}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sem" />
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
            <SelectTrigger>
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              {availablePrograms.map((program) => (
                <SelectItem
                  key={program}
                  value={program}
                  disabled={program === disabledProgram}
                >
                  {program}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ✅ Specialization */}
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
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !group.year_level
                    ? "Select year first"
                    : group.year_level === "4" && !group.program
                      ? "Select program first"
                      : availableSpecializations.length === 0
                        ? "N/A"
                        : "Spec"
                }
              />
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
