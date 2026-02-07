// services/dynamicSeatingAlgorithm.ts

/**
 * Dynamic Seating Assignment Algorithm
 * Implements pair mixing, zig-zag alternation, and band-based spreading
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
 * Extract students from bands (start, middle, end) to spread roll numbers
 * @param students - Available students
 * @param bandCount - Number of bands to create (equals pairs per row)
 * @returns Array of students, one from each band
 */
function extractFromBands(students: Student[], bandCount: number): Student[] {
  if (students.length === 0) return [];
  if (students.length <= bandCount) {
    // Not enough students for all bands, return what we have
    return students.splice(0, students.length);
  }

  const selected: Student[] = [];
  const bandSize = Math.floor(students.length / bandCount);

  for (let i = 0; i < bandCount; i++) {
    // Calculate band position
    let index: number;

    if (i === 0) {
      // Band 0: start of list
      index = 0;
    } else if (i === bandCount - 1) {
      // Last band: end of list
      index = students.length - 1;
    } else {
      // Middle bands: evenly distributed
      const position = (students.length - 1) * (i / (bandCount - 1));
      index = Math.round(position);
    }

    // Ensure index is valid after previous removals
    index = Math.min(index, students.length - 1);

    // Extract student and remove from available list
    const student = students.splice(index, 1)[0];
    selected.push(student);
  }

  return selected;
}

/**
 * Determine which group a student belongs to based on metadata
 * Used to distinguish between primary and secondary groups
 */
function getStudentGroup(student: Student, groupIdentifier: "A" | "B"): string {
  return groupIdentifier;
}

