// services/dynamicSeatingAlgorithm.ts

/**
 * Static Pattern Seating Assignment Algorithm
 * Uses predefined patterns for Group A and Group B
 */

interface Student {
  student_id: number;
  student_number: string;
  name: string;
  year_level: number;
  retake: boolean;
  major?: string | null;
  sem?: number | null;
  specialization?: string | null;
  is_assigned?: boolean;
  id?: number;
}

interface SeatingAssignment {
  exam_room_id: number;
  student_id: number;
  seat_number: string;
  row_label: string;
  column_number: number;
}

interface SeatingGrid {
  grid: (Student | null)[][];
  assignments: SeatingAssignment[];
  rowLabels: string[];
}

/**
 * Static seating patterns for groups A and B
 * Pattern format: "RowColumn" (e.g., "A1", "B2", "C3")
 */
const SEATING_PATTERNS = {
  groupA: [
    "A1",
    "B2",
    "C1",
    "D2",
    "E1",
    "F2",
    "F4",
    "E3",
    "D4",
    "C3",
    "B4",
    "A3",
    "A6",
    "B5",
    "C6",
    "D5",
    "E6",
    "F5",
  ],
  groupB: [
    "A2",
    "B1",
    "C2",
    "D1",
    "E2",
    "F1",
    "F3",
    "E4",
    "D3",
    "C4",
    "B3",
    "A4",
    "A5",
    "B6",
    "C5",
    "D6",
    "E5",
    "F6",
  ],
};

/**
 * Parse seat position string into row and column
 * @param seatPosition - Format: "A1", "B2", etc.
 * @returns Object with rowLabel and columnNumber
 */
function parseSeatPosition(seatPosition: string): {
  rowLabel: string;
  columnNumber: number;
} {
  const rowLabel = seatPosition.charAt(0);
  const columnNumber = parseInt(seatPosition.slice(1));
  return { rowLabel, columnNumber };
}

/**
 * Get row index from row label
 * @param rowLabel - Single character row label (A, B, C, etc.)
 * @returns Zero-based row index
 */
function getRowIndex(rowLabel: string): number {
  return rowLabel.charCodeAt(0) - "A".charCodeAt(0);
}

/**
 * Main static pattern seating assignment algorithm
 * @param groupA - First group of students
 * @param groupB - Second group of students
 * @param colsPerRow - Total columns per row
 * @param rows - Number of rows
 * @param examRoomId - Exam room identifier
 * @returns Seating grid and assignments
 */
export function dynamicSeatingAssignment(
  groupA: Student[],
  groupB: Student[],
  colsPerRow: number,
  rows: number | null,
  examRoomId: number,
): SeatingGrid {
  // Use default 6 rows if not specified
  const maxRows = rows ?? 6;

  // Generate row labels
  const rowLabels = "ABCDEFGHIJKLMNOPQRST".split("").slice(0, maxRows);

  // Initialize grid
  const grid: (Student | null)[][] = Array(maxRows)
    .fill(null)
    .map(() => Array(colsPerRow).fill(null));

  const assignments: SeatingAssignment[] = [];

  // Assign Group A students to their pattern
  const groupAPattern = SEATING_PATTERNS.groupA;
  const studentsToAssignA = Math.min(groupA.length, groupAPattern.length);

  for (let i = 0; i < studentsToAssignA; i++) {
    const student = groupA[i];
    const seatPosition = groupAPattern[i];
    const { rowLabel, columnNumber } = parseSeatPosition(seatPosition);
    const rowIndex = getRowIndex(rowLabel);
    const colIndex = columnNumber - 1; // Convert to 0-based index

    // Place student in grid
    grid[rowIndex][colIndex] = student;

    // Create assignment
    assignments.push({
      exam_room_id: examRoomId,
      student_id: student.student_id,
      seat_number: seatPosition,
      row_label: rowLabel,
      column_number: columnNumber,
    });
  }

  // Assign Group B students to their pattern
  const groupBPattern = SEATING_PATTERNS.groupB;
  const studentsToAssignB = Math.min(groupB.length, groupBPattern.length);

  for (let i = 0; i < studentsToAssignB; i++) {
    const student = groupB[i];
    const seatPosition = groupBPattern[i];
    const { rowLabel, columnNumber } = parseSeatPosition(seatPosition);
    const rowIndex = getRowIndex(rowLabel);
    const colIndex = columnNumber - 1; // Convert to 0-based index

    // Place student in grid
    grid[rowIndex][colIndex] = student;

    // Create assignment
    assignments.push({
      exam_room_id: examRoomId,
      student_id: student.student_id,
      seat_number: seatPosition,
      row_label: rowLabel,
      column_number: columnNumber,
    });
  }

  return {
    grid,
    assignments,
    rowLabels: rowLabels.slice(0, grid.length),
  };
}

