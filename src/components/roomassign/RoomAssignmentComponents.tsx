import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Room } from "@/services/Roomqueries";
import {
  CheckCircle2,
  ArrowRight,
  DoorOpen,
  AlertCircle,
  Users,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  RoomPairing,
  StudentGroup,
} from "../../pages/exam-officer/RoomAssignment";

// ─────────────────────────────────────────────
// Shared Types
// ─────────────────────────────────────────────

export interface StudentStats {
  total: number;
  byGroup: Map<string, { total: number; assigned: number }>;
}

export interface DBStudentGroup {
  year_level: number;
  sem: number;
  major: string;
  specialization: string;
}

const groupKey = (
  yearLevel: string | number,
  sem: string | number,
  program: string,
  specialization: string,
) => `${yearLevel}|${sem}|${program}|${specialization}`;

// ─────────────────────────────────────────────
// ProgressSteps
// ─────────────────────────────────────────────

interface ProgressStepsProps {
  currentStep: 1 | 2;
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-center gap-4">
        <div
          className={`flex items-center gap-2 ${
            currentStep >= 1 ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 1 ? "bg-primary text-white" : "bg-muted"
            }`}
          >
            {currentStep > 1 ? <CheckCircle2 className="h-5 w-5" /> : "1"}
          </div>
          <span className="font-medium">Select Rooms</span>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <div
          className={`flex items-center gap-2 ${
            currentStep >= 2 ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 2 ? "bg-primary text-white" : "bg-muted"
            }`}
          >
            2
          </div>
          <span className="font-medium">Student Pairing</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// RoomSelectionStep
// ─────────────────────────────────────────────

interface RoomSelectionStepProps {
  availableRooms: Room[];
  selectedRooms: Room[];
  onToggleRoom: (room: Room) => void;
  onProceed: () => void;
}

const RoomCard: React.FC<{
  room: Room;
  isSelected: boolean;
  onToggle: () => void;
}> = ({ room, isSelected, onToggle }) => (
  <div
    onClick={onToggle}
    className={`
      border-2 rounded-lg p-4 cursor-pointer transition-all
      ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
    `}
  >
    <div className="flex items-start justify-between mb-2">
      <div className="font-semibold text-lg">{room.room_number}</div>
      {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
    </div>
    <div className="text-sm text-muted-foreground">
      Capacity: {room.capacity}
    </div>
    <div className="text-xs text-muted-foreground">
      {room.rows}×{room.cols} layout
    </div>
  </div>
);

export const RoomSelectionStep: React.FC<RoomSelectionStepProps> = ({
  availableRooms,
  selectedRooms,
  onToggleRoom,
  onProceed,
}) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DoorOpen className="h-5 w-5" />
            Select Rooms
          </h3>
          <Badge variant="outline">{selectedRooms.length} selected</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {availableRooms.map((room) => {
            const isSelected = selectedRooms.some(
              (r) => r.room_id === room.room_id,
            );
            return (
              <RoomCard
                key={room.room_id}
                room={room}
                isSelected={isSelected}
                onToggle={() => onToggleRoom(room)}
              />
            );
          })}
        </div>

        <Button
          onClick={onProceed}
          disabled={selectedRooms.length === 0}
          className="w-full"
        >
          Continue to Student Pairing
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────
// StudentGroupSelector
// ─────────────────────────────────────────────

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
  onStudentCountChange: (value: number) => void;
  disabledProgram?: string;
}

export const StudentGroupSelector: React.FC<StudentGroupSelectorProps> = ({
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
  onStudentCountChange,
  disabledProgram,
}) => {
  const isProgramLocked = ["1", "2"].includes(group.year_level);
  const isSpecializationLocked = ["1", "2", "3"].includes(group.year_level);

  const handleStudentCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      onStudentCountChange(0);
      return;
    }
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 36) {
      onStudentCountChange(numValue);
    }
  };

  const getYearDisplay = () =>
    group.year_level ? `Year ${group.year_level}` : "Select year";

  const getSemesterDisplay = () =>
    group.sem ? `Sem ${group.sem}` : "Select semester";

  const getProgramDisplay = () => {
    if (!group.program) return "Select program";
    if (group.program === "Computer Science and Technology") return "CST";
    if (group.program === "Computer Science") return "CS";
    if (group.program === "Computer Technology") return "CT";
    return group.program;
  };

  const getSpecializationDisplay = () => {
    if (!group.year_level) return "Select year first";
    if (group.year_level === "4" && !group.program) return "Select program first";
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

        {/* Semester */}
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
            <SelectTrigger className={isProgramLocked ? "bg-gray-100" : "bg-white"}>
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
            value={studentCount || ""}
            onChange={handleStudentCountChange}
            min={0}
            max={36}
            placeholder="0-36"
            className={studentCount > 36 ? "border-red-500" : "bg-white"}
          />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// RoomPairingCard
// ─────────────────────────────────────────────

interface RoomPairingCardProps {
  pairing: RoomPairing;
  availableOptions: {
    yearLevels: string[];
    semesters: string[];
    programs: string[];
    specializations: string[];
  };
  onUpdate: (id: string, field: keyof RoomPairing, value: any) => void;
  getAvailableSemestersForYear: (yearLevel: string, allSemesters: string[]) => string[];
  getAvailableProgramsForYear: (yearLevel: string, allPrograms: string[]) => string[];
  getAvailableSpecializationsForYear: (yearLevel: string, program?: string) => string[];
  getDefaultGroupValues: (yearLevel: string) => Pick<StudentGroup, "sem" | "program" | "specialization">;
  getPrimaryRemaining: () => number | null;
  getSecondaryRemaining: () => number | null;
}

const RemainingBadge: React.FC<{ remaining: number | null }> = ({ remaining }) => {
  if (remaining === null) return null;

  const colorClass =
    remaining < 0
      ? "bg-red-100 text-red-700 border-red-300"
      : remaining === 0
        ? "bg-green-100 text-green-700 border-green-300"
        : "bg-orange-100 text-orange-700 border-orange-300";

  const label =
    remaining < 0
      ? `${Math.abs(remaining)} over limit`
      : remaining === 0
        ? "Fully pre-assigned"
        : `${remaining} left`;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}
    >
      {label}
    </span>
  );
};

export const RoomPairingCard: React.FC<RoomPairingCardProps> = ({
  pairing,
  availableOptions,
  onUpdate,
  getAvailableSemestersForYear,
  getAvailableProgramsForYear,
  getAvailableSpecializationsForYear,
  getDefaultGroupValues,
  getPrimaryRemaining,
  getSecondaryRemaining,
}) => {
  const totalStudents = pairing.students_primary + pairing.students_secondary;
  const exceedsCapacity = totalStudents > 36;

  const primaryRemaining = getPrimaryRemaining();
  const secondaryRemaining = getSecondaryRemaining();

  const isDuplicateGroup =
    pairing.group_primary.year_level &&
    pairing.group_secondary.year_level &&
    pairing.group_primary.year_level === pairing.group_secondary.year_level &&
    pairing.group_primary.sem === pairing.group_secondary.sem &&
    pairing.group_primary.program === pairing.group_secondary.program &&
    pairing.group_primary.specialization === pairing.group_secondary.specialization &&
    pairing.group_primary.program !== "";

  const handleYearChange = (
    groupType: "group_primary" | "group_secondary",
    yearLevel: string,
  ) => {
    const defaults = getDefaultGroupValues(yearLevel);
    onUpdate(pairing.id, groupType, { year_level: yearLevel, ...defaults });
  };

  const handleFieldChange = (
    groupType: "group_primary" | "group_secondary",
    field: keyof StudentGroup,
    value: string,
  ) => {
    const currentGroup =
      groupType === "group_primary" ? pairing.group_primary : pairing.group_secondary;

    const nextGroup: StudentGroup = { ...currentGroup, [field]: value };

    if (field === "program") {
      if (nextGroup.year_level === "1" || nextGroup.year_level === "2") {
        nextGroup.specialization = "CST";
      } else if (nextGroup.year_level === "3") {
        nextGroup.specialization = value;
      } else if (nextGroup.year_level === "4") {
        nextGroup.specialization = "";
      }
    }

    onUpdate(pairing.id, groupType, nextGroup);
  };

  const handleStudentCountChange = (
    groupType: "students_primary" | "students_secondary",
    value: number,
  ) => {
    onUpdate(pairing.id, groupType, value);
  };

  return (
    <Card className="p-4 border-2">
      <div className="space-y-4">
        {/* Room Info */}
        <div className="flex items-center justify-between pb-3 border-b">
          <div>
            <div className="font-semibold text-lg">{pairing.room.room_number}</div>
            <div className="text-sm text-muted-foreground">
              Capacity: {pairing.room.capacity} ({pairing.room.rows}×{pairing.room.cols})
            </div>
          </div>
          <Badge variant={exceedsCapacity ? "destructive" : "default"}>
            {totalStudents} / 36
          </Badge>
        </div>

        {/* Primary Group */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Primary Group</span>
            <RemainingBadge remaining={primaryRemaining} />
          </div>
          <StudentGroupSelector
            label=""
            group={pairing.group_primary}
            availableYearLevels={availableOptions.yearLevels}
            availableSemesters={getAvailableSemestersForYear(
              pairing.group_primary.year_level,
              availableOptions.semesters,
            )}
            availablePrograms={getAvailableProgramsForYear(
              pairing.group_primary.year_level,
              availableOptions.programs,
            )}
            availableSpecializations={getAvailableSpecializationsForYear(
              pairing.group_primary.year_level,
              pairing.group_primary.program,
            )}
            onYearChange={(value) => handleYearChange("group_primary", value)}
            onSemesterChange={(value) => handleFieldChange("group_primary", "sem", value)}
            onProgramChange={(value) => handleFieldChange("group_primary", "program", value)}
            onSpecializationChange={(value) => handleFieldChange("group_primary", "specialization", value)}
            studentCount={pairing.students_primary}
            onStudentCountChange={(value) => handleStudentCountChange("students_primary", value)}
          />
        </div>

        {/* Secondary Group */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Secondary Group</span>
            <RemainingBadge remaining={secondaryRemaining} />
          </div>
          <StudentGroupSelector
            label=""
            group={pairing.group_secondary}
            availableYearLevels={availableOptions.yearLevels}
            availableSemesters={getAvailableSemestersForYear(
              pairing.group_secondary.year_level,
              availableOptions.semesters,
            )}
            availablePrograms={getAvailableProgramsForYear(
              pairing.group_secondary.year_level,
              availableOptions.programs,
            )}
            availableSpecializations={getAvailableSpecializationsForYear(
              pairing.group_secondary.year_level,
              pairing.group_secondary.program,
            )}
            onYearChange={(value) => handleYearChange("group_secondary", value)}
            onSemesterChange={(value) => handleFieldChange("group_secondary", "sem", value)}
            onProgramChange={(value) => handleFieldChange("group_secondary", "program", value)}
            onSpecializationChange={(value) => handleFieldChange("group_secondary", "specialization", value)}
            studentCount={pairing.students_secondary}
            onStudentCountChange={(value) => handleStudentCountChange("students_secondary", value)}
            disabledProgram={
              pairing.group_primary.year_level === pairing.group_secondary.year_level &&
              pairing.group_primary.sem === pairing.group_secondary.sem
                ? pairing.group_primary.program
                : undefined
            }
          />
        </div>

        {/* Warnings */}
        {exceedsCapacity && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Exceeds room capacity!</span>
          </div>
        )}
        {isDuplicateGroup && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Warning: Same student group assigned twice!</span>
          </div>
        )}
      </div>
    </Card>
  );
};