/**
 * Main dynamic seating assignment algorithm
 * @param groupA - First group of students (e.g., primary group)
 * @param groupB - Second group of students (e.g., secondary group)
 * @param colsPerRow - Total columns per row (must be even)
 * @param rows - Number of rows (if null, generates until students finish)
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
  // Validate inputs
  if (colsPerRow % 2 !== 0) {
    throw new Error("colsPerRow must be even");
  }

  const pairCount = colsPerRow / 2;

  // Create working copies of student lists with group markers
  const availableA = [...groupA].map((s) => ({ ...s, _group: "A" as const }));
  const availableB = [...groupB].map((s) => ({ ...s, _group: "B" as const }));

  // Calculate required rows if not specified
  const totalStudents = groupA.length + groupB.length;
  const maxRows = rows ?? Math.ceil(totalStudents / colsPerRow);

  // Generate row labels
  const rowLabels = "ABCDEFGHIJKLMNOPQRST".split("").slice(0, maxRows);

  // Initialize grid
  const grid: (Student | null)[][] = Array(maxRows)
    .fill(null)
    .map(() => Array(colsPerRow).fill(null));

  const assignments: SeatingAssignment[] = [];

  // Fill each row
  for (let r = 0; r < maxRows; r++) {
    // Stop if both groups are exhausted
    if (availableA.length === 0 && availableB.length === 0) {
      break;
    }

    // Determine if this is an even or odd row (0-based)
    const isEvenRow = r % 2 === 0;

    // Extract students from bands
    const studentsA = extractFromBands(availableA, pairCount);
    const studentsB = extractFromBands(availableB, pairCount);

    // Fill the row by pairs
    for (let pairIndex = 0; pairIndex < pairCount; pairIndex++) {
      const col1 = pairIndex * 2; // First column of pair (0, 2, 4, ...)
      const col2 = pairIndex * 2 + 1; // Second column of pair (1, 3, 5, ...)

      const studentA = studentsA[pairIndex];
      const studentB = studentsB[pairIndex];

      if (isEvenRow) {
        // Even row: groupA in odd-indexed columns (1, 3, 5), groupB in even-indexed (0, 2, 4)
        // col1 (even index) gets groupB
        if (studentB) {
          grid[r][col1] = studentB;
          assignments.push({
            exam_room_id: examRoomId,
            student_id: studentB.student_id,
            seat_number: `${rowLabels[r]}${col1 + 1}`,
            row_label: rowLabels[r],
            column_number: col1 + 1,
          });
        }

        // col2 (odd index) gets groupA
        if (studentA) {
          grid[r][col2] = studentA;
          assignments.push({
            exam_room_id: examRoomId,
            student_id: studentA.student_id,
            seat_number: `${rowLabels[r]}${col2 + 1}`,
            row_label: rowLabels[r],
            column_number: col2 + 1,
          });
        }
      } else {
        // Odd row: swap - groupB in odd-indexed columns, groupA in even-indexed
        // col1 (even index) gets groupA
        if (studentA) {
          grid[r][col1] = studentA;
          assignments.push({
            exam_room_id: examRoomId,
            student_id: studentA.student_id,
            seat_number: `${rowLabels[r]}${col1 + 1}`,
            row_label: rowLabels[r],
            column_number: col1 + 1,
          });
        }

        // col2 (odd index) gets groupB
        if (studentB) {
          grid[r][col2] = studentB;
          assignments.push({
            exam_room_id: examRoomId,
            student_id: studentB.student_id,
            seat_number: `${rowLabels[r]}${col2 + 1}`,
            row_label: rowLabels[r],
            column_number: col2 + 1,
          });
        }
      }
    }
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
      .map((student) => (student ? student.student_number : "EMPTY"))
      .join("\t");
    console.log(`${rowLabel}\t${seats}`);
  });

  console.log("\n=== STATISTICS ===");
  console.log(`Total seats: ${result.assignments.length}`);
  console.log(`Total rows used: ${result.grid.length}`);
  console.log(`Seats per row: ${result.grid[0]?.length || 0}`);
}

/**
 * Validate the seating arrangement against the rules
 * Now uses the _group marker instead of student_number prefix
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
  const colsPerRow = result.grid[0]?.length || 0;
  const pairCount = colsPerRow / 2;

  // Check each row
  result.grid.forEach((row, rowIndex) => {
    const isEvenRow = rowIndex % 2 === 0;

    // Check each pair
    for (let pairIndex = 0; pairIndex < pairCount; pairIndex++) {
      const col1 = pairIndex * 2;
      const col2 = pairIndex * 2 + 1;

      const student1 = row[col1];
      const student2 = row[col2];

      if (student1 && student2) {
        // Determine which group each student belongs to
        const isStudent1GroupA = groupAStudentIds.has(student1.student_id);
        const isStudent2GroupA = groupAStudentIds.has(student2.student_id);

        // Pairs must have one from each group
        if (isStudent1GroupA === isStudent2GroupA) {
          errors.push(
            `Row ${result.rowLabels[rowIndex]}, Pair ${pairIndex + 1}: ` +
              `Both students from same group (${student1.student_number}, ${student2.student_number})`,
          );
        }

        // Check zig-zag pattern
        if (isEvenRow) {
          // Even row: col1 should be group B, col2 should be group A
          if (isStudent1GroupA || !isStudent2GroupA) {
            errors.push(
              `Row ${result.rowLabels[rowIndex]}, Pair ${pairIndex + 1}: ` +
                `Incorrect zig-zag pattern for even row (expected B-A, got ${isStudent1GroupA ? "A" : "B"}-${isStudent2GroupA ? "A" : "B"})`,
            );
          }
        } else {
          // Odd row: col1 should be group A, col2 should be group B
          if (!isStudent1GroupA || isStudent2GroupA) {
            errors.push(
              `Row ${result.rowLabels[rowIndex]}, Pair ${pairIndex + 1}: ` +
                `Incorrect zig-zag pattern for odd row (expected A-B, got ${isStudent1GroupA ? "A" : "B"}-${isStudent2GroupA ? "A" : "B"})`,
            );
          }
        }
      }
    }
  });

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
    null, // Auto-calculate rows needed
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
}

export type { Student, SeatingAssignment, SeatingGrid };
