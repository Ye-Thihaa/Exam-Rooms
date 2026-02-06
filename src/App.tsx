import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Pages
import LoginPage from "./pages/LoginPage";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import RoleAssignment from "./pages/admin/RoleAssignment";
import RoomManagement from "./pages/admin/RoomManagement";
import ExamsOverview from "./pages/exam-officer/ExamsOverview";

// Exam Officer Pages
import ExamOfficerDashboard from "./pages/exam-officer/ExamOfficerDashboard";
import StudentRecords from "./pages/exam-officer/StudentRecords";
import CreateExam from "./pages/exam-officer/CreateExam";
import RoomCapacity from "./pages/exam-officer/RoomCapacity";
import RoomAssignment from "./pages/exam-officer/RoomAssignment";
import SeatingGenerator from "./pages/exam-officer/SeatingGenerator";
import ExamSchedule from "./pages/exam-officer/Examschedule";
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

const queryClient = new QueryClient();

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
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/roles"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <RoleAssignment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/rooms"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <RoomManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/exams"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ExamsOverview />
                </ProtectedRoute>
              }
            />
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
              path="/exam-officer/create-exam"
              element={
                <ProtectedRoute allowedRoles={["exam_officer"]}>
                  <CreateExam />
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
