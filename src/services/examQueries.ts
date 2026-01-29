import supabase from "@/utils/supabase";

export interface Exam {
  exam_id: number;
  subject_code: string;
  exam_name: string;
  exam_date: string;
  session: string;
  academic_year: string;
  semester: string;
  year_level: string;
  program: string;
  specialization: string | null;
  start_time: string;
  end_time: string;
  day_of_week: string;
}

export const examQueries = {
  // Get all exams
  async getAll() {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .order("exam_date", { ascending: false });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exam by ID
  async getById(examId: number) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("exam_id", examId)
      .single();

    if (error) throw error;
    return data as Exam;
  },

  // Get exam by subject code
  async getBySubjectCode(subjectCode: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("subject_code", subjectCode);

    if (error) throw error;
    return data as Exam[];
  },

  // Get exams by semester
  async getBySemester(semester: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("semester", semester)
      .order("exam_date", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exams by academic year
  async getByAcademicYear(academicYear: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("academic_year", academicYear)
      .order("exam_date", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exams by year level
  async getByYearLevel(yearLevel: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("year_level", yearLevel)
      .order("exam_date", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exams by program
  async getByProgram(program: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("program", program)
      .order("exam_date", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exams by specialization
  async getBySpecialization(specialization: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("specialization", specialization)
      .order("exam_date", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exams by program and year level
  async getByProgramAndYear(program: string, yearLevel: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("program", program)
      .eq("year_level", yearLevel)
      .order("exam_date", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exams by program, year level, and specialization
  async getByProgramYearSpecialization(
    program: string,
    yearLevel: string,
    specialization: string | null,
  ) {
    let query = supabase
      .from("exam")
      .select("*")
      .eq("program", program)
      .eq("year_level", yearLevel);

    if (specialization) {
      query = query.eq("specialization", specialization);
    } else {
      query = query.is("specialization", null);
    }

    const { data, error } = await query.order("exam_date", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exams by date range
  async getByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .gte("exam_date", startDate)
      .lte("exam_date", endDate)
      .order("exam_date", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exams by specific date
  async getByDate(date: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("exam_date", date)
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exams by session
  async getBySession(session: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("session", session)
      .order("exam_date", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exams by day of week
  async getByDayOfWeek(dayOfWeek: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("day_of_week", dayOfWeek)
      .order("exam_date", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Create new exam
  async create(exam: Omit<Exam, "exam_id">) {
    const { data, error } = await supabase
      .from("exam")
      .insert(exam)
      .select()
      .single();

    if (error) throw error;
    return data as Exam;
  },

  // Update exam
  async update(examId: number, updates: Partial<Omit<Exam, "exam_id">>) {
    const { data, error } = await supabase
      .from("exam")
      .update(updates)
      .eq("exam_id", examId)
      .select()
      .single();

    if (error) throw error;
    return data as Exam;
  },

  // Delete exam
  async delete(examId: number) {
    const { error } = await supabase
      .from("exam")
      .delete()
      .eq("exam_id", examId);

    if (error) throw error;
    return true;
  },

  // Get upcoming exams
  async getUpcoming() {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .gte("exam_date", today)
      .order("exam_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get past exams
  async getPast() {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .lt("exam_date", today)
      .order("exam_date", { ascending: false });

    if (error) throw error;
    return data as Exam[];
  },

  // Get upcoming exams for specific program and year
  async getUpcomingByProgramAndYear(program: string, yearLevel: string) {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("program", program)
      .eq("year_level", yearLevel)
      .gte("exam_date", today)
      .order("exam_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get upcoming exams for specific specialization
  async getUpcomingBySpecialization(specialization: string) {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .eq("specialization", specialization)
      .gte("exam_date", today)
      .order("exam_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get all unique programs
  async getUniquePrograms() {
    const { data, error } = await supabase
      .from("exam")
      .select("program")
      .order("program");

    if (error) throw error;
    const uniquePrograms = [...new Set(data.map((item) => item.program))];
    return uniquePrograms;
  },

  // Get all unique specializations
  async getUniqueSpecializations() {
    const { data, error } = await supabase
      .from("exam")
      .select("specialization")
      .not("specialization", "is", null)
      .order("specialization");

    if (error) throw error;
    const uniqueSpecializations = [
      ...new Set(data.map((item) => item.specialization).filter(Boolean)),
    ];
    return uniqueSpecializations as string[];
  },

  // Get all unique year levels
  async getUniqueYearLevels() {
    const { data, error } = await supabase
      .from("exam")
      .select("year_level")
      .order("year_level");

    if (error) throw error;
    const uniqueYearLevels = [...new Set(data.map((item) => item.year_level))];
    return uniqueYearLevels;
  },

  // Get all unique academic years
  async getUniqueAcademicYears() {
    const { data, error } = await supabase
      .from("exam")
      .select("academic_year")
      .order("academic_year");

    if (error) throw error;
    const uniqueAcademicYears = [
      ...new Set(data.map((item) => item.academic_year)),
    ];
    return uniqueAcademicYears;
  },

  // Search exams by course name
  async searchByCourse(searchTerm: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .ilike("exam_name", `%${searchTerm}%`)
      .order("exam_date", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exam schedule for a specific student (by program, year, and optional specialization)
  async getStudentSchedule(
    program: string,
    yearLevel: string,
    specialization?: string | null,
  ) {
    let query = supabase
      .from("exam")
      .select("*")
      .eq("program", program)
      .eq("year_level", yearLevel);

    if (specialization) {
      query = query.eq("specialization", specialization);
    }

    const { data, error } = await query
      .order("exam_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data as Exam[];
  },

  // Get exams grouped by date for a calendar view
  async getExamCalendar(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("exam")
      .select("*")
      .gte("exam_date", startDate)
      .lte("exam_date", endDate)
      .order("exam_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;

    // Group by date
    const grouped = (data as Exam[]).reduce(
      (acc, exam) => {
        const date = exam.exam_date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(exam);
        return acc;
      },
      {} as Record<string, Exam[]>,
    );

    return grouped;
  },
};
