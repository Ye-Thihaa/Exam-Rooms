import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Room } from "@/services/Roomqueries";
import { DoorOpen, CheckCircle2, ArrowRight } from "lucide-react";

interface RoomSelectionStepProps {
  availableRooms: Room[];
  selectedRooms: Room[];
  onToggleRoom: (room: Room) => void;
  onProceed: () => void;
}

const RoomCard: React.FC<{
  room: Room;
  isSelected: boolean;
  onToggle: () => void;
}> = ({ room, isSelected, onToggle }) => (
  <div
    onClick={onToggle}
    className={`
      border-2 rounded-lg p-4 cursor-pointer transition-all
      ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
    `}
  >
    <div className="flex items-start justify-between mb-2">
      <div className="font-semibold text-lg">{room.room_number}</div>
      {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
    </div>
    <div className="text-sm text-muted-foreground">
      Capacity: {room.capacity}
    </div>
    <div className="text-xs text-muted-foreground">
      {room.rows}×{room.cols} layout
    </div>
  </div>
);

const RoomSelectionStep: React.FC<RoomSelectionStepProps> = ({
  availableRooms,
  selectedRooms,
  onToggleRoom,
  onProceed,
}) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DoorOpen className="h-5 w-5" />
            Select Rooms
          </h3>
          <Badge variant="outline">{selectedRooms.length} selected</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {availableRooms.map((room) => {
            const isSelected = selectedRooms.some(
              (r) => r.room_id === room.room_id,
            );
            return (
              <RoomCard
                key={room.room_id}
                room={room}
                isSelected={isSelected}
                onToggle={() => onToggleRoom(room)}
              />
            );
          })}
        </div>

        <Button
          onClick={onProceed}
          disabled={selectedRooms.length === 0}
          className="w-full"
        >
          Continue to Student Pairing
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
};

export default RoomSelectionStep;
