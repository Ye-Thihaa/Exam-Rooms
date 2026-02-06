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
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">
            Loading student statistics...
          </span>
        </div>
      </Card>
    );
  }

  if (!studentStats) {
    return null;
  }

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Student Statistics
        </h3>
        <Badge variant="outline" className="ml-auto">
          Total: {studentStats.total} students
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* First Year */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-blue-900">First Year</h4>
            <Badge className="bg-blue-600 text-white">
              {studentStats.year1}
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-blue-800">Semester 1 - CST</span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>Assigned: {studentStats.year1_assigned}</span>
            </div>
            <div className="flex items-center gap-2 text-orange-700">
              <XCircle className="h-4 w-4" />
              <span>Unassigned: {studentStats.year1_unassigned}</span>
            </div>
          </div>
        </div>

        {/* Second Year */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-purple-900">Second Year</h4>
            <Badge className="bg-purple-600 text-white">
              {studentStats.year2}
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-purple-800">Semester 1 - CST</span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>Assigned: {studentStats.year2_assigned}</span>
            </div>
            <div className="flex items-center gap-2 text-orange-700">
              <XCircle className="h-4 w-4" />
              <span>Unassigned: {studentStats.year2_unassigned}</span>
            </div>
          </div>
        </div>

        {/* Third Year */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-green-900">Third Year</h4>
            <Badge className="bg-green-600 text-white">
              {studentStats.year3}
            </Badge>
          </div>
          <div className="space-y-3 text-sm">
            <div className="border-b border-green-300 pb-2">
              <div className="font-medium text-green-800 mb-1">
                CS: {studentStats.year3_cs}
              </div>
              <div className="flex items-center gap-2 text-green-700 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                <span>Assigned: {studentStats.year3_cs_assigned}</span>
              </div>
              <div className="flex items-center gap-2 text-orange-700 text-xs">
                <XCircle className="h-3 w-3" />
                <span>Unassigned: {studentStats.year3_cs_unassigned}</span>
              </div>
            </div>
            <div>
              <div className="font-medium text-green-800 mb-1">
                CT: {studentStats.year3_ct}
              </div>
              <div className="flex items-center gap-2 text-green-700 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                <span>Assigned: {studentStats.year3_ct_assigned}</span>
              </div>
              <div className="flex items-center gap-2 text-orange-700 text-xs">
                <XCircle className="h-3 w-3" />
                <span>Unassigned: {studentStats.year3_ct_unassigned}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fourth Year */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-orange-900">Fourth Year</h4>
            <Badge className="bg-orange-600 text-white">
              {studentStats.year4}
            </Badge>
          </div>
          <div className="space-y-3 text-sm">
            {/* CS Specializations */}
            <div className="border-b border-orange-300 pb-2">
              <div className="font-medium text-orange-800 mb-2">
                CS ({studentStats.year4_programs["Computer Science"] || 0})
              </div>
              <div className="space-y-1 text-xs">
                {["SE", "KE", "BIS", "HPC"].map((spec) => {
                  const data = studentStats.year4_specializations[spec];
                  if (!data || data.total === 0) return null;
                  return (
                    <div
                      key={spec}
                      className="flex items-center justify-between"
                    >
                      <span className="text-orange-700">{spec}:</span>
                      <span className="text-green-700">
                        {data.assigned}/{data.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* CT Specializations */}
            <div>
              <div className="font-medium text-orange-800 mb-2">
                CT ({studentStats.year4_programs["Computer Technology"] || 0})
              </div>
              <div className="space-y-1 text-xs">
                {["CN", "CSEC", "ES"].map((spec) => {
                  const data = studentStats.year4_specializations[spec];
                  if (!data || data.total === 0) return null;
                  return (
                    <div
                      key={spec}
                      className="flex items-center justify-between"
                    >
                      <span className="text-orange-700">{spec}:</span>
                      <span className="text-green-700">
                        {data.assigned}/{data.total}
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
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-gray-700">
                Total Assigned:{" "}
                <span className="font-semibold text-green-700">
                  {studentStats.year1_assigned +
                    studentStats.year2_assigned +
                    studentStats.year3_cs_assigned +
                    studentStats.year3_ct_assigned +
                    Object.values(studentStats.year4_specializations).reduce(
                      (sum, spec) => sum + spec.assigned,
                      0,
                    )}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-orange-600" />
              <span className="text-gray-700">
                Total Unassigned:{" "}
                <span className="font-semibold text-orange-700">
                  {studentStats.year1_unassigned +
                    studentStats.year2_unassigned +
                    studentStats.year3_cs_unassigned +
                    studentStats.year3_ct_unassigned +
                    Object.values(studentStats.year4_specializations).reduce(
                      (sum, spec) => sum + (spec.total - spec.assigned),
                      0,
                    )}
                </span>
              </span>
            </div>
          </div>
          <div className="text-gray-500">
            Assignment Progress:{" "}
            <span className="font-semibold text-blue-600">
              {Math.round(
                ((studentStats.year1_assigned +
                  studentStats.year2_assigned +
                  studentStats.year3_cs_assigned +
                  studentStats.year3_ct_assigned +
                  Object.values(studentStats.year4_specializations).reduce(
                    (sum, spec) => sum + spec.assigned,
                    0,
                  )) /
                  studentStats.total) *
                  100,
              )}
              %
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StudentStatisticsCard;
