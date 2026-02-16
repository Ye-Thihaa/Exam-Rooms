import supabase from "@/utils/supabase";

/**
 * Delete a single exam room assignment by ID
 */
export const deleteExamRoomById = async (
  examRoomId: number,
): Promise<{ success: boolean; error?: any }> => {
  try {
    const { error } = await supabase
      .from("exam_room")
      .delete()
      .eq("exam_room_id", examRoomId);

    if (error) {
      console.error("Error deleting exam room assignment:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception deleting exam room assignment:", error);
    return { success: false, error };
  }
};
