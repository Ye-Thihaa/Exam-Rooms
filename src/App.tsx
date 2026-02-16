import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Pages
import LoginPage from "./pages/LoginPage";

// Exam Officer Pages
import ExamOfficerDashboard from "./pages/exam-officer/ExamOfficerDashboard";
import StudentRecords from "./pages/exam-officer/StudentRecords";
import ExamsOverview from "./pages/exam-officer/ExamsOverview";
import CreateExam from "./pages/exam-officer/CreateExam";
import RoomCapacity from "./pages/exam-officer/RoomCapacity";
import RoomAssignment from "./pages/exam-officer/RoomAssignment";
import SeatingGenerator from "./pages/exam-officer/SeatingGenerator";
import ExamSchedule from "./pages/exam-officer/Examschedule";
import RoomManagement from "./pages/exam-officer/RoomManagement";
import TeacherView from "./pages/exam-officer/TeacherView";
import DangerZone from "./pages/exam-officer/DangerZone";
// Invigilator Pages
import InvigilatorDashboard from "./pages/invigilator/InvigilatorDashboard";
import AssignedExams from "./pages/invigilator/AssignedExams";
import AssignedRooms from "./pages/invigilator/AssignedRooms";
import InvigilatorSeating from "./pages/invigilator/InvigilatorSeating";
import InvigilatorSchedule from "./pages/invigilator/InvigilatorSchedule";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentTimetable from "./pages/student/StudentTimetable";
import StudentSeat from "./pages/student/StudentSeat";
import StudentExams from "./pages/student/StudentExams";

import NotFound from "./pages/NotFound";
import SpecialExamSeatingAssignment from "./pages/exam-officer/SpecialExamSeatingAssignment";
import UserManual from "./pages/exam-officer/UserManual";
import RoomRanges from "./components/RoomRanges";
import RoomRangesPage from "./pages/exam-officer/RoomRangesPage";

const queryClient = new QueryClient();

// Root redirect component - redirects based on auth state
const RootRedirect = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  switch (user.role) {
    case "exam_officer":
      return <Navigate to="/exam-officer" replace />;
    case "invigilator":
      return <Navigate to="/invigilator" replace />;
    case "student":
      return <Navigate to="/student" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Analytics />
          <SpeedInsights />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            {/* Exam Officer Routes */}
            <Route
              path="/exam-officer"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <ExamOfficerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/students"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <StudentRecords />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/room-ranges"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <RoomRangesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/create-exam"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <CreateExam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/room-management"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <RoomManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/danger-zone"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <DangerZone />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/teacher-assignments"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <ExamsOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/teacher-view"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <TeacherView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/exams"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <ExamSchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/rooms"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <RoomCapacity />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/room-assignment"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <RoomAssignment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/seating"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <SeatingGenerator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/user-manual"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <UserManual />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-officer/special-exams"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <SpecialExamSeatingAssignment />
                </ProtectedRoute>
              }
            />
            {/* Invigilator Routes */}
            <Route
              path="/invigilator"
              element={
                <ProtectedRoute allowedRoles={["invigilator"]}>
                  <InvigilatorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invigilator/exams"
              element={
                <ProtectedRoute allowedRoles={["invigilator"]}>
                  <AssignedExams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invigilator/rooms"
              element={
                <ProtectedRoute allowedRoles={["invigilator"]}>
                  <AssignedRooms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invigilator/seating"
              element={
                <ProtectedRoute allowedRoles={["invigilator"]}>
                  <InvigilatorSeating />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invigilator/schedule"
              element={
                <ProtectedRoute allowedRoles={["invigilator"]}>
                  <InvigilatorSchedule />
                </ProtectedRoute>
              }
            />

            {/* Student Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/timetable"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentTimetable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/seat"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentSeat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/exams"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentExams />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
