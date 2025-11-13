import React from 'react';
import { ATPCreationResponse, AtpItem, TPCreationResponse, TPAnalysisItemFlat } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface ATPTableProps {
  atpData: ATPCreationResponse | null;
  tpAnalyses: TPCreationResponse | null; // Needed to map original TP to flat items
  onGenerateLessonPlan: (selectedATP: AtpItem) => void;
  isLoadingLessonPlan: boolean;
  className?: string;
}

const ATPTable: React.FC<ATPTableProps> = ({ atpData, tpAnalyses, onGenerateLessonPlan, isLoadingLessonPlan, className }) => {
  if (!atpData || atpData.atpList.length === 0) {
    return (
      <div className={`p-4 bg-yellow-50 text-yellow-800 rounded-lg ${className}`}>
        Tidak ada data Alur Tujuan Pembelajaran (ATP) untuk ditampilkan. Silakan generate TP terlebih dahulu dan kemudian generate ATP.
      </div>
    );
  }

  // Flatten the TP data to match 'no' for selection, if available
  let flatTPData: TPAnalysisItemFlat[] = [];
  if (tpAnalyses) {
    let globalNo = 0;
    flatTPData = tpAnalyses.cpAnalyses.flatMap(cpEntry => {
      return cpEntry.details.map(detail => {
        globalNo++;
        return {
          no: globalNo,
          capaianPembelajaranParent: cpEntry.capaianPembelajaran,
          kontenPembelajaran: detail.kontenPembelajaran,
          kompetensi: detail.kompetensi,
          materiPokok: detail.materiPokok,
          tujuanPembelajaran: detail.tujuanPembelajaran,
        };
      });
    });
  }

  return (
    <div className={`overflow-x-auto shadow-lg rounded-lg ${className}`}>
      <h3 className="text-xl font-semibold text-gray-800 p-4 bg-blue-50 border-b border-blue-100">
        Alur Tujuan Pembelajaran (ATP)
      </h3>
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              No
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tujuan Pembelajaran
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Indikator
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Materi Pokok
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nilai KBC
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Alokasi Waktu
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dimensi Profil Lulusan
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Asesmen
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sumber Belajar
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {atpData.atpList.map((item) => (
            <tr key={item.no}>
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {item.no}
              </td>
              <td className="px-4 py-4 text-sm text-gray-500">
                {item.tujuanPembelajaran}
              </td>
              <td className="px-4 py-4 text-sm text-gray-500">
                {item.indikator}
              </td>
              <td className="px-4 py-4 text-sm text-gray-500">
                {item.materiPokok}
              </td>
              <td className="px-4 py-4 text-sm text-gray-500">
                {item.nilaiKBC}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.alokasiWaktu}
              </td>
              <td className="px-4 py-4 text-sm text-gray-500">
                {item.dimensiProfilLulusan.join(', ')}
              </td>
              <td className="px-4 py-4 text-sm text-gray-500">
                {item.asesmen}
              </td>
              <td className="px-4 py-4 text-sm text-gray-500">
                {item.sumberBelajar}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => onGenerateLessonPlan(item)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoadingLessonPlan}
                >
                  {isLoadingLessonPlan ? <LoadingSpinner /> : `Buat PPM TP ${item.no}`}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ATPTable;