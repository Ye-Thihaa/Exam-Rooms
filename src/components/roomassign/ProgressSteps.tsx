import React from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";

interface ProgressStepsProps {
  currentStep: 1 | 2;
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-center gap-4">
        <div
          className={`flex items-center gap-2 ${
            currentStep >= 1 ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 1 ? "bg-primary text-white" : "bg-muted"
            }`}
          >
            {currentStep > 1 ? <CheckCircle2 className="h-5 w-5" /> : "1"}
          </div>
          <span className="font-medium">Select Rooms</span>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <div
          className={`flex items-center gap-2 ${
            currentStep >= 2 ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 2 ? "bg-primary text-white" : "bg-muted"
            }`}
          >
            2
          </div>
          <span className="font-medium">Student Pairing</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressSteps;
