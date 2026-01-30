import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface StudentStats {
  total: number;
  year1: number;
  year2: number;
  year3: number;
  year3_cs: number;
  year3_ct: number;
  year4: number;
  year4_programs: Record<string, number>;
}

interface StudentStatisticsCardProps {
  studentStats: StudentStats | null;
  loading: boolean;
}

const YearCard: React.FC<{
  title: string;
  count: number;
  details?: React.ReactNode;
}> = ({ title, count, details }) => (
  <div className="bg-muted rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold">{title}</h4>
      <Badge variant="outline">{count} students</Badge>
    </div>
    {details}
  </div>
);

const StudentStatisticsCard: React.FC<StudentStatisticsCardProps> = ({
  studentStats,
  loading,
}) => {
  return (
    <Card className="p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users className="h-5 w-5" />
        Student Statistics
      </h3>

      {loading && !studentStats ? (
        <div className="text-center py-8">
          <div className="animate-pulse text-muted-foreground">
            Loading student data...
          </div>
        </div>
      ) : studentStats ? (
        <div className="space-y-6">
          {/* Total Students */}
          <div className="bg-primary/5 rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Students</div>
            <div className="text-3xl font-bold text-primary">
              {studentStats.total}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Year 1 */}
            <YearCard
              title="First Year"
              count={studentStats.year1}
              details={
                <div className="text-sm text-muted-foreground">
                  Program: CST
                </div>
              }
            />

            {/* Year 2 */}
            <YearCard
              title="Second Year"
              count={studentStats.year2}
              details={
                <div className="text-sm text-muted-foreground">
                  Program: CST
                </div>
              }
            />

            {/* Year 3 */}
            <YearCard
              title="Third Year"
              count={studentStats.year3}
              details={
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CS:</span>
                    <span className="font-semibold">
                      {studentStats.year3_cs}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CT:</span>
                    <span className="font-semibold">
                      {studentStats.year3_ct}
                    </span>
                  </div>
                </div>
              }
            />

            {/* Year 4 */}
            <YearCard
              title="Fourth Year"
              count={studentStats.year4}
              details={
                <div className="space-y-1 mt-2 max-h-32 overflow-y-auto">
                  {Object.entries(studentStats.year4_programs)
                    .sort(([, a], [, b]) => b - a)
                    .map(([program, count]) => (
                      <div
                        key={program}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {program}:
                        </span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                </div>
              }
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No data loaded
        </div>
      )}
    </Card>
  );
};

export default StudentStatisticsCard;
