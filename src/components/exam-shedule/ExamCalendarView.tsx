import React, { useState, useMemo } from "react";
import { Exam } from "@/services/examQueries";

interface ExamCalendarViewProps {
  exams: Exam[];
}

export const ExamCalendarView: React.FC<ExamCalendarViewProps> = ({
  exams,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Group exams by date
  const examsByDate = useMemo(() => {
    const grouped: Record<string, Exam[]> = {};
    exams.forEach((exam) => {
      if (!grouped[exam.exam_date]) {
        grouped[exam.exam_date] = [];
      }
      grouped[exam.exam_date].push(exam);
    });
    return grouped;
  }, [exams]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: Date[] = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentMonth]);

  const changeMonth = (offset: number) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Today
          </button>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            const dateKey = formatDateKey(date);
            const dayExams = examsByDate[dateKey] || [];
            const isTodayDate = isToday(date);
            const isInCurrentMonth = isCurrentMonth(date);

            return (
              <div
                key={index}
                className={`min-h-24 border rounded-lg p-2 ${
                  isInCurrentMonth ? "bg-white" : "bg-gray-50"
                } ${isTodayDate ? "ring-2 ring-blue-500" : ""}`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    isInCurrentMonth ? "text-gray-900" : "text-gray-400"
                  } ${isTodayDate ? "text-blue-600" : ""}`}
                >
                  {date.getDate()}
                </div>

                {dayExams.length > 0 && (
                  <div className="space-y-1">
                    {dayExams.slice(0, 2).map((exam, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-blue-100 text-blue-800 rounded px-1.5 py-1 truncate"
                        title={`${exam.exam_name} (${exam.start_time})`}
                      >
                        {exam.subject_code}
                      </div>
                    ))}
                    {dayExams.length > 2 && (
                      <div className="text-xs text-gray-500 px-1.5">
                        +{dayExams.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t bg-gray-50 rounded-b-lg">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded"></div>
            <span>Exam Scheduled</span>
          </div>
        </div>
      </div>
    </div>
  );
};
