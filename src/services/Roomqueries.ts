import supabase from "@/utils/supabase";

export interface Room {
  room_id: number;
  room_number: string;
  capacity: number;
  room_type: string;
  is_available: boolean;
  id?: number;
}

const TABLE_NAME = "room";

// Helper to add id field to room objects
function addIdField(room: Room): Room & { id: number } {
  return { ...room, id: room.room_id };
}

/**
 * Get total count of rooms in the database
 */
export async function getTotalRoomCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Error fetching room count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in getTotalRoomCount:", error);
    return 0;
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
 * Get all rooms from the database
 */
export async function getAllRooms(): Promise<(Room & { id: number })[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("room_id, room_number, capacity, room_type, is_available")
      .order("room_number", { ascending: true });

    if (error) {
      console.error("Error fetching all rooms:", error);
      return [];
    }

    return (data || []).map(addIdField);
  } catch (error) {
    console.error("Error in getAllRooms:", error);
    return [];
  }
}

/**
 * Get only available rooms
 */
export async function getAvailableRooms(): Promise<(Room & { id: number })[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("room_id, room_number, capacity, room_type, is_available")
      .eq("is_available", true)
      .order("room_number", { ascending: true });

    if (error) {
      console.error("Error fetching available rooms:", error);
      return [];
    }

    return (data || []).map(addIdField);
  } catch (error) {
    console.error("Error in getAvailableRooms:", error);
    return [];
  }
}

/**
 * Get rooms by type
 * @param roomType - The room type to filter by
 */
export async function getRoomsByType(
  roomType: string,
): Promise<(Room & { id: number })[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("room_id, room_number, capacity, room_type, is_available")
      .eq("room_type", roomType)
      .order("room_number", { ascending: true });

    if (error) {
      console.error("Error fetching rooms by type:", error);
      return [];
    }

    return (data || []).map(addIdField);
  } catch (error) {
    console.error("Error in getRoomsByType:", error);
    return [];
  }
}

/**
 * Get a single room by ID
 * @param roomId - The room ID to fetch
 */
export async function getRoomById(
  roomId: number,
): Promise<(Room & { id: number }) | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("room_id, room_number, capacity, room_type, is_available")
      .eq("room_id", roomId)
      .single();

    if (error) {
      console.error("Error fetching room by ID:", error);
      return null;
    }

    return data ? addIdField(data) : null;
  } catch (error) {
    console.error("Error in getRoomById:", error);
    return null;
  }
}

/**
 * Get room statistics
 */
export async function getRoomStatistics() {
  try {
    const [
      { count: totalCount },
      { count: availableCount },
      roomTypeData,
      capacityData,
    ] = await Promise.all([
      // Total rooms
      supabase.from(TABLE_NAME).select("*", { count: "exact", head: true }),

      // Available rooms
      supabase
        .from(TABLE_NAME)
        .select("*", { count: "exact", head: true })
        .eq("is_available", true),

      // Rooms by type
      supabase.from(TABLE_NAME).select("room_type"),

      // Total capacity
      supabase.from(TABLE_NAME).select("capacity, is_available"),
    ]);

    // Count rooms by type
    const roomTypeDistribution: Record<string, number> = {};
    if (roomTypeData.data) {
      roomTypeData.data.forEach((room: { room_type: string }) => {
        roomTypeDistribution[room.room_type] =
          (roomTypeDistribution[room.room_type] || 0) + 1;
      });
    }

    // Calculate total capacity
    let totalCapacity = 0;
    let availableCapacity = 0;
    if (capacityData.data) {
      capacityData.data.forEach(
        (room: { capacity: number; is_available: boolean }) => {
          totalCapacity += room.capacity;
          if (room.is_available) {
            availableCapacity += room.capacity;
          }
        },
      );
    }

    return {
      totalRooms: totalCount || 0,
      availableRooms: availableCount || 0,
      unavailableRooms: (totalCount || 0) - (availableCount || 0),
      roomTypeDistribution,
      totalCapacity,
      availableCapacity,
    };
  } catch (error) {
    console.error("Error getting room statistics:", error);
    return {
      totalRooms: 0,
      availableRooms: 0,
      unavailableRooms: 0,
      roomTypeDistribution: {},
      totalCapacity: 0,
      availableCapacity: 0,
    };
  }
}

/**
 * Get total seating capacity (sum of all room capacities)
 */
export async function getTotalCapacity(): Promise<number> {
  try {
    const { data, error } = await supabase.from(TABLE_NAME).select("capacity");

    if (error) {
      console.error("Error fetching total capacity:", error);
      return 0;
    }

    return (data || []).reduce((sum, room) => sum + (room.capacity || 0), 0);
  } catch (error) {
    console.error("Error in getTotalCapacity:", error);
    return 0;
  }
}

/**
 * Get available seating capacity (sum of available room capacities)
 */
export async function getAvailableCapacity(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("capacity")
      .eq("is_available", true);

    if (error) {
      console.error("Error fetching available capacity:", error);
      return 0;
    }

    return (data || []).reduce((sum, room) => sum + (room.capacity || 0), 0);
  } catch (error) {
    console.error("Error in getAvailableCapacity:", error);
    return 0;
  }
}
