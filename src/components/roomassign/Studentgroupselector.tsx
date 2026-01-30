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
  onYearChange: (value: string) => void;
  onSemesterChange: (value: string) => void;
  onProgramChange: (value: string) => void;
  studentCount: number;
  disabledProgram?: string;
}

const StudentGroupSelector: React.FC<StudentGroupSelectorProps> = ({
  label,
  group,
  availableYearLevels,
  availableSemesters,
  availablePrograms,
  onYearChange,
  onSemesterChange,
  onProgramChange,
  studentCount,
  disabledProgram,
}) => {
  const isSemesterLocked = ["1", "2", "3"].includes(group.year_level);
  const isProgramLocked = ["1", "2"].includes(group.year_level);

  return (
    <div>
      <Label className="text-base font-semibold mb-3 block">{label}</Label>
      <div className="grid grid-cols-4 gap-3">
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
