import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>

          <h2 className="text-xl font-bold text-center mb-2">
            Delete {itemType}?
          </h2>

          <p className="text-gray-600 text-center mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{itemName}</span>? This action
            cannot be undone.
          </p>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
