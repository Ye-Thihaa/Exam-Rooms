import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Room } from "@/services/Roomqueries";

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Room, "room_id">) => void;
  mode: "create" | "edit";
  initialData?: Room | null;
}

type RoomTypeOption = "Standard" | "Hall";

const ROOM_PRESETS: Record<RoomTypeOption, { capacity: string; rows: string; cols: string; room_type: string }> = {
  Standard: { capacity: "36", rows: "6", cols: "6", room_type: "Standard" },
  Hall:     { capacity: "82", rows: "82", cols: "1", room_type: "Hall" },
};

const RoomFormModal: React.FC<RoomFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    room_number: "",
    capacity: "36",
    room_type: "Standard",
    rows: "6",
    cols: "6",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialData) {
        setFormData({
          room_number: initialData.room_number,
          capacity: initialData.capacity.toString(),
          room_type: initialData.room_type || "Standard",
          rows: initialData.rows?.toString() || "6",
          cols: initialData.cols?.toString() || "6",
        });
      } else {
        // Default to Standard preset on create
        setFormData({
          room_number: "",
          ...ROOM_PRESETS.Standard,
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, initialData]);

  const handleRoomTypeSelect = (type: RoomTypeOption) => {
    setFormData((prev) => ({
      ...prev,
      ...ROOM_PRESETS[type],
    }));
    setErrors({});
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.room_number.trim()) {
      newErrors.room_number = "Room number is required";
    }

    const capacity = parseInt(formData.capacity);
    if (!formData.capacity || isNaN(capacity) || capacity <= 0) {
      newErrors.capacity = "Capacity must be a positive number";
    }

    const rows = parseInt(formData.rows);
    const cols = parseInt(formData.cols);

    if (!formData.rows || isNaN(rows) || rows <= 0) {
      newErrors.rows = "Rows must be a positive number";
    }
    if (!formData.cols || isNaN(cols) || cols <= 0) {
      newErrors.cols = "Columns must be a positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const roomData: Omit<Room, "room_id"> = {
      room_number: formData.room_number.trim(),
      capacity: parseInt(formData.capacity),
      room_type: formData.room_type.trim() || undefined,
      rows: formData.rows ? parseInt(formData.rows) : undefined,
      cols: formData.cols ? parseInt(formData.cols) : undefined,
    };

    onSubmit(roomData);
  };

  if (!isOpen) return null;

  const currentType = formData.room_type as RoomTypeOption;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {mode === "create" ? "Add New Room" : "Edit Room"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Room Type Selector — only show in create mode */}
          {mode === "create" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["Standard", "Hall"] as RoomTypeOption[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleRoomTypeSelect(type)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      currentType === type
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className={`font-semibold text-sm ${currentType === type ? "text-blue-700" : "text-gray-800"}`}>
                      {type}
                    </div>
                    <div className={`text-xs mt-0.5 ${currentType === type ? "text-blue-500" : "text-gray-500"}`}>
                      {type === "Standard"
                        ? "36 seats · 6 × 6"
                        : "82 seats · Hall layout"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Room Number */}
          <div>
            <label
              htmlFor="room_number"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Room Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="room_number"
              name="room_number"
              value={formData.room_number}
              onChange={handleChange}
              placeholder="e.g., A101, Hall A"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.room_number ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.room_number && (
              <p className="text-red-500 text-sm mt-1">{errors.room_number}</p>
            )}
          </div>

          {/* Capacity */}
          <div>
            <label
              htmlFor="capacity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Capacity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              placeholder="Number of seats"
              min="1"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.capacity ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.capacity && (
              <p className="text-red-500 text-sm mt-1">{errors.capacity}</p>
            )}
          </div>

          {/* Rows and Columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="rows"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Rows
              </label>
              <input
                type="number"
                id="rows"
                name="rows"
                value={formData.rows}
                onChange={handleChange}
                placeholder="Number of rows"
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.rows ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.rows && (
                <p className="text-red-500 text-sm mt-1">{errors.rows}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="cols"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Columns
              </label>
              <input
                type="number"
                id="cols"
                name="cols"
                value={formData.cols}
                onChange={handleChange}
                placeholder="Number of columns"
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.cols ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.cols && (
                <p className="text-red-500 text-sm mt-1">{errors.cols}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {mode === "create" ? "Create Room" : "Update Room"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomFormModal;