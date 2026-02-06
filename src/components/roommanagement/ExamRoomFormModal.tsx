import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  getAllRooms,
  getAvailableRooms,
  type Room,
} from "@/services/Roomqueries";
import {
  type ExamRoomInsert,
  type ExamRoomWithDetails,
} from "@/services/examroomQueries";
import StudentGroupSelector from "../roomassign/Studentgroupselector";

interface ExamRoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExamRoomInsert) => void;
  mode: "create" | "edit";
  initialData?: ExamRoomWithDetails | null;
}

interface StudentGroup {
  year_level: string;
  sem: string;
  program: string;
  specialization: string;
}

// Specialization options per year level
const SPECIALIZATION_OPTIONS: Record<string, string[]> = {
  "1": ["CST"],
  "2": ["CST"],
  "3": ["CS", "CT"],
  "4": ["SE", "KE", "HPC", "BIS", "CN", "ES", "CSEC"],
};

// Program-to-Specialization mapping for Year 4
const PROGRAM_SPECIALIZATION_MAP: Record<string, string[]> = {
  "Computer Science": ["SE", "KE", "HPC", "BIS"],
  "Computer Technology": ["CN", "ES", "CSEC"],
};

// Default semester per year level
const YEAR_SEMESTER_MAP: Record<string, string> = {
  "1": "1",
  "2": "1",
  "3": "1",
  "4": "1",
};

// Available programs per year level
const YEAR_PROGRAM_MAP: Record<string, string[]> = {
  "1": ["Computer Science and Technology"],
  "2": ["Computer Science and Technology"],
  "3": ["Computer Science", "Computer Technology"],
  "4": ["Computer Science", "Computer Technology"],
};

// Get default values when year level is selected
const getDefaultGroupValues = (
  yearLevel: string,
): Pick<StudentGroup, "sem" | "program" | "specialization"> => {
  const sem = YEAR_SEMESTER_MAP[yearLevel] || "";
  const programs = YEAR_PROGRAM_MAP[yearLevel] || [];
  const program = programs.length === 1 ? programs[0] : "";

  let specialization = "";

  if (yearLevel === "1" || yearLevel === "2") {
    specialization = "CST";
  } else if (yearLevel === "3" && program) {
    specialization = program === "Computer Science" ? "CS" : "CT";
  }

  return { sem, program, specialization };
};

// Get available semesters for a year level
const getAvailableSemestersForYear = (
  yearLevel: string,
  allSemesters: string[],
): string[] => {
  if (!yearLevel) return allSemesters;

  if (yearLevel === "4") {
    return ["1", "2"];
  }

  const sem = YEAR_SEMESTER_MAP[yearLevel];
  return sem ? [sem] : allSemesters;
};

// Get available programs for a year level
const getAvailableProgramsForYear = (
  yearLevel: string,
  allPrograms: string[],
): string[] => {
  if (!yearLevel) return allPrograms;
  return YEAR_PROGRAM_MAP[yearLevel] || allPrograms;
};

// Get available specializations for a year level and program
const getAvailableSpecializationsForYear = (
  yearLevel: string,
  program?: string,
): string[] => {
  if (!yearLevel) return [];

  if (yearLevel === "4" && program) {
    return PROGRAM_SPECIALIZATION_MAP[program] || [];
  }

  return SPECIALIZATION_OPTIONS[yearLevel] || [];
};

const ExamRoomFormModal: React.FC<ExamRoomFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
}) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number>(0);

  const [primaryGroup, setPrimaryGroup] = useState<StudentGroup>({
    year_level: "",
    sem: "",
    program: "",
    specialization: "",
  });

  const [secondaryGroup, setSecondaryGroup] = useState<StudentGroup>({
    year_level: "",
    sem: "",
    program: "",
    specialization: "",
  });

  const [studentsPrimary, setStudentsPrimary] = useState(18);
  const [studentsSecondary, setStudentsSecondary] = useState(18);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Available options
  const availableOptions = {
    yearLevels: ["1", "2", "3", "4"],
    semesters: ["1", "2"],
    programs: [
      "Computer Science and Technology",
      "Computer Science",
      "Computer Technology",
    ],
    specializations: [
      "CST",
      "CS",
      "CT",
      "SE",
      "KE",
      "HPC",
      "BIS",
      "CN",
      "ES",
      "CSEC",
    ],
  };

  useEffect(() => {
    if (isOpen) {
      loadRooms();
      if (mode === "edit" && initialData) {
        setSelectedRoomId(initialData.room_id);
        setPrimaryGroup({
          year_level: initialData.year_level_primary || "",
          sem: initialData.sem_primary || "",
          program: initialData.program_primary || "",
          specialization: initialData.specialization_primary || "",
        });
        setSecondaryGroup({
          year_level: initialData.year_level_secondary || "",
          sem: initialData.sem_secondary || "",
          program: initialData.program_secondary || "",
          specialization: initialData.specialization_secondary || "",
        });
        setStudentsPrimary(initialData.students_primary || 18);
        setStudentsSecondary(initialData.students_secondary || 18);
      } else {
        resetForm();
      }
      setErrors({});
    }
  }, [isOpen, mode, initialData]);

  const resetForm = () => {
    setSelectedRoomId(0);
    setPrimaryGroup({
      year_level: "",
      sem: "",
      program: "",
      specialization: "",
    });
    setSecondaryGroup({
      year_level: "",
      sem: "",
      program: "",
      specialization: "",
    });
    setStudentsPrimary(18);
    setStudentsSecondary(18);
  };

  const loadRooms = async () => {
    try {
      const roomData =
        mode === "create" ? await getAvailableRooms() : await getAllRooms();
      setRooms(roomData);
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
  };

  // Primary group handlers
  const handlePrimaryYearChange = (value: string) => {
    const defaults = getDefaultGroupValues(value);
    setPrimaryGroup({
      year_level: value,
      ...defaults,
    });
  };

  const handlePrimarySemesterChange = (value: string) => {
    setPrimaryGroup((prev) => ({ ...prev, sem: value }));
  };

  const handlePrimaryProgramChange = (value: string) => {
    const newSpec =
      value === "Computer Science"
        ? "CS"
        : value === "Computer Technology"
          ? "CT"
          : value === "Computer Science and Technology"
            ? "CST"
            : "";

    setPrimaryGroup((prev) => ({
      ...prev,
      program: value,
      specialization: prev.year_level === "4" ? "" : newSpec,
    }));
  };

  const handlePrimarySpecializationChange = (value: string) => {
    setPrimaryGroup((prev) => ({ ...prev, specialization: value }));
  };

  // Secondary group handlers
  const handleSecondaryYearChange = (value: string) => {
    const defaults = getDefaultGroupValues(value);
    setSecondaryGroup({
      year_level: value,
      ...defaults,
    });
  };

  const handleSecondarySemesterChange = (value: string) => {
    setSecondaryGroup((prev) => ({ ...prev, sem: value }));
  };

  const handleSecondaryProgramChange = (value: string) => {
    const newSpec =
      value === "Computer Science"
        ? "CS"
        : value === "Computer Technology"
          ? "CT"
          : value === "Computer Science and Technology"
            ? "CST"
            : "";

    setSecondaryGroup((prev) => ({
      ...prev,
      program: value,
      specialization: prev.year_level === "4" ? "" : newSpec,
    }));
  };

  const handleSecondarySpecializationChange = (value: string) => {
    setSecondaryGroup((prev) => ({ ...prev, specialization: value }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedRoomId || selectedRoomId === 0) {
      newErrors.room_id = "Please select a room";
    }

    // Primary group validation
    if (!primaryGroup.year_level) {
      newErrors.year_level_primary = "Primary year level is required";
    }
    if (!primaryGroup.sem) {
      newErrors.sem_primary = "Primary semester is required";
    }
    if (!primaryGroup.program) {
      newErrors.program_primary = "Primary program is required";
    }
    if (!primaryGroup.specialization) {
      newErrors.specialization_primary = "Primary specialization is required";
    }

    // Secondary group validation
    if (!secondaryGroup.year_level) {
      newErrors.year_level_secondary = "Secondary year level is required";
    }
    if (!secondaryGroup.sem) {
      newErrors.sem_secondary = "Secondary semester is required";
    }
    if (!secondaryGroup.program) {
      newErrors.program_secondary = "Secondary program is required";
    }
    if (!secondaryGroup.specialization) {
      newErrors.specialization_secondary =
        "Secondary specialization is required";
    }

    // Capacity validation
    const totalStudents = studentsPrimary + studentsSecondary;
    if (totalStudents > 36) {
      newErrors.capacity = "Total students cannot exceed 36";
    }
    if (totalStudents === 0) {
      newErrors.capacity = "Total students must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create") {
      // Redirect to room assignment page when creating
      navigate("/exam-officer/room-assignment");
      onClose();
      return;
    }

    if (!validate()) return;

    const formData: ExamRoomInsert = {
      room_id: selectedRoomId,
      assigned_capacity: studentsPrimary + studentsSecondary,
      year_level_primary: primaryGroup.year_level,
      sem_primary: primaryGroup.sem,
      program_primary: primaryGroup.program,
      specialization_primary: primaryGroup.specialization,
      students_primary: studentsPrimary,
      year_level_secondary: secondaryGroup.year_level,
      sem_secondary: secondaryGroup.sem,
      program_secondary: secondaryGroup.program,
      specialization_secondary: secondaryGroup.specialization,
      students_secondary: studentsSecondary,
    };

    onSubmit(formData);
  };

  if (!isOpen) return null;

  const selectedRoom = rooms.find((r) => r.room_id === selectedRoomId);
  const totalStudents = studentsPrimary + studentsSecondary;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">
            {mode === "create"
              ? "Add Exam Room Assignment"
              : "Edit Exam Room Assignment"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Room Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.room_id ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value={0}>Select a room</option>
              {rooms.map((room) => (
                <option key={room.room_id} value={room.room_id}>
                  {room.room_number} (Capacity: {room.capacity})
                </option>
              ))}
            </select>
            {errors.room_id && (
              <p className="text-red-500 text-sm mt-1">{errors.room_id}</p>
            )}
            {selectedRoom && (
              <p className="text-sm text-gray-600 mt-1">
                Room capacity: {selectedRoom.capacity} | Current assignment:{" "}
                {totalStudents} / 36
              </p>
            )}
          </div>

          {/* Primary Group */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <StudentGroupSelector
              label="Primary Group"
              group={primaryGroup}
              availableYearLevels={availableOptions.yearLevels}
              availableSemesters={getAvailableSemestersForYear(
                primaryGroup.year_level,
                availableOptions.semesters,
              )}
              availablePrograms={getAvailableProgramsForYear(
                primaryGroup.year_level,
                availableOptions.programs,
              )}
              availableSpecializations={getAvailableSpecializationsForYear(
                primaryGroup.year_level,
                primaryGroup.program,
              )}
              onYearChange={handlePrimaryYearChange}
              onSemesterChange={handlePrimarySemesterChange}
              onProgramChange={handlePrimaryProgramChange}
              onSpecializationChange={handlePrimarySpecializationChange}
              studentCount={studentsPrimary}
            />
            {Object.keys(errors).some((key) => key.includes("primary")) && (
              <div className="mt-2 text-red-500 text-sm">
                {Object.entries(errors)
                  .filter(([key]) => key.includes("primary"))
                  .map(([, value]) => value)
                  .join(", ")}
              </div>
            )}
          </div>

          {/* Secondary Group */}
          <div className="border rounded-lg p-4 bg-green-50">
            <StudentGroupSelector
              label="Secondary Group"
              group={secondaryGroup}
              availableYearLevels={availableOptions.yearLevels}
              availableSemesters={getAvailableSemestersForYear(
                secondaryGroup.year_level,
                availableOptions.semesters,
              )}
              availablePrograms={getAvailableProgramsForYear(
                secondaryGroup.year_level,
                availableOptions.programs,
              )}
              availableSpecializations={getAvailableSpecializationsForYear(
                secondaryGroup.year_level,
                secondaryGroup.program,
              )}
              onYearChange={handleSecondaryYearChange}
              onSemesterChange={handleSecondarySemesterChange}
              onProgramChange={handleSecondaryProgramChange}
              onSpecializationChange={handleSecondarySpecializationChange}
              studentCount={studentsSecondary}
              disabledProgram={primaryGroup.program}
            />
            {Object.keys(errors).some((key) => key.includes("secondary")) && (
              <div className="mt-2 text-red-500 text-sm">
                {Object.entries(errors)
                  .filter(([key]) => key.includes("secondary"))
                  .map(([, value]) => value)
                  .join(", ")}
              </div>
            )}
          </div>

          {/* Capacity Error */}
          {errors.capacity && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {errors.capacity}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white border-t -mx-6 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {mode === "create" ? "Create Assignment" : "Update Assignment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExamRoomFormModal;
