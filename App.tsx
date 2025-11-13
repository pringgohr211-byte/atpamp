import React, { useState, useCallback, useEffect } from 'react';
import {
  InputFormState,
  TPCreationResponse,
  ATPCreationResponse,
  AtpItem,
  TPAnalysisItemFlat,
} from './types';
import { generateTPAnalysis, generateATP, generateLessonPlan } from './services/geminiService';
import { createWordDocumentAllCurriculum, createWordDocumentSingleLessonPlan, downloadWordDocument } from './services/docxService'; // Import docxService
import InputForm from './components/InputForm';
import TPAnalysisTable from './components/TPAnalysisTable';
import ATPTable from './components/ATPTable';
import LessonPlanDisplay from './components/LessonPlanDisplay';
import TabbedNavigation from './components/TabbedNavigation';
import LoadingSpinner from './components/LoadingSpinner';
import { DEFAULT_GURU_NAME } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Input Form'); // Changed default to Input Form
  const [formData, setFormData] = useState<InputFormState | null>(null);

  const [tpAnalysisResult, setTpAnalysisResult] = useState<TPCreationResponse | null>(null);
  const [atpResult, setAtpResult] = useState<ATPCreationResponse | null>(null);
  const [lessonPlans, setLessonPlans] = useState<string[]>([]); // Array of Markdown strings
  const [currentLessonPlanIndex, setCurrentLessonPlanIndex] = useState(0);

  const [isLoadingTP, setIsLoadingTP] = useState(false);
  const [isLoadingATP, setIsLoadingATP] = useState(false);
  const [isLoadingLessonPlan, setIsLoadingLessonPlan] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false); // State for global export loading
  const [isExportingSinglePPM, setIsExportingSinglePPM] = useState(false); // State for single PPM export loading


  const [errorTP, setErrorTP] = useState<string | null>(null);
  const [errorATP, setErrorATP] = useState<string | null>(null);
  const [errorLessonPlan, setErrorLessonPlan] = useState<string | null>(null);

  const guruName = formData?.namaGuru || DEFAULT_GURU_NAME;

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrorTP(null);
    setErrorATP(null);
    setErrorLessonPlan(null);
  }, []);

  const handleGenerateTP = useCallback(async (data: InputFormState) => {
    setIsLoadingTP(true);
    setErrorTP(null);
    setFormData(data); // Store form data for subsequent generations
    setTpAnalysisResult(null); // Clear previous results
    setAtpResult(null);
    setLessonPlans([]);
    setCurrentLessonPlanIndex(0);

    try {
      const result = await generateTPAnalysis(data);
      setTpAnalysisResult(result);
      setActiveTab('Tujuan Pembelajaran'); // Switch to TP tab after generation
    } catch (err: any) {
      console.error("Error generating TP:", err);
      setErrorTP(err.message || "Gagal menghasilkan Tujuan Pembelajaran.");
    } finally {
      setIsLoadingTP(false);
    }
  }, []);

  const handleGenerateATP = useCallback(async () => {
    if (!formData || !tpAnalysisResult) {
      setErrorATP("Mohon lengkapi form dan hasilkan Tujuan Pembelajaran terlebih dahulu.");
      setActiveTab('Input Form'); // Redirect to input form if data is missing
      return;
    }

    setIsLoadingATP(true);
    setErrorATP(null);
    setAtpResult(null); // Clear previous results
    setLessonPlans([]);
    setCurrentLessonPlanIndex(0);

    try {
      const result = await generateATP(formData, tpAnalysisResult.cpAnalyses);
      setAtpResult(result);
      setActiveTab('Alur Tujuan Pelajaran'); // Switch to ATP tab after generation
    } catch (err: any) {
      console.error("Error generating ATP:", err);
      setErrorATP(err.message || "Gagal menghasilkan Alur Tujuan Pelajaran.");
    } finally {
      setIsLoadingATP(false);
    }
  }, [formData, tpAnalysisResult]);


  const handleGenerateLessonPlan = useCallback(async (selectedATP: AtpItem) => {
    if (!formData) {
      setErrorLessonPlan("Form data tidak ditemukan. Mohon ulangi proses dari awal.");
      setActiveTab('Input Form'); // Redirect to input form if data is missing
      return;
    }

    setIsLoadingLessonPlan(true);
    setErrorLessonPlan(null);

    try {
      const newLessonPlan = await generateLessonPlan(formData, selectedATP);
      setLessonPlans(prev => {
        const updatedPlans = [...prev, newLessonPlan];
        setCurrentLessonPlanIndex(updatedPlans.length - 1); // Select the newly added plan
        return updatedPlans;
      });
      setActiveTab('Perencanaan Pembelajaran Mendalam'); // Switch to Lesson Plan tab
    } catch (err: any) {
      console.error("Error generating Lesson Plan:", err);
      setErrorLessonPlan(err.message || "Gagal menghasilkan Perencanaan Pembelajaran Mendalam.");
    } finally {
      setIsLoadingLessonPlan(false);
    }
  }, [formData]);

  const handleExportAllToWord = useCallback(async () => {
    setIsExportingAll(true);
    try {
      const doc = await createWordDocumentAllCurriculum({
        formData,
        tpAnalysisResult,
        atpResult,
      });
      const filename = `Kurikulum_Mendalam_Rekap_${formData?.mataPelajaran || 'Generated'}_${formData?.tahunPelajaran || 'Tahun'}.docx`;
      await downloadWordDocument(doc, filename);
    } catch (err: any) {
      console.error("Error exporting all curriculum to Word:", err);
      alert("Gagal mengekspor dokumen Word: " + (err.message || "Terjadi kesalahan."));
    } finally {
      setIsExportingAll(false);
    }
  }, [formData, tpAnalysisResult, atpResult]);

  const handleExportSingleLessonPlan = useCallback(async (lessonPlanContent: string, tpNo: number) => {
    setIsExportingSinglePPM(true);
    try {
      const doc = await createWordDocumentSingleLessonPlan(lessonPlanContent, tpNo, formData);
      const filename = `PPM_TP_${tpNo}_${formData?.mataPelajaran || 'Pelajaran'}_${formData?.tahunPelajaran || 'Tahun'}.docx`;
      await downloadWordDocument(doc, filename);
    } catch (err: any) {
      console.error(`Error exporting single lesson plan TP ${tpNo} to Word:`, err);
      alert("Gagal mengekspor Perencanaan Pembelajaran Mendalam ke Word: " + (err.message || "Terjadi kesalahan."));
    } finally {
      setIsExportingSinglePPM(false);
    }
  }, [formData]);


  const tabs = ['Input Form', 'Tujuan Pembelajaran', 'Alur Tujuan Pelajaran', 'Perencanaan Pembelajaran Mendalam'];

  // Determine if global export button should be enabled (only based on TP/ATP, not PPM)
  const canExportAll = !!tpAnalysisResult || !!atpResult;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm py-4 px-6 md:px-8 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl font-extrabold text-blue-700 leading-tight mb-2 sm:mb-0">
            Aplikasi Tujuan & Perencanaan Pembelajaran Mendalam
          </h1>
          <p className="text-lg text-gray-600">Oleh: {guruName}</p>
        </div>
        <div className="max-w-7xl mx-auto mt-4 flex justify-end">
          <button
            onClick={handleExportAllToWord}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            disabled={!canExportAll || isExportingAll}
          >
            {isExportingAll ? <LoadingSpinner /> : 'Export Rekap Kurikulum ke Word'}
          </button>
        </div>
      </header>

      <main className="flex-grow p-6 md:p-8 max-w-7xl mx-auto w-full">
        <TabbedNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-8">
          {activeTab === 'Input Form' && (
            <InputForm
              onSubmit={handleGenerateTP}
              isLoading={isLoadingTP}
              error={errorTP}
              onClearError={clearErrors}
              initialState={formData || undefined}
            />
          )}

          {activeTab === 'Tujuan Pembelajaran' && (
            <div className="space-y-6">
              {isLoadingTP && <LoadingSpinner />}
              {errorTP && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline ml-2">{errorTP}</span>
                </div>
              )}
              <TPAnalysisTable data={tpAnalysisResult} />
              {tpAnalysisResult && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleGenerateATP}
                    className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoadingATP}
                  >
                    {isLoadingATP ? <LoadingSpinner /> : 'Hasilkan Alur Tujuan Pelajaran (ATP)'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Alur Tujuan Pelajaran' && (
            <div className="space-y-6">
              {isLoadingATP && <LoadingSpinner />}
              {errorATP && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline ml-2">{errorATP}</span>
                </div>
              )}
              <ATPTable
                atpData={atpResult}
                tpAnalyses={tpAnalysisResult}
                onGenerateLessonPlan={handleGenerateLessonPlan}
                isLoadingLessonPlan={isLoadingLessonPlan}
              />
            </div>
          )}

          {activeTab === 'Perencanaan Pembelajaran Mendalam' && (
            <div className="space-y-6">
              {isLoadingLessonPlan && <LoadingSpinner />}
              {errorLessonPlan && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline ml-2">{errorLessonPlan}</span>
                </div>
              )}
              <LessonPlanDisplay
                lessonPlans={lessonPlans}
                currentLessonPlanIndex={currentLessonPlanIndex}
                onSelectLessonPlan={setCurrentLessonPlanIndex}
                onExportCurrentLessonPlan={handleExportSingleLessonPlan}
                isExportingSinglePPM={isExportingSinglePPM}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;