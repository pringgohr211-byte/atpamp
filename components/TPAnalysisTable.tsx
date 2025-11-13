import React from 'react';
import { TPCreationResponse, TPAnalysisItemFlat } from '../types';

interface TPAnalysisTableProps {
  data: TPCreationResponse | null;
  className?: string;
}

const TPAnalysisTable: React.FC<TPAnalysisTableProps> = ({ data, className }) => {
  if (!data || data.cpAnalyses.length === 0) {
    return (
      <div className={`p-4 bg-yellow-50 text-yellow-800 rounded-lg ${className}`}>
        Tidak ada data Tujuan Pembelajaran untuk ditampilkan. Silakan generate terlebih dahulu.
      </div>
    );
  }

  // Flatten the data for easier table rendering, keeping track of parent CP
  let globalNo = 0;
  const flatData: TPAnalysisItemFlat[] = data.cpAnalyses.flatMap(cpEntry => {
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

  return (
    <div className={`overflow-x-auto shadow-lg rounded-lg ${className}`}>
      <h3 className="text-xl font-semibold text-gray-800 p-4 bg-blue-50 border-b border-blue-100">
        Hasil Analisis Tujuan Pembelajaran ({data.semester} Semester)
      </h3>
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              No
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Capaian Pembelajaran
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Konten Pembelajaran
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kompetensi
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Materi Pokok
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tujuan Pembelajaran
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {flatData.map((item) => (
            <tr key={item.no}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {item.no}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {item.capaianPembelajaranParent}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {item.kontenPembelajaran}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {item.kompetensi}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {item.materiPokok}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {item.tujuanPembelajaran}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TPAnalysisTable;