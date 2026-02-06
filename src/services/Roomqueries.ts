import supabase from "@/utils/supabase";

export interface Room {
  room_id: number;
  room_number: string;
  capacity: number;
  room_type?: string;
  is_available?: boolean;
  rows?: number;
  cols?: number;
}

const TABLE_NAME = "room";

/**
 * Get all rooms from the database
 */
export async function getAllRooms(): Promise<Room[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("room_number", { ascending: true });

    if (error) {
      console.error("Error fetching all rooms:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getAllRooms:", error);
    return [];
  }
}

/**
 * Get only available rooms (is_available = true)
 * These are rooms NOT currently assigned to any exam_room
 */
export async function getAvailableRooms(): Promise<Room[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("is_available", true)
      .order("room_number", { ascending: true });

    if (error) {
      console.error("Error fetching available rooms:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getAvailableRooms:", error);
    return [];
  }
}

/**
 * Get unavailable rooms (is_available = false)
 * These are rooms currently assigned to exam_room
 */
export async function getUnavailableRooms(): Promise<Room[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("is_available", false)
      .order("room_number", { ascending: true });

    if (error) {
      console.error("Error fetching unavailable rooms:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getUnavailableRooms:", error);
    return [];
  }
}

/**
 * Get a single room by ID
 */
export async function getRoomById(roomId: number): Promise<Room | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("room_id", roomId)
      .single();

    if (error) {
      console.error("Error fetching room by ID:", error);
      return null;
    }

    return data as Room;
  } catch (error) {
    console.error("Error in getRoomById:", error);
    return null;
  }
}

/**
 * Get rooms by type
 */
export async function getRoomsByType(roomType: string): Promise<Room[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("room_type", roomType)
      .order("room_number", { ascending: true });

    if (error) {
      console.error("Error fetching rooms by type:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getRoomsByType:", error);
    return [];
  }
}

/**
 * Get rooms with their assignment status
 * Returns rooms with additional info about their exam_room assignments
 */
export async function getRoomsWithAssignmentStatus(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(
        `
        *,
        exam_room (
          exam_room_id,
          exam_id,
          assigned_capacity
        )
      `,
      )
      .order("room_number", { ascending: true });

    if (error) {
      console.error("Error fetching rooms with assignment status:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getRoomsWithAssignmentStatus:", error);
    return [];
  }
}

/**
 * Manually set room availability
 * Note: This should rarely be needed as triggers handle this automatically
 */
export async function setRoomAvailability(
  roomId: number,
  isAvailable: boolean,
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ is_available: isAvailable })
      .eq("room_id", roomId);

    if (error) {
      console.error("Error setting room availability:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in setRoomAvailability:", error);
    return { success: false, error };
  }
}

/**
 * Create a new room
 */
export async function createRoom(
  room: Omit<Room, "room_id">,
): Promise<{ success: boolean; data?: Room; error?: any }> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        ...room,
        is_available: true, // New rooms are available by default
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating room:", error);
      return { success: false, error };
    }

    return { success: true, data: data as Room };
  } catch (error) {
    console.error("Error in createRoom:", error);
    return { success: false, error };
  }
}

/**
 * Update a room
 */
export async function updateRoom(
  roomId: number,
  updates: Partial<Room>,
): Promise<{ success: boolean; data?: Room; error?: any }> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq("room_id", roomId)
      .select()
      .single();

    if (error) {
      console.error("Error updating room:", error);
      return { success: false, error };
    }

    return { success: true, data: data as Room };
  } catch (error) {
    console.error("Error in updateRoom:", error);
    return { success: false, error };
  }
}

/**
 * Delete a room
 * Note: This will fail if the room is assigned to any exam_room (foreign key constraint)
 */
export async function deleteRoom(
  roomId: number,
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("room_id", roomId);

    if (error) {
      console.error("Error deleting room:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteRoom:", error);
    return { success: false, error };
  }
}
/**
 * Get count of available rooms
 */
export async function getAvailableRoomCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select("*", { count: "exact", head: true })
      .eq("is_available", true);

    if (error) {
      console.error("Error fetching available room count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in getAvailableRoomCount:", error);
    return 0;
  }
}
/**
 * Get total count of all rooms
 */
export async function getTotalRoomCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Error fetching total room count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in getTotalRoomCount:", error);
    return 0;
  }
}
/**
 * Get room statistics
 */
export async function getRoomStatistics(): Promise<{
  total: number;
  available: number;
  unavailable: number;
  totalCapacity: number;
  availableCapacity: number;
}> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("is_available, capacity");

    if (error) {
      console.error("Error fetching room statistics:", error);
      return {
        total: 0,
        available: 0,
        unavailable: 0,
        totalCapacity: 0,
        availableCapacity: 0,
      };
    }

    const total = data?.length || 0;
    const available = data?.filter((r: any) => r.is_available).length || 0;
    const unavailable = total - available;
    const totalCapacity =
      data?.reduce((sum: number, r: any) => sum + (r.capacity || 0), 0) || 0;
    const availableCapacity =
      data
        ?.filter((r: any) => r.is_available)
        .reduce((sum: number, r: any) => sum + (r.capacity || 0), 0) || 0;

    return {
      total,
      available,
      unavailable,
      totalCapacity,
      availableCapacity,
    };
  } catch (error) {
    console.error("Error in getRoomStatistics:", error);
    return {
      total: 0,
      available: 0,
      unavailable: 0,
      totalCapacity: 0,
      availableCapacity: 0,
    };
  }
}
