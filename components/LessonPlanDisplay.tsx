import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // For GitHub Flavored Markdown (tables, task lists, etc.)
import LoadingSpinner from './LoadingSpinner'; // Assuming you might need a spinner for export

interface LessonPlanDisplayProps {
  lessonPlans: string[];
  currentLessonPlanIndex: number;
  onSelectLessonPlan: (index: number) => void;
  onExportCurrentLessonPlan: (lessonPlanContent: string, tpNo: number) => void; // New prop for exporting
  isExportingSinglePPM: boolean; // New prop for loading state
  className?: string;
}

const LessonPlanDisplay: React.FC<LessonPlanDisplayProps> = ({
  lessonPlans,
  currentLessonPlanIndex,
  onSelectLessonPlan,
  onExportCurrentLessonPlan,
  isExportingSinglePPM,
  className,
}) => {
  if (lessonPlans.length === 0) {
    return (
      <div className={`p-4 bg-yellow-50 text-yellow-800 rounded-lg ${className}`}>
        Tidak ada Perencanaan Pembelajaran Mendalam (PPM) untuk ditampilkan. Silakan generate ATP dan pilih TP untuk membuat PPM.
      </div>
    );
  }

  const currentPlan = lessonPlans[currentLessonPlanIndex];

  return (
    <div className={`bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Perencanaan Pembelajaran Mendalam</h2>
        <div className="flex items-center space-x-4">
          {lessonPlans.length > 1 && (
            <div className="flex items-center space-x-2">
              <label htmlFor="tpSelector" className="text-sm font-medium text-gray-700">Pilih TP:</label>
              <select
                id="tpSelector"
                value={currentLessonPlanIndex}
                onChange={(e) => onSelectLessonPlan(parseInt(e.target.value))}
                className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1.5"
              >
                {lessonPlans.map((_, index) => (
                  <option key={index} value={index}>
                    TP {index + 1}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => onExportCurrentLessonPlan(currentPlan, currentLessonPlanIndex + 1)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            disabled={isExportingSinglePPM}
          >
            {isExportingSinglePPM ? <LoadingSpinner /> : 'Export to Word'}
          </button>
        </div>
      </div>

      <div className="prose max-w-none text-gray-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {currentPlan}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default LessonPlanDisplay;