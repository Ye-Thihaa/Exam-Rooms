import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Download, RefreshCw } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  teacherAssignmentTableQueries,
  TeacherAssignmentWithRoom,
} from "@/services/teacherAssignmentTableQueries";

const TeacherAssignmentsTable: React.FC = () => {
  const [assignments, setAssignments] = useState<TeacherAssignmentWithRoom[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await teacherAssignmentTableQueries.getAllWithRoomDetails();
      setAssignments(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load assignments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const exportToPDF = async () => {
    if (!tbodyRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(tbodyRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        position,
        imgWidth,
        imgHeight,
      );
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          0,
          position,
          imgWidth,
          imgHeight,
        );
        heightLeft -= pageHeight;
      }

      const timestamp = new Date().toISOString().split("T")[0];
      pdf.save(`Teacher_Assignments_${timestamp}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading assignments...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={() => load()} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      );
    }

    if (assignments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
          <p className="text-sm">No teacher assignments found.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r">
                Day / Date
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r">
                Teacher Name
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r">
                Rank
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r">
                Role
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r">
                Assigned Room
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Session
              </th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {assignments.map((a, idx) => {
              const date = a.exam_date ?? "—";
              const dayOfWeek = a.exam_date
                ? new Date(a.exam_date).toLocaleDateString("en-US", {
                    weekday: "long",
                  })
                : "—";

              return (
                <tr
                  key={a.assignment_id}
                  className={`border-b last:border-b-0 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
                >
                  <td className="px-4 py-3 border-r align-top">
                    <div className="font-medium text-gray-800">{dayOfWeek}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{date}</div>
                  </td>

                  <td className="px-4 py-3 border-r align-top">
                    <div className="font-medium text-gray-800">
                      {a.teacher?.name ?? "—"}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {a.teacher?.department ?? ""}
                    </div>
                  </td>

                  <td className="px-4 py-3 border-r align-top">
                    <span className="text-sm text-gray-700">
                      {a.teacher?.rank ?? "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3 border-r align-top">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        a.role === "Supervisor"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {a.role}
                    </span>
                  </td>

                  <td className="px-4 py-3 border-r align-top">
                    <span className="font-medium text-gray-800">
                      {a.room_number ?? "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        a.session === "Morning"
                          ? "bg-amber-100 text-amber-700"
                          : a.session === "Afternoon"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {a.session ?? "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Teacher Assignments</h2>
          <div className="flex gap-2">
            <Button
              onClick={exportToPDF}
              disabled={exporting || assignments.length === 0}
              size="sm"
              className="gap-1.5"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exporting ? "Exporting..." : "Export PDF"}
            </Button>
            <Button
              onClick={() => load(true)}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default TeacherAssignmentsTable;
