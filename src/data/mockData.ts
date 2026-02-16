export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "admin" | "exam_officer" | "invigilator" | "student";
  avatar?: string;
  department?: string;
  studentId?: string;
}

export const mockUsers: User[] = [
  {
    id: "1",
    email: "admin@university.edu",
    password: "admin123",
    name: "ADMIN",
    role: "admin",
    department: "Administration",
  },
  {
    id: "2",
    email: "examofficer@university.edu",
    password: "u!T3x@m0ff!c3R",
    name: "EXAM-OFFICER",
    role: "exam_officer",
    department: "Examination Office",
  },
  {
    id: "3",
    email: "invigilator@university.edu",
    password: "invig123",
    name: "Invigilator",
    role: "invigilator",
    department: "Computer Science",
  },
  {
    id: "4",
    email: "student@university.edu",
    password: "student123",
    name: "Alex Thompson",
    role: "student",
    studentId: "STU2024001",
    department: "Computer Science",
  },
];

// Mock Exam Rooms
export interface ExamRoom {
  id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  rows: number;
  seatsPerRow: number;
  facilities: string[];
  isAvailable: boolean;
}

export const mockRooms: ExamRoom[] = [
  {
    id: "room-1",
    name: "Hall A",
    building: "Main Building",
    floor: 1,
    capacity: 120,
    rows: 10,
    seatsPerRow: 12,
    facilities: ["Projector", "AC", "CCTV"],
    isAvailable: true,
  },
  {
    id: "room-2",
    name: "Hall B",
    building: "Main Building",
    floor: 2,
    capacity: 80,
    rows: 8,
    seatsPerRow: 10,
    facilities: ["Projector", "AC"],
    isAvailable: true,
  },
  {
    id: "room-3",
    name: "Lab 101",
    building: "Science Block",
    floor: 1,
    capacity: 40,
    rows: 5,
    seatsPerRow: 8,
    facilities: ["Computers", "AC", "CCTV"],
    isAvailable: false,
  },
  {
    id: "room-4",
    name: "Lecture Theatre 1",
    building: "Arts Building",
    floor: 0,
    capacity: 200,
    rows: 20,
    seatsPerRow: 10,
    facilities: ["Projector", "Mic System", "AC", "CCTV"],
    isAvailable: true,
  },
  {
    id: "room-5",
    name: "Seminar Room 3",
    building: "Engineering Block",
    floor: 3,
    capacity: 30,
    rows: 5,
    seatsPerRow: 6,
    facilities: ["Whiteboard", "AC"],
    isAvailable: true,
  },
];

// Mock Exams
export interface Exam {
  id: string;
  code: string;
  name: string;
  subject: string;
  department: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalStudents: number;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  roomId?: string;
  invigilatorIds?: string[];
}

export const mockExams: Exam[] = [
  {
    id: "exam-1",
    code: "CS301",
    name: "Data Structures & Algorithms",
    subject: "Computer Science",
    department: "Computer Science",
    date: "2024-03-15",
    startTime: "09:00",
    endTime: "12:00",
    duration: 180,
    totalStudents: 85,
    status: "scheduled",
    roomId: "room-1",
    invigilatorIds: ["3"],
  },
  {
    id: "exam-2",
    code: "MTH201",
    name: "Linear Algebra",
    subject: "Mathematics",
    department: "Mathematics",
    date: "2024-03-16",
    startTime: "14:00",
    endTime: "17:00",
    duration: 180,
    totalStudents: 120,
    status: "scheduled",
    roomId: "room-4",
  },
  {
    id: "exam-3",
    code: "PHY101",
    name: "Classical Mechanics",
    subject: "Physics",
    department: "Physics",
    date: "2024-03-17",
    startTime: "09:00",
    endTime: "11:00",
    duration: 120,
    totalStudents: 65,
    status: "scheduled",
    roomId: "room-2",
  },
  {
    id: "exam-4",
    code: "ENG102",
    name: "Technical Writing",
    subject: "English",
    department: "Humanities",
    date: "2024-03-18",
    startTime: "10:00",
    endTime: "12:00",
    duration: 120,
    totalStudents: 45,
    status: "scheduled",
    roomId: "room-5",
  },
  {
    id: "exam-5",
    code: "CS401",
    name: "Database Management Systems",
    subject: "Computer Science",
    department: "Computer Science",
    date: "2024-03-14",
    startTime: "09:00",
    endTime: "12:00",
    duration: 180,
    totalStudents: 72,
    status: "completed",
    roomId: "room-1",
  },
];

// Mock Students
export interface Student {
  id: string;
  studentId: string;
  name: string;
  email: string;
  department: string;
  semester: number;
  enrolledExams: string[];
  seatAssignments: { examId: string; roomId: string; seatNumber: string }[];
}

