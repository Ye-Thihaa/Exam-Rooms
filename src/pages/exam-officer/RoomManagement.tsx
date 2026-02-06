import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  Users,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomStatistics,
  type Room,
} from "@/services/Roomqueries";
import {
  getAllWithDetails,
  saveExamRoomAssignments,
  updateExamRoomAssignment,
  deleteExamRoomAssignments,
  type ExamRoomWithDetails,
  type ExamRoomInsert,
} from "@/services/examroomQueries";
import { deleteExamRoomById } from "@/services/examRoomDeleteHelper";
import RoomFormModal from "@/components/roommanagement/RoomFormModal";
import ExamRoomFormModal from "@/components/roommanagement/ExamRoomFormModal";
import DeleteConfirmModal from "@/components/roommanagement/DeleteConfirmModal";

type TabType = "rooms" | "exam-rooms";

interface RoomStats {
  total: number;
  available: number;
  unavailable: number;
  totalCapacity: number;
  availableCapacity: number;
}

const RoomManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("rooms");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Room state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomStats, setRoomStats] = useState<RoomStats | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomModalMode, setRoomModalMode] = useState<"create" | "edit">(
    "create",
  );

  // Exam Room state
  const [examRooms, setExamRooms] = useState<ExamRoomWithDetails[]>([]);
  const [selectedExamRoom, setSelectedExamRoom] =
    useState<ExamRoomWithDetails | null>(null);
  const [showExamRoomModal, setShowExamRoomModal] = useState(false);
  const [examRoomModalMode, setExamRoomModalMode] = useState<"create" | "edit">(
    "create",
  );

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "room" | "exam-room";
    id: number;
    name: string;
  } | null>(null);

  // Load data on mount and tab change
  useEffect(() => {
    if (activeTab === "rooms") {
      loadRooms();
      loadRoomStats();
    } else {
      loadExamRooms();
    }
  }, [activeTab]);

  // Load all rooms
  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await getAllRooms();
      setRooms(data);
    } catch (error) {
      console.error("Error loading rooms:", error);
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  // Load room statistics
  const loadRoomStats = async () => {
    try {
      const stats = await getRoomStatistics();
      setRoomStats(stats);
    } catch (error) {
      console.error("Error loading room statistics:", error);
    }
  };

  // Load all exam rooms
  const loadExamRooms = async () => {
    setLoading(true);
    try {
      const result = await getAllWithDetails();
      if (result.success && result.data) {
        setExamRooms(result.data);
      } else {
        toast.error("Failed to load exam room assignments");
      }
    } catch (error) {
      console.error("Error loading exam rooms:", error);
      toast.error("Failed to load exam room assignments");
    } finally {
      setLoading(false);
    }
  };

  // Room CRUD Operations
  const handleCreateRoom = () => {
    setRoomModalMode("create");
    setSelectedRoom(null);
    setShowRoomModal(true);
  };

  const handleEditRoom = (room: Room) => {
    setRoomModalMode("edit");
    setSelectedRoom(room);
    setShowRoomModal(true);
  };

  const handleDeleteRoom = (room: Room) => {
    setDeleteTarget({
      type: "room",
      id: room.room_id,
      name: room.room_number,
    });
    setShowDeleteModal(true);
  };

  const handleRoomSubmit = async (roomData: Omit<Room, "room_id">) => {
    try {
      if (roomModalMode === "create") {
        const result = await createRoom(roomData);
        if (result.success) {
          toast.success("Room created successfully");
          loadRooms();
          loadRoomStats();
          setShowRoomModal(false);
        } else {
          toast.error(result.error?.message || "Failed to create room");
        }
      } else if (selectedRoom) {
        const result = await updateRoom(selectedRoom.room_id, roomData);
        if (result.success) {
          toast.success("Room updated successfully");
          loadRooms();
          loadRoomStats();
          setShowRoomModal(false);
        } else {
          toast.error(result.error?.message || "Failed to update room");
        }
      }
    } catch (error) {
      console.error("Error saving room:", error);
      toast.error("An error occurred while saving the room");
    }
  };

  // Exam Room CRUD Operations
  const handleCreateExamRoom = () => {
    setExamRoomModalMode("create");
    setSelectedExamRoom(null);
    setShowExamRoomModal(true);
  };

  const handleEditExamRoom = (examRoom: ExamRoomWithDetails) => {
    setExamRoomModalMode("edit");
    setSelectedExamRoom(examRoom);
    setShowExamRoomModal(true);
  };

  const handleDeleteExamRoom = (examRoom: ExamRoomWithDetails) => {
    if (examRoom.exam_room_id) {
      setDeleteTarget({
        type: "exam-room",
        id: examRoom.exam_room_id,
        name: examRoom.room?.room_number || "Unknown Room",
      });
      setShowDeleteModal(true);
    }
  };

  const handleExamRoomSubmit = async (examRoomData: ExamRoomInsert) => {
    try {
      if (examRoomModalMode === "create") {
        const result = await saveExamRoomAssignments([examRoomData]);
        if (result.success) {
          toast.success("Exam room assignment created successfully");
          loadExamRooms();
          setShowExamRoomModal(false);
        } else {
          toast.error(
            result.error?.message || "Failed to create exam room assignment",
          );
        }
      } else if (selectedExamRoom?.exam_room_id) {
        const result = await updateExamRoomAssignment(
          selectedExamRoom.exam_room_id,
          examRoomData,
        );
        if (result.success) {
          toast.success("Exam room assignment updated successfully");
          loadExamRooms();
          setShowExamRoomModal(false);
        } else {
          toast.error(
            result.error?.message || "Failed to update exam room assignment",
          );
        }
      }
    } catch (error) {
      console.error("Error saving exam room:", error);
      toast.error("An error occurred while saving the exam room assignment");
    }
  };

  // Delete confirmation handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === "room") {
        const result = await deleteRoom(deleteTarget.id);
        if (result.success) {
          toast.success("Room deleted successfully");
          loadRooms();
          loadRoomStats();
        } else {
          toast.error(
            result.error?.message ||
              "Failed to delete room. It may be assigned to an exam.",
          );
        }
      } else {
        // Delete individual exam room assignment
        const result = await deleteExamRoomById(deleteTarget.id);
        if (result.success) {
          toast.success("Exam room assignment deleted successfully");
          loadExamRooms();
        } else {
          toast.error(
            result.error?.message || "Failed to delete exam room assignment",
          );
        }
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("An error occurred while deleting");
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  // Filter rooms based on search
  const filteredRooms = rooms.filter(
    (room) =>
      room.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.room_type?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Filter exam rooms based on search
  const filteredExamRooms = examRooms.filter(
    (examRoom) =>
      examRoom.room?.room_number
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      examRoom.program_primary
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      examRoom.program_secondary
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Room Management"
        description="Manage rooms and exam room assignments"
      />

      {/* Statistics Cards (only for rooms tab) */}
      {activeTab === "rooms" && roomStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-gray-600">Total Rooms</div>
            <div className="text-2xl font-bold">{roomStats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Available</div>
            <div className="text-2xl font-bold text-green-600">
              {roomStats.available}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Assigned</div>
            <div className="text-2xl font-bold text-orange-600">
              {roomStats.unavailable}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Total Capacity</div>
            <div className="text-2xl font-bold">{roomStats.totalCapacity}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Available Capacity</div>
            <div className="text-2xl font-bold text-blue-600">
              {roomStats.availableCapacity}
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Card className="mb-6">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab("rooms")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "rooms"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Building2 className="inline-block w-4 h-4 mr-2" />
              Rooms
            </button>
            <button
              onClick={() => setActiveTab("exam-rooms")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "exam-rooms"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users className="inline-block w-4 h-4 mr-2" />
              Exam Room Assignments
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search and Actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={`Search ${activeTab === "rooms" ? "rooms" : "assignments"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {activeTab === "rooms" && (
              <Button onClick={handleCreateRoom} className="ml-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : activeTab === "rooms" ? (
            <RoomsTable
              rooms={filteredRooms}
              onEdit={handleEditRoom}
              onDelete={handleDeleteRoom}
            />
          ) : (
            <ExamRoomsTable
              examRooms={filteredExamRooms}
              onEdit={handleEditExamRoom}
              onDelete={handleDeleteExamRoom}
            />
          )}
        </div>
      </Card>

      {/* Modals */}
      <RoomFormModal
        isOpen={showRoomModal}
        onClose={() => setShowRoomModal(false)}
        onSubmit={handleRoomSubmit}
        mode={roomModalMode}
        initialData={selectedRoom}
      />

      <ExamRoomFormModal
        isOpen={showExamRoomModal}
        onClose={() => setShowExamRoomModal(false)}
        onSubmit={handleExamRoomSubmit}
        mode={examRoomModalMode}
        initialData={selectedExamRoom}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={deleteTarget?.name || ""}
        itemType={
          deleteTarget?.type === "room" ? "room" : "exam room assignment"
        }
      />
    </DashboardLayout>
  );
};

// Rooms Table Component
interface RoomsTableProps {
  rooms: Room[];
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
}

const RoomsTable: React.FC<RoomsTableProps> = ({ rooms, onEdit, onDelete }) => {
  if (rooms.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No rooms found. Click "Add Room" to create one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Room Number
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Capacity
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Type
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Layout
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Status
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rooms.map((room) => (
            <tr key={room.room_id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{room.room_number}</td>
              <td className="px-4 py-3">{room.capacity}</td>
              <td className="px-4 py-3">{room.room_type || "-"}</td>
              <td className="px-4 py-3">
                {room.rows && room.cols ? `${room.rows} × ${room.cols}` : "-"}
              </td>
              <td className="px-4 py-3">
                {room.is_available ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Available
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Assigned
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(room)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(room)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Exam Rooms Table Component
interface ExamRoomsTableProps {
  examRooms: ExamRoomWithDetails[];
  onEdit: (examRoom: ExamRoomWithDetails) => void;
  onDelete: (examRoom: ExamRoomWithDetails) => void;
}

const ExamRoomsTable: React.FC<ExamRoomsTableProps> = ({
  examRooms,
  onEdit,
  onDelete,
}) => {
  if (examRooms.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No exam room assignments found. Click "Add Assignment" to create one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Room
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Primary Group
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Secondary Group
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Capacity
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {examRooms.map((examRoom) => (
            <tr key={examRoom.exam_room_id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">
                {examRoom.room?.room_number || "Unknown"}
              </td>
              <td className="px-4 py-3">
                <div className="text-sm">
                  <div className="font-medium">
                    Year {examRoom.year_level_primary}, Sem{" "}
                    {examRoom.sem_primary}
                  </div>
                  <div className="text-gray-600">
                    {examRoom.program_primary} -{" "}
                    {examRoom.specialization_primary}
                  </div>
                  <div className="text-gray-500">
                    {examRoom.students_primary} students
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm">
                  <div className="font-medium">
                    Year {examRoom.year_level_secondary}, Sem{" "}
                    {examRoom.sem_secondary}
                  </div>
                  <div className="text-gray-600">
                    {examRoom.program_secondary} -{" "}
                    {examRoom.specialization_secondary}
                  </div>
                  <div className="text-gray-500">
                    {examRoom.students_secondary} students
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {examRoom.assigned_capacity} / {examRoom.room?.capacity || "?"}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(examRoom)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(examRoom)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RoomManagement;
