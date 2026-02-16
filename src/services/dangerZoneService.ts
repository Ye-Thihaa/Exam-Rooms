// services/dangerZoneService.ts
// ⚠️ DANGER ZONE SERVICE — Handles irreversible database purge operations.

import supabase from "@/utils/supabase"; // adjust path as needed

export interface DeleteResult {
  success: boolean;
  message: string;
  deletedCounts?: Record<string, number>;
  error?: string;
}

/**
 * Deletes ALL records from a single table.
 * Uses `.neq("id_column", 0)` pattern replaced with a raw RPC or
 * simple `.delete().gte("id_column", 0)` to match every row.
 */
async function purgeTable(
  tableName: string,
  primaryKey: string,
): Promise<{ table: string; count: number; error?: string }> {
  const { error, count } = await supabase
    .from(tableName)
    .delete({ count: "exact" })
    .gte(primaryKey, 0); // matches all integer PKs ≥ 0

  if (error) {
    console.error(`[DangerZone] Failed to purge table "${tableName}":`, error);
    return { table: tableName, count: 0, error: error.message };
  }

  return { table: tableName, count: count ?? 0 };
}

/**
 * Purge order matters — child tables must be deleted before parent tables
 * to respect foreign-key constraints.
 *
 * Dependency tree (leaves → roots):
 *   seating_assignment  →  exam_room, student
 *   teacher_assignment  →  exam_room, teacher
 *   exam_room           →  room
 *   exam                (standalone)
 *   room                (parent)
 *   student             (parent)
 *   teacher             (parent)
 */
const PURGE_ORDER: Array<{ table: string; pk: string }> = [
  { table: "seating_assignment", pk: "seating_id" },
  { table: "teacher_assignment", pk: "assignment_id" },
  { table: "exam_room", pk: "exam_room_id" },
  { table: "exam", pk: "exam_id" },
  { table: "student", pk: "student_id" },
  { table: "teacher", pk: "teacher_id" },
  { table: "room", pk: "room_id" },
];

/**
 * deleteAllData()
 *
 * Permanently deletes every row from every application table.
 * This action CANNOT be undone. Call only after explicit user confirmation.
 *
 * @returns DeleteResult — summary of what was deleted or any errors.
 */
export async function deleteAllData(): Promise<DeleteResult> {
  const deletedCounts: Record<string, number> = {};
  const errors: string[] = [];

  for (const { table, pk } of PURGE_ORDER) {
    const result = await purgeTable(table, pk);
    deletedCounts[table] = result.count;

    if (result.error) {
      errors.push(`${table}: ${result.error}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: `Purge completed with ${errors.length} error(s).`,
      deletedCounts,
      error: errors.join(" | "),
    };
  }

  return {
    success: true,
    message: "All database records have been permanently deleted.",
    deletedCounts,
  };
}

/**
 * deleteTableData(tableName)
 *
 * Deletes all rows from a specific table only.
 * Useful for targeted resets (e.g. clearing only seating assignments).
 *
 * @param tableName  — must match an entry in PURGE_ORDER
 * @returns DeleteResult
 */
export async function deleteTableData(
  tableName: string,
): Promise<DeleteResult> {
  const entry = PURGE_ORDER.find((t) => t.table === tableName);

  if (!entry) {
    return {
      success: false,
      message: `Unknown table: "${tableName}".`,
      error: "Table not found in purge registry.",
    };
  }

  const result = await purgeTable(entry.table, entry.pk);

  if (result.error) {
    return {
      success: false,
      message: `Failed to delete records from "${tableName}".`,
      error: result.error,
    };
  }

  return {
    success: true,
    message: `All records deleted from "${tableName}" (${result.count} rows).`,
    deletedCounts: { [tableName]: result.count },
  };
}
