import React from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import RoomRangesEnhanced from "@/components/RoomRanges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Info } from "lucide-react";

const RoomRangesPage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Room Ranges
          </h1>
          <p className="text-muted-foreground">
            View student number ranges assigned to each exam room
          </p>
        </div>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
                About Room Ranges
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-blue-800 dark:text-blue-200">
              This page displays the student number ranges for each exam room
              based on seating assignments. Each room can have a primary and
              secondary group with their respective student ranges. The ranges
              are automatically calculated from the seating assignments.
            </CardDescription>
          </CardContent>
        </Card>

        {/* Room Ranges Component */}
        <RoomRangesEnhanced />
      </div>
    </DashboardLayout>
  );
};

export default RoomRangesPage;
