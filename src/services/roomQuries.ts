import supabase from "@/utils/supabase";

export interface Room {
  room_id: number;
  room_number: string;
  capacity: number;
  room_type: string;
  is_available: boolean;
  rows: number;
  cols: number;
}

export const roomQueries = {
  // Get all rooms
  async getAll() {
    const { data, error } = await supabase
      .from("room")
      .select("*")
      .order("room_number", { ascending: true });

    if (error) throw error;
    return data as Room[];
  },

  // Get room by ID
  async getById(roomId: number) {
    const { data, error } = await supabase
      .from("room")
      .select("*")
      .eq("room_id", roomId)
      .single();

    if (error) throw error;
    return data as Room;
  },

  // Get room by room number
  async getByRoomNumber(roomNumber: string) {
    const { data, error } = await supabase
      .from("room")
      .select("*")
      .eq("room_number", roomNumber)
      .single();

    if (error) throw error;
    return data as Room;
  },

  // Get available rooms
  async getAvailable() {
    const { data, error } = await supabase
      .from("room")
      .select("*")
      .eq("is_available", true)
      .order("room_number", { ascending: true });

    if (error) throw error;
    return data as Room[];
  },

  // Get rooms by type
  async getByType(roomType: string) {
    const { data, error } = await supabase
      .from("room")
      .select("*")
      .eq("room_type", roomType)
      .order("room_number", { ascending: true });

    if (error) throw error;
    return data as Room[];
  },

  // Get rooms by minimum capacity
  async getByMinCapacity(minCapacity: number) {
    const { data, error } = await supabase
      .from("room")
      .select("*")
      .gte("capacity", minCapacity)
      .order("capacity", { ascending: true });

    if (error) throw error;
    return data as Room[];
  },

  // Get available rooms by minimum capacity
  async getAvailableByMinCapacity(minCapacity: number) {
    const { data, error } = await supabase
      .from("room")
      .select("*")
      .eq("is_available", true)
      .gte("capacity", minCapacity)
      .order("capacity", { ascending: true });

    if (error) throw error;
    return data as Room[];
  },

  // Create new room
  async create(room: Omit<Room, "room_id">) {
    const { data, error } = await supabase
      .from("room")
      .insert(room)
      .select()
      .single();

    if (error) throw error;
    return data as Room;
  },

  // Update room
  async update(roomId: number, updates: Partial<Omit<Room, "room_id">>) {
    const { data, error } = await supabase
      .from("room")
      .update(updates)
      .eq("room_id", roomId)
      .select()
      .single();

    if (error) throw error;
    return data as Room;
  },

  // Delete room
  async delete(roomId: number) {
    const { error } = await supabase
      .from("room")
      .delete()
      .eq("room_id", roomId);

    if (error) throw error;
    return true;
  },

  // Toggle room availability
  async toggleAvailability(roomId: number) {
    const room = await this.getById(roomId);
    const { data, error } = await supabase
      .from("room")
      .update({ is_available: !room.is_available })
      .eq("room_id", roomId)
      .select()
      .single();

    if (error) throw error;
    return data as Room;
  },

  // Get room utilization statistics
  async getRoomStats() {
    const { data, error } = await supabase
      .from("room")
      .select("room_type, capacity, is_available");

    if (error) throw error;

    const stats = {
      totalRooms: data.length,
      availableRooms: data.filter((r) => r.is_available).length,
      totalCapacity: data.reduce((sum, r) => sum + r.capacity, 0),
      byType: data.reduce(
        (acc, r) => {
          acc[r.room_type] = (acc[r.room_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    return stats;
  },
};