// ─────────────────────────────────────────────
// StudentStatisticsCard
// ─────────────────────────────────────────────

interface StudentStatisticsCardProps {
  studentStats: StudentStats | null;
  rawGroups: DBStudentGroup[];
  loading: boolean;
}

export const StudentStatisticsCard: React.FC<StudentStatisticsCardProps> = ({
  studentStats,
  rawGroups,
  loading,
}) => {
  if (loading) {
    return (
      <Card className="p-6 mb-6 border border-green-200">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <span className="ml-3 text-gray-600">Loading student statistics...</span>
        </div>
      </Card>
    );
  }

  if (!studentStats) return null;

  // Derive year-level cards dynamically from rawGroups + byGroup map
  const yearLevels = [...new Set(rawGroups.map((g) => g.year_level))].sort((a, b) => a - b);

  const YEAR_NAMES: Record<number, string> = {
    1: "First Year", 2: "Second Year", 3: "Third Year",
    4: "Fourth Year", 5: "Fifth Year", 6: "Sixth Year",
  };

  const totalAssigned = Array.from(studentStats.byGroup.values()).reduce(
    (sum, v) => sum + v.assigned, 0,
  );
  const totalUnassigned = Array.from(studentStats.byGroup.values()).reduce(
    (sum, v) => sum + (v.total - v.assigned), 0,
  );
  const progressPercent = studentStats.total > 0
    ? Math.round((totalAssigned / studentStats.total) * 100)
    : 0;

  return (
    <Card className="p-6 mb-6 border border-green-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">Student Statistics</h3>
        <Badge variant="outline" className="ml-auto border-green-300 text-green-700 bg-green-50">
          Total: {studentStats.total} students
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Assignment Progress</span>
          <span className="font-semibold text-green-700">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-green-100">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-6 mt-2 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <span className="text-gray-600">Assigned: <span className="font-semibold text-green-700">{totalAssigned}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-gray-600">Unassigned: <span className="font-semibold text-orange-600">{totalUnassigned}</span></span>
          </div>
        </div>
      </div>

      {/* Bullet list grouped by year → program → sem/spec */}
      <div className="border-t border-green-100 pt-4 columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-0">
        {yearLevels.map((year) => {
          const yearGroups = rawGroups.filter((g) => g.year_level === year);
          const programs = [...new Set(yearGroups.map((g) => g.major))].sort();

          return (
            <div key={year} className="break-inside-avoid mb-4">
              {/* Year heading */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-semibold text-gray-800">
                  {YEAR_NAMES[year] ?? `Year ${year}`}
                </span>
                <span className="text-xs text-gray-400">
                  ({yearGroups.reduce((sum, g) => {
                    const d = studentStats.byGroup.get(groupKey(g.year_level, g.sem, g.major, g.specialization));
                    return sum + (d?.total ?? 0);
                  }, 0)} students)
                </span>
              </div>

              <ul className="space-y-0.5 pl-1">
                {programs.map((program) => {
                  const programGroups = yearGroups.filter((g) => g.major === program);
                  const sems = [...new Set(programGroups.map((g) => g.sem))].sort((a, b) => a - b);

                  return (
                    <li key={program}>
                      {/* Program label — only show if >1 program in this year */}
                      {programs.length > 1 && (
                        <p className="text-xs font-medium text-gray-500 mt-1 mb-0.5 pl-3">
                          {program}
                        </p>
                      )}
                      <ul className="space-y-0.5">
                        {sems.map((sem) => {
                          const semGroups = programGroups.filter((g) => g.sem === sem);
                          const specs = [...new Set(semGroups.map((g) => g.specialization))].sort();

                          return specs.map((spec) => {
                            const data = studentStats.byGroup.get(groupKey(year, sem, program, spec));
                            if (!data || data.total === 0) return null;
                            const unassigned = data.total - data.assigned;
                            return (
                              <li
                                key={`${sem}-${spec}`}
                                className="flex items-center justify-between text-xs py-0.5 pl-5 pr-1 rounded hover:bg-green-50"
                              >
                                <span className="flex items-center gap-1.5 text-gray-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block flex-shrink-0" />
                                  Sem {sem}{spec !== program ? ` · ${spec}` : ""}
                                </span>
                                <span className="flex items-center gap-2 tabular-nums">
                                  <span className="text-green-700 font-medium">{data.assigned} assigned</span>
                                  <span className="text-gray-300">|</span>
                                  <span className={unassigned > 0 ? "text-orange-500 font-medium" : "text-gray-400"}>
                                    {unassigned} left
                                  </span>
                                </span>
                              </li>
                            );
                          });
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ─────────────────────────────────────────────
// StudentPairingStep
// ─────────────────────────────────────────────

const MAX_ROOM_CAPACITY = 36;

const getTotalPreAssignedForGroup = (
  group: StudentGroup,
  allPairings: RoomPairing[],
): number => {
  if (!group.year_level || !group.sem || !group.program || !group.specialization) return 0;

  return allPairings.reduce((total, pairing) => {
    let count = 0;
    if (
      pairing.group_primary.year_level === group.year_level &&
      pairing.group_primary.sem === group.sem &&
      pairing.group_primary.program === group.program &&
      pairing.group_primary.specialization === group.specialization
    ) {
      count += pairing.students_primary || 0;
    }
    if (
      pairing.group_secondary.year_level === group.year_level &&
      pairing.group_secondary.sem === group.sem &&
      pairing.group_secondary.program === group.program &&
      pairing.group_secondary.specialization === group.specialization
    ) {
      count += pairing.students_secondary || 0;
    }
    return total + count;
  }, 0);
};

interface StudentPairingStepProps {
  roomPairings: RoomPairing[];
  availableOptions: {
    yearLevels: string[];
    semesters: string[];
    programs: string[];
    specializations: string[];
  };
  onUpdatePairing: (id: string, field: keyof RoomPairing, value: any) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  studentStats: StudentStats | null;
  groupCounts: Map<string, number>;
  getAvailableSemestersForYear: (yearLevel: string, allSemesters: string[]) => string[];
  getAvailableProgramsForYear: (yearLevel: string, allPrograms: string[]) => string[];
  getAvailableSpecializationsForYear: (yearLevel: string, program?: string) => string[];
  getDefaultGroupValues: (yearLevel: string) => Pick<StudentGroup, "sem" | "program" | "specialization">;
  getUnassignedCountForGroup: (group: StudentGroup) => number;
  getTotalAssignedForGroup: (group: StudentGroup, allPairings: RoomPairing[], excludePairingId?: string) => number;
}

export const StudentPairingStep: React.FC<StudentPairingStepProps> = ({
  roomPairings,
  availableOptions,
  onUpdatePairing,
  onBack,
  onSave,
  isSaving,
  studentStats,
  groupCounts,
  getAvailableSemestersForYear,
  getAvailableProgramsForYear,
  getAvailableSpecializationsForYear,
  getDefaultGroupValues,
  getUnassignedCountForGroup,
  getTotalAssignedForGroup,
}) => {
  const totalStudents = roomPairings.reduce(
    (sum, pairing) => sum + (pairing.students_primary || 0) + (pairing.students_secondary || 0),
    0,
  );

  const roomsOverCapacity = roomPairings.filter(
    (pairing) =>
      (pairing.students_primary || 0) + (pairing.students_secondary || 0) > MAX_ROOM_CAPACITY,
  );

  const exceedsMaximum = roomsOverCapacity.length > 0;

  type GroupSummary = {
    label: string;
    unassignedInDB: number;
    preAssigned: number;
    remaining: number;
  };

  const groupSummaryMap = new Map<string, GroupSummary>();

  roomPairings.forEach((pairing) => {
    [
      { group: pairing.group_primary, students: pairing.students_primary || 0 },
      { group: pairing.group_secondary, students: pairing.students_secondary || 0 },
    ].forEach(({ group }) => {
      if (!group.year_level || !group.sem || !group.program || !group.specialization) return;

      const key = `${group.year_level}|${group.sem}|${group.program}|${group.specialization}`;
      if (!groupSummaryMap.has(key)) {
        const unassignedInDB = getUnassignedCountForGroup(group);
        const preAssigned = getTotalPreAssignedForGroup(group, roomPairings);
        groupSummaryMap.set(key, {
          label: `Year ${group.year_level} Sem ${group.sem} - ${group.program} ${group.specialization}`,
          unassignedInDB,
          preAssigned,
          remaining: unassignedInDB - preAssigned,
        });
      }
    });
  });

  const groupSummaries = Array.from(groupSummaryMap.values());

  return (
    <div className="space-y-6">
      {/* Pre-assignment Summary Panel */}
      {groupSummaries.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-3">Pre-Assignment Summary</h3>
          <div className="space-y-2">
            {groupSummaries.map((summary, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm py-2 border-b last:border-0"
              >
                <span className="font-medium text-gray-700">{summary.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">
                    Unassigned (DB):{" "}
                    <span className="font-medium text-gray-800">{summary.unassignedInDB}</span>
                  </span>
                  <span className="text-blue-600">
                    Pre-assigned:{" "}
                    <span className="font-semibold">{summary.preAssigned}</span>
                  </span>
                  <span
                    className={
                      summary.remaining < 0
                        ? "text-red-600 font-semibold"
                        : summary.remaining === 0
                          ? "text-green-600 font-semibold"
                          : "text-orange-600 font-semibold"
                    }
                  >
                    Remaining: {summary.remaining}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Room & Student Group Pairing</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {roomPairings.length} room{roomPairings.length !== 1 ? "s" : ""}
            </Badge>
            <Badge variant={exceedsMaximum ? "destructive" : "secondary"}>
              {totalStudents} students total
            </Badge>
          </div>
        </div>

        {exceedsMaximum && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              ⚠️ The following room(s) exceed the {MAX_ROOM_CAPACITY}-student capacity limit:{" "}
              {roomsOverCapacity
                .map(
                  (p) =>
                    `${p.room.room_number} (${(p.students_primary || 0) + (p.students_secondary || 0)} students)`,
                )
                .join(", ")}
              . Please reduce the number of students per room.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {roomPairings.map((pairing) => (
            <RoomPairingCard
              key={pairing.id}
              pairing={pairing}
              availableOptions={availableOptions}
              onUpdate={onUpdatePairing}
              getAvailableSemestersForYear={getAvailableSemestersForYear}
              getAvailableProgramsForYear={getAvailableProgramsForYear}
              getAvailableSpecializationsForYear={getAvailableSpecializationsForYear}
              getDefaultGroupValues={getDefaultGroupValues}
              getPrimaryRemaining={() => {
                const g = pairing.group_primary;
                if (!g.year_level || !g.sem || !g.program || !g.specialization) return null;
                const dbUnassigned = getUnassignedCountForGroup(g);
                const otherPreAssigned = getTotalAssignedForGroup(g, roomPairings, pairing.id);
                return dbUnassigned - otherPreAssigned - (pairing.students_primary || 0);
              }}
              getSecondaryRemaining={() => {
                const g = pairing.group_secondary;
                if (!g.year_level || !g.sem || !g.program || !g.specialization) return null;
                const dbUnassigned = getUnassignedCountForGroup(g);
                const otherPreAssigned = getTotalAssignedForGroup(g, roomPairings, pairing.id);
                return dbUnassigned - otherPreAssigned - (pairing.students_secondary || 0);
              }}
            />
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onBack} className="flex-1" disabled={isSaving}>
            Back
          </Button>
          <Button onClick={onSave} className="flex-1" disabled={isSaving || exceedsMaximum}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Assignment"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};