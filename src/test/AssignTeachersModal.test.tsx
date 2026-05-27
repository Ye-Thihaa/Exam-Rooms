import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AssignTeachersModal from "@/components/AssignTeachersModal";
import type {
  ExamRoomAssignmentStatus,
  TeacherWithAvailability,
} from "@/services/teacherAssignmentTypes";

// ─── Mock the service layer ───────────────────────────────────────────────────
vi.mock("@/services/teacherassignmentQueries", () => ({
  teacherAssignmentQueries: {
    getCorrectExamRoomId: vi.fn().mockResolvedValue(null),
    getExamRoomStatus: vi.fn().mockResolvedValue({
      exam_room_id: 1,
      hasSupervisor: false,
      hasAssistant: false,
      supervisorId: null,
      assistantId: null,
      supervisorName: undefined,
      assistantName: undefined,
      isFullyStaffed: false,
    } satisfies ExamRoomAssignmentStatus),
    getAvailableTeachersWithSession: vi.fn().mockResolvedValue([]),
    deleteByRoomAndRole: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

// ─── Correct mock teacher matching TeacherWithAvailability ────────────────────
const mockTeacher: TeacherWithAvailability = {
  // Teacher base fields
  teacher_id: 1,
  name: "Dr. Santos",
  rank: "Lecturer",
  department: "Mathematics",
  department_id: 10,
  total_periods_assigned: 1,
  // TeacherWithCapability fields
  canBeSupervisor: true,
  canBeAssistant: true,
  eligibleRoles: ["Supervisor", "Assistant"],
  // TeacherWithAvailability fields
  workload_level: "Light",
  availability: {
    teacher_id: 1,
    is_available: true,
    conflict_reason: null,
    current_assignments: [],
  },
};

// ─── Correct mock status matching ExamRoomAssignmentStatus ───────────────────
const assignedStatus: ExamRoomAssignmentStatus = {
  exam_room_id: 1,
  hasSupervisor: true,
  hasAssistant: false,
  supervisorId: 1,
  assistantId: null,
  supervisorName: "Dr. Santos",
  assistantName: undefined,
  isFullyStaffed: false,
};

// ─── Shared base props matching AssignTeachersModalProps exactly ──────────────
const baseProps = {
  examRoomId: 1,
  roomNumber: "Room 101",
  examDate: "2025-06-01",
  examSession: "Morning" as const,
  examTime: { start: "08:00", end: "11:00" },
  rankLimits: { Lecturer: 3, Tutor: 2 },
  onClose: vi.fn(),
  onSuccess: vi.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("AssignTeachersModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("shows loading spinner initially", () => {
    render(<AssignTeachersModal {...baseProps} />);
    expect(screen.getByText(/loading available teachers/i)).toBeInTheDocument();
  });

  it("renders modal header after loading", async () => {
    render(<AssignTeachersModal {...baseProps} />);
    await waitFor(() =>
      expect(screen.getByText("Assign Invigilators")).toBeInTheDocument()
    );
    expect(screen.getByText(/Room 101/)).toBeInTheDocument();
    expect(screen.getByText(/Morning/)).toBeInTheDocument();
  });

  it("renders Supervisor and Assistant sections", async () => {
    render(<AssignTeachersModal {...baseProps} />);
    await waitFor(() =>
      expect(screen.getByText("Assign Invigilators")).toBeInTheDocument()
    );
    expect(screen.getByText("Supervisor")).toBeInTheDocument();
    expect(screen.getByText("Assistant")).toBeInTheDocument();
  });

  it("displays rank period limits when provided", async () => {
    render(<AssignTeachersModal {...baseProps} />);
    await waitFor(() =>
      expect(screen.getByText(/period limits/i)).toBeInTheDocument()
    );
    expect(screen.getByText("Lecturer")).toBeInTheDocument();
    expect(screen.getByText("Tutor")).toBeInTheDocument();
  });

  it("does NOT display rank limits section when rankLimits is empty", async () => {
    render(<AssignTeachersModal {...baseProps} rankLimits={{}} />);
    await waitFor(() =>
      expect(screen.getByText("Assign Invigilators")).toBeInTheDocument()
    );
    expect(screen.queryByText(/period limits/i)).not.toBeInTheDocument();
  });

  // ── onClose ────────────────────────────────────────────────────────────────

  it("calls onClose when Cancel button is clicked", async () => {
    render(<AssignTeachersModal {...baseProps} />);
    await waitFor(() =>
      expect(screen.getByText("Cancel")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  // ── Confirm button state ───────────────────────────────────────────────────

  it("disables Confirm button when no teacher is selected", async () => {
    render(<AssignTeachersModal {...baseProps} />);
    await waitFor(() =>
      expect(screen.getByText("Confirm")).toBeInTheDocument()
    );
    expect(screen.getByText("Confirm").closest("button")).toBeDisabled();
  });

  // ── Already assigned state ─────────────────────────────────────────────────

  it("shows assigned supervisor name and Remove button when supervisor is assigned", async () => {
    const { teacherAssignmentQueries } = await import(
      "@/services/teacherassignmentQueries"
    );
    vi.mocked(teacherAssignmentQueries.getExamRoomStatus).mockResolvedValueOnce(
      assignedStatus
    );

    render(<AssignTeachersModal {...baseProps} />);
    await waitFor(() =>
      expect(screen.getByText("Dr. Santos")).toBeInTheDocument()
    );
    expect(screen.getByText("Assigned Supervisor")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it("shows error message when data loading fails", async () => {
    const { teacherAssignmentQueries } = await import(
      "@/services/teacherassignmentQueries"
    );
    vi.mocked(
      teacherAssignmentQueries.getAvailableTeachersWithSession
    ).mockRejectedValueOnce(new Error("Network error"));

    render(<AssignTeachersModal {...baseProps} />);
    await waitFor(() =>
      expect(screen.getByText("Network error")).toBeInTheDocument()
    );
  });

  // ── Teacher list ───────────────────────────────────────────────────────────

  it("renders available teachers in the selector", async () => {
    const { teacherAssignmentQueries } = await import(
      "@/services/teacherassignmentQueries"
    );
    vi.mocked(
      teacherAssignmentQueries.getAvailableTeachersWithSession
    ).mockResolvedValue([mockTeacher]);

    render(<AssignTeachersModal {...baseProps} />);
    await waitFor(() =>
      expect(screen.getAllByText("Dr. Santos").length).toBeGreaterThan(0)
    );
  });

it("shows empty state when no teachers are available", async () => {
  const { teacherAssignmentQueries } = await import(
    "@/services/teacherassignmentQueries"
  );

  // Explicitly force empty for this test — overrides module-level mock
  vi.mocked(
    teacherAssignmentQueries.getAvailableTeachersWithSession
  ).mockResolvedValue([]);

  const { container } = render(<AssignTeachersModal {...baseProps} />);

  await waitFor(() =>
    expect(screen.getByText("Assign Invigilators")).toBeInTheDocument()
  );

  expect(container.innerHTML).toContain("No available Supervisor");
  expect(container.innerHTML).toContain("No available Assistant");
});
});