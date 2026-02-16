import supabase from "@/utils/supabase";

export interface Teacher {
  teacher_id: number;
  rank: string;
  name: string;
  department: string;
  total_periods_assigned: number;
}

export const teacherQueries = {
  // Get all teachers
  async getAll() {
    const { data, error } = await supabase
      .from("teacher")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data as Teacher[];
  },

  // Get teacher by ID
  async getById(teacherId: number) {
    const { data, error } = await supabase
      .from("teacher")
      .select("*")
      .eq("teacher_id", teacherId)
      .single();

    if (error) throw error;
    return data as Teacher;
  },

  // Get teacher by rank
  async getByRank(rank: string) {
    const { data, error } = await supabase
      .from("teacher")
      .select("*")
      .eq("rank", rank)
      .single();

    if (error) throw error;
    return data as Teacher;
  },

  // Get teachers by department
  async getByDepartment(department: string) {
    const { data, error } = await supabase
      .from("teacher")
      .select("*")
      .eq("department", department)
      .order("name", { ascending: true });

    if (error) throw error;
    return data as Teacher[];
  },

  // Search teachers by name
  async searchByName(searchTerm: string) {
    const { data, error } = await supabase
      .from("teacher")
      .select("*")
      .ilike("name", `%${searchTerm}%`)
      .order("name", { ascending: true });

    if (error) throw error;
    return data as Teacher[];
  },

  // Get teachers with low assignment load (below threshold)
  async getByMaxPeriods(maxPeriods: number) {
    const { data, error } = await supabase
      .from("teacher")
      .select("*")
      .lte("total_periods_assigned", maxPeriods)
      .order("total_periods_assigned", { ascending: true });

    if (error) throw error;
    return data as Teacher[];
  },

  // Get teachers with high assignment load (above threshold)
  async getByMinPeriods(minPeriods: number) {
    const { data, error } = await supabase
      .from("teacher")
      .select("*")
      .gte("total_periods_assigned", minPeriods)
      .order("total_periods_assigned", { ascending: false });

    if (error) throw error;
    return data as Teacher[];
  },

  // Get available teachers (with periods below threshold)
  async getAvailable(maxPeriods: number = 20) {
    const { data, error } = await supabase
      .from("teacher")
      .select("*")
      .lt("total_periods_assigned", maxPeriods)
      .order("total_periods_assigned", { ascending: true });

    if (error) throw error;
    return data as Teacher[];
  },

  // Get available teachers by department
  async getAvailableByDepartment(department: string, maxPeriods: number = 20) {
    const { data, error } = await supabase
      .from("teacher")
      .select("*")
      .eq("department", department)
      .lt("total_periods_assigned", maxPeriods)
      .order("total_periods_assigned", { ascending: true });

    if (error) throw error;
    return data as Teacher[];
  },

  // Create new teacher
  async create(teacher: Omit<Teacher, "teacher_id">) {
    const { data, error } = await supabase
      .from("teacher")
      .insert(teacher)
      .select()
      .single();

    if (error) throw error;
    return data as Teacher;
  },

  // Create multiple teachers
  async createMany(teachers: Omit<Teacher, "teacher_id">[]) {
    const { data, error } = await supabase
      .from("teacher")
      .insert(teachers)
      .select();

    if (error) throw error;
    return data as Teacher[];
  },

  // Update teacher
  async update(
    teacherId: number,
    updates: Partial<Omit<Teacher, "teacher_id">>,
  ) {
    const { data, error } = await supabase
      .from("teacher")
      .update(updates)
      .eq("teacher_id", teacherId)
      .select()
      .single();

    if (error) throw error;
    return data as Teacher;
  },

  // Delete teacher
  async delete(teacherId: number) {
    const { error } = await supabase
      .from("teacher")
      .delete()
      .eq("teacher_id", teacherId);

    if (error) throw error;
    return true;
  },

  // Increment teacher's assigned periods
  async incrementPeriods(teacherId: number, periodsToAdd: number = 1) {
    const teacher = await this.getById(teacherId);
    const { data, error } = await supabase
      .from("teacher")
      .update({
        total_periods_assigned: teacher.total_periods_assigned + periodsToAdd,
      })
      .eq("teacher_id", teacherId)
      .select()
      .single();

    if (error) throw error;
    return data as Teacher;
  },

  // Decrement teacher's assigned periods
  async decrementPeriods(teacherId: number, periodsToSubtract: number = 1) {
    const teacher = await this.getById(teacherId);
    const newTotal = Math.max(
      0,
      teacher.total_periods_assigned - periodsToSubtract,
    );
    const { data, error } = await supabase
      .from("teacher")
      .update({ total_periods_assigned: newTotal })
      .eq("teacher_id", teacherId)
      .select()
      .single();

    if (error) throw error;
    return data as Teacher;
  },

  // Reset all teacher periods to zero
  async resetAllPeriods() {
    const { data, error } = await supabase
      .from("teacher")
      .update({ total_periods_assigned: 0 })
      .select();

    if (error) throw error;
    return data as Teacher[];
  },

  // Get teacher statistics
  async getStats() {
    const { data, error } = await supabase
      .from("teacher")
      .select("department, total_periods_assigned");

    if (error) throw error;

    const stats = {
      totalTeachers: data.length,
      totalPeriodsAssigned: data.reduce(
        (sum, t) => sum + t.total_periods_assigned,
        0,
      ),
      averagePeriodsPerTeacher:
        data.length > 0
          ? data.reduce((sum, t) => sum + t.total_periods_assigned, 0) /
            data.length
          : 0,
      byDepartment: data.reduce(
        (acc, t) => {
          if (!acc[t.department]) {
            acc[t.department] = { count: 0, totalPeriods: 0 };
          }
          acc[t.department].count += 1;
          acc[t.department].totalPeriods += t.total_periods_assigned;
          return acc;
        },
        {} as Record<string, { count: number; totalPeriods: number }>,
      ),
    };

    return stats;
  },

  // Get teachers with filters
  async getWithFilters(filters: {
    department?: string;
    minPeriods?: number;
    maxPeriods?: number;
  }) {
    let query = supabase.from("teacher").select("*");

    if (filters.department) {
      query = query.eq("department", filters.department);
    }
    if (filters.minPeriods !== undefined) {
      query = query.gte("total_periods_assigned", filters.minPeriods);
    }
    if (filters.maxPeriods !== undefined) {
      query = query.lte("total_periods_assigned", filters.maxPeriods);
    }

    const { data, error } = await query.order("name", { ascending: true });

    if (error) throw error;
    return data as Teacher[];
  },
};