/**
 * Utility function to print the seating grid (for debugging/testing)
 */
export function printSeatingGrid(result: SeatingGrid): void {
  console.log("\n=== SEATING ARRANGEMENT ===\n");

  // Print column headers
  const colHeaders = Array.from(
    { length: result.grid[0]?.length || 0 },
    (_, i) => `Col${i + 1}`,
  ).join("\t");
  console.log(`Row\t${colHeaders}`);
  console.log("-".repeat(80));

  // Print each row
  result.grid.forEach((row, rowIndex) => {
    const rowLabel = result.rowLabels[rowIndex];
    const seats = row
      .map((student) => {
        if (!student) return "EMPTY";
        // Show student number and indicate group
        const groupIndicator = SEATING_PATTERNS.groupA.some((pos) => {
          const parsed = parseSeatPosition(pos);
          return (
            parsed.rowLabel === rowLabel &&
            parsed.columnNumber === row.indexOf(student) + 1
          );
        })
          ? "(A)"
          : "(B)";
        return `${student.student_number}${groupIndicator}`;
      })
      .join("\t");
    console.log(`${rowLabel}\t${seats}`);
  });

  console.log("\n=== STATISTICS ===");
  console.log(`Total seats: ${result.assignments.length}`);
  console.log(`Total rows used: ${result.grid.length}`);
  console.log(`Seats per row: ${result.grid[0]?.length || 0}`);
}

/**
 * Validate the seating arrangement against the static patterns
 */
export function validateSeatingArrangement(
  result: SeatingGrid,
  groupAStudentIds: Set<number>,
  groupBStudentIds: Set<number>,
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check that Group A students are in Group A pattern positions
  result.assignments.forEach((assignment) => {
    const isGroupA = groupAStudentIds.has(assignment.student_id);
    const seatPosition = assignment.seat_number;

    const shouldBeGroupA = SEATING_PATTERNS.groupA.includes(seatPosition);
    const shouldBeGroupB = SEATING_PATTERNS.groupB.includes(seatPosition);

    if (isGroupA && !shouldBeGroupA) {
      errors.push(
        `Student ${assignment.student_id} from Group A assigned to Group B position ${seatPosition}`,
      );
    }

    if (!isGroupA && !shouldBeGroupB) {
      errors.push(
        `Student ${assignment.student_id} from Group B assigned to Group A position ${seatPosition}`,
      );
    }
  });

  // Check for duplicate assignments
  const seatNumbers = result.assignments.map((a) => a.seat_number);
  const duplicates = seatNumbers.filter(
    (seat, index) => seatNumbers.indexOf(seat) !== index,
  );

  if (duplicates.length > 0) {
    errors.push(`Duplicate seat assignments found: ${duplicates.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert student number strings to Student objects (helper for testing)
 */
export function createStudentFromNumber(
  studentNumber: string,
  index: number,
): Student {
  return {
    student_id: parseInt(studentNumber.replace(/\D/g, "")) || index,
    student_number: studentNumber,
    name: `Student ${studentNumber}`,
    year_level: 1,
    retake: false,
    sem: 1,
    major: "Computer Science",
  };
}

/**
 * Example usage function
 */
export function exampleUsage(): void {
  // Create sample groups with realistic student numbers
  const groupA = Array.from({ length: 18 }, (_, i) =>
    createStudentFromNumber(`TNT-22${String(i).padStart(2, "0")}`, i),
  );

  const groupB = Array.from({ length: 18 }, (_, i) =>
    createStudentFromNumber(`TNT-23${String(i).padStart(2, "0")}`, 100 + i),
  );

  // Run algorithm
  const result = dynamicSeatingAssignment(
    groupA,
    groupB,
    6, // 6 columns per row
    6, // 6 rows (A-F)
    1, // exam_room_id
  );

  // Print results
  printSeatingGrid(result);

  // Validate
  const groupAIds = new Set(groupA.map((s) => s.student_id));
  const groupBIds = new Set(groupB.map((s) => s.student_id));
  const validation = validateSeatingArrangement(result, groupAIds, groupBIds);

  console.log("\n=== VALIDATION ===");
  console.log(`Valid: ${validation.valid}`);
  if (!validation.valid) {
    console.log("Errors:");
    validation.errors.forEach((err) => console.log(`  - ${err}`));
  }

  console.log("\n=== PATTERN VERIFICATION ===");
  console.log("Group A Pattern:", SEATING_PATTERNS.groupA.join(" → "));
  console.log("Group B Pattern:", SEATING_PATTERNS.groupB.join(" → "));
}

export type { Student, SeatingAssignment, SeatingGrid };