export const mockStudents: Student[] = [
  {
    id: "stu-1",
    studentId: "STU2024001",
    name: "Alex Thompson",
    email: "alex.t@university.edu",
    department: "Computer Science",
    semester: 5,
    enrolledExams: ["exam-1", "exam-5"],
    seatAssignments: [
      { examId: "exam-1", roomId: "room-1", seatNumber: "A-05" },
      { examId: "exam-5", roomId: "room-1", seatNumber: "B-12" },
    ],
  },
  {
    id: "stu-2",
    studentId: "STU2024002",
    name: "Emma Davis",
    email: "emma.d@university.edu",
    department: "Computer Science",
    semester: 5,
    enrolledExams: ["exam-1", "exam-2"],
    seatAssignments: [
      { examId: "exam-1", roomId: "room-1", seatNumber: "A-06" },
      { examId: "exam-2", roomId: "room-4", seatNumber: "C-08" },
    ],
  },
  {
    id: "stu-3",
    studentId: "STU2024003",
    name: "James Wilson",
    email: "james.w@university.edu",
    department: "Mathematics",
    semester: 3,
    enrolledExams: ["exam-2", "exam-3"],
    seatAssignments: [
      { examId: "exam-2", roomId: "room-4", seatNumber: "D-15" },
      { examId: "exam-3", roomId: "room-2", seatNumber: "A-03" },
    ],
  },
  {
    id: "stu-4",
    studentId: "STU2024004",
    name: "Sophia Martinez",
    email: "sophia.m@university.edu",
    department: "Physics",
    semester: 2,
    enrolledExams: ["exam-3"],
    seatAssignments: [
      { examId: "exam-3", roomId: "room-2", seatNumber: "B-07" },
    ],
  },
  {
    id: "stu-5",
    studentId: "STU2024005",
    name: "Liam Brown",
    email: "liam.b@university.edu",
    department: "Humanities",
    semester: 4,
    enrolledExams: ["exam-4"],
    seatAssignments: [
      { examId: "exam-4", roomId: "room-5", seatNumber: "A-02" },
    ],
  },
];

// Mock Invigilators
export interface Invigilator {
  id: string;
  name: string;
  email: string;
  department: string;
  assignedExams: string[];
  phone: string;
}

export const mockInvigilators: Invigilator[] = [
  {
    id: "inv-1",
    name: "Dr. Emily Williams",
    email: "emily.w@university.edu",
    department: "Computer Science",
    assignedExams: ["exam-1", "exam-5"],
    phone: "+1 234 567 8901",
  },
  {
    id: "inv-2",
    name: "Prof. Robert Taylor",
    email: "robert.t@university.edu",
    department: "Mathematics",
    assignedExams: ["exam-2"],
    phone: "+1 234 567 8902",
  },
  {
    id: "inv-3",
    name: "Dr. Jennifer Lee",
    email: "jennifer.l@university.edu",
    department: "Physics",
    assignedExams: ["exam-3"],
    phone: "+1 234 567 8903",
  },
  {
    id: "inv-4",
    name: "Prof. David Kim",
    email: "david.k@university.edu",
    department: "Humanities",
    assignedExams: ["exam-4"],
    phone: "+1 234 567 8904",
  },
];

// Mock Seating Plan for visualization
export interface SeatAssignment {
  seatNumber: string;
  row: string;
  column: number;
  isOccupied: boolean;
  studentId?: string;
  studentName?: string;
  studentGroup?: string;
  rollNumber?: string;
}

export const generateSeatingPlan = (
  roomId: string,
  examId: string,
): SeatAssignment[] => {
  const room = mockRooms.find((r) => r.id === roomId);
  if (!room) return [];

  const seats: SeatAssignment[] = [];
  const rows = "ABCDEFGHIJKLMNOPQRST".split("");

  const studentsInExam = mockStudents.filter((s) =>
    s.seatAssignments.some(
      (sa) => sa.examId === examId && sa.roomId === roomId,
    ),
  );

  for (let i = 0; i < room.rows; i++) {
    for (let j = 1; j <= room.seatsPerRow; j++) {
      const seatNumber = `${rows[i]}-${j.toString().padStart(2, "0")}`;
      const assignedStudent = studentsInExam.find((s) =>
        s.seatAssignments.some((sa) => sa.seatNumber === seatNumber),
      );

      seats.push({
        seatNumber,
        row: rows[i],
        column: j,
        studentId: assignedStudent?.studentId,
        studentName: assignedStudent?.name,
        isOccupied: !!assignedStudent,
      });
    }
  }

  return seats;
};

// Dashboard Statistics
export interface DashboardStats {
  totalUsers: number;
  totalStudents: number;
  totalExams: number;
  totalRooms: number;
  upcomingExams: number;
  completedExams: number;
  availableRooms: number;
}

export const getDashboardStats = (): DashboardStats => ({
  totalUsers: mockUsers.length + mockInvigilators.length,
  totalStudents: mockStudents.length,
  totalExams: mockExams.length,
  totalRooms: mockRooms.length,
  upcomingExams: mockExams.filter((e) => e.status === "scheduled").length,
  completedExams: mockExams.filter((e) => e.status === "completed").length,
  availableRooms: mockRooms.filter((r) => r.isAvailable).length,
});
