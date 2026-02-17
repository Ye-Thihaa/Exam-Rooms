import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface StudentStats {
  total: number;
  year1: number;
  year1_assigned: number;
  year1_unassigned: number;
  year2: number;
  year2_assigned: number;
  year2_unassigned: number;
  year3: number;
  year3_cs: number;
  year3_cs_assigned: number;
  year3_cs_unassigned: number;
  year3_ct: number;
  year3_ct_assigned: number;
  year3_ct_unassigned: number;
  year4: number;
  year4_programs: Record<string, number>;
  year4_specializations: Record<string, { total: number; assigned: number }>;
}

interface StudentStatisticsCardProps {
  studentStats: StudentStats | null;
  loading: boolean;
}

const StudentStatisticsCard: React.FC<StudentStatisticsCardProps> = ({
  studentStats,
  loading,
}) => {
  if (loading) {
    return (
      <Card className="p-6 mb-6 border border-green-200">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <span className="ml-3 text-gray-600">
            Loading student statistics...
          </span>
        </div>
      </Card>
    );
  }

  if (!studentStats) return null;

  const totalAssigned =
    studentStats.year1_assigned +
    studentStats.year2_assigned +
    studentStats.year3_cs_assigned +
    studentStats.year3_ct_assigned +
    Object.values(studentStats.year4_specializations).reduce(
      (sum, spec) => sum + spec.assigned,
      0,
    );

  const totalUnassigned =
    studentStats.year1_unassigned +
    studentStats.year2_unassigned +
    studentStats.year3_cs_unassigned +
    studentStats.year3_ct_unassigned +
    Object.values(studentStats.year4_specializations).reduce(
      (sum, spec) => sum + (spec.total - spec.assigned),
      0,
    );

  const progressPercent = Math.round(
    (totalAssigned / studentStats.total) * 100,
  );

  return (
    <Card className="p-6 mb-6 border border-green-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Student Statistics
        </h3>
        <Badge
          variant="outline"
          className="ml-auto border-green-300 text-green-700 bg-green-50"
        >
          Total: {studentStats.total} students
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* First Year */}
        <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800">First Year</h4>
            <Badge className="bg-green-600 text-white">
              {studentStats.year1}
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="font-medium text-gray-700 mb-1">
                CST{" "}
                <span className="text-gray-400 font-normal">
                  ({studentStats.year1})
                </span>
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Sem 1</span>
                <span className="text-green-700 font-medium">
                  {studentStats.year1_assigned}
                  <span className="text-gray-400 font-normal">
                    /{studentStats.year1}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Second Year */}
        <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800">Second Year</h4>
            <Badge className="bg-green-600 text-white">
              {studentStats.year2}
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="font-medium text-gray-700 mb-1">
                CST{" "}
                <span className="text-gray-400 font-normal">
                  ({studentStats.year2})
                </span>
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Sem 1</span>
                <span className="text-green-700 font-medium">
                  {studentStats.year2_assigned}
                  <span className="text-gray-400 font-normal">
                    /{studentStats.year2}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Third Year */}
        <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800">Third Year</h4>
            <Badge className="bg-green-600 text-white">
              {studentStats.year3}
            </Badge>
          </div>
          <div className="space-y-3 text-sm">
            {/* CS */}
            <div className="pb-2 border-b border-green-100">
              <p className="font-medium text-gray-700 mb-1">
                CS{" "}
                <span className="text-gray-400 font-normal">
                  ({studentStats.year3_cs})
                </span>
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Sem 1</span>
                <span className="text-green-700 font-medium">
                  {studentStats.year3_cs_assigned}
                  <span className="text-gray-400 font-normal">
                    /{studentStats.year3_cs}
                  </span>
                </span>
              </div>
            </div>
            {/* CT */}
            <div>
              <p className="font-medium text-gray-700 mb-1">
                CT{" "}
                <span className="text-gray-400 font-normal">
                  ({studentStats.year3_ct})
                </span>
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Sem 1</span>
                <span className="text-green-700 font-medium">
                  {studentStats.year3_ct_assigned}
                  <span className="text-gray-400 font-normal">
                    /{studentStats.year3_ct}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fourth Year */}
        <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800">Fourth Year</h4>
            <Badge className="bg-green-600 text-white">
              {studentStats.year4}
            </Badge>
          </div>
          <div className="space-y-3 text-sm">
            {/* CS Specializations */}
            <div className="pb-2 border-b border-green-100">
              <p className="font-medium text-gray-700 mb-1">
                CS{" "}
                <span className="text-gray-400 font-normal">
                  ({studentStats.year4_programs["Computer Science"] || 0})
                </span>
              </p>
              <div className="space-y-1">
                {["SE", "KE", "BIS", "HPC"].map((spec) => {
                  const data = studentStats.year4_specializations[spec];
                  if (!data || data.total === 0) return null;
                  return (
                    <div
                      key={spec}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-gray-600">{spec}</span>
                      <span className="text-green-700 font-medium">
                        {data.assigned}
                        <span className="text-gray-400 font-normal">
                          /{data.total}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* CT Specializations */}
            <div>
              <p className="font-medium text-gray-700 mb-1">
                CT{" "}
                <span className="text-gray-400 font-normal">
                  ({studentStats.year4_programs["Computer Technology"] || 0})
                </span>
              </p>
              <div className="space-y-1">
                {["CN", "CSEC", "ES"].map((spec) => {
                  const data = studentStats.year4_specializations[spec];
                  if (!data || data.total === 0) return null;
                  return (
                    <div
                      key={spec}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-gray-600">{spec}</span>
                      <span className="text-green-700 font-medium">
                        {data.assigned}
                        <span className="text-gray-400 font-normal">
                          /{data.total}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="mt-6 pt-4 border-t border-green-100">
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Assignment Progress</span>
            <span className="font-semibold text-green-700">
              {progressPercent}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-green-100">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-gray-600">
              Total Assigned:{" "}
              <span className="font-semibold text-green-700">
                {totalAssigned}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-orange-500" />
            <span className="text-gray-600">
              Total Unassigned:{" "}
              <span className="font-semibold text-orange-600">
                {totalUnassigned}
              </span>
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StudentStatisticsCard;
