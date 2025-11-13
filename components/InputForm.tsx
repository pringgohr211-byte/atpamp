import React, { useState, useEffect, useCallback } from 'react';
import {
  InputFormState,
  Fase,
  Kelas,
  Semester,
} from '../types';
import {
  FASE_OPTIONS,
  KELAS_OPTIONS,
  SEMESTER_OPTIONS,
  DEFAULT_MADRASAH_NAME,
  DEFAULT_GURU_NAME,
  DEFAULT_TAHUN_PELAJARAN
} from '../constants';
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/react/20/solid';
import LoadingSpinner from './LoadingSpinner';

interface InputFormProps {
  initialState?: InputFormState;
  onSubmit: (formData: InputFormState) => void;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
}

const InputForm: React.FC<InputFormProps> = ({ initialState, onSubmit, isLoading, error, onClearError }) => {
  const [formData, setFormData] = useState<InputFormState>(initialState || {
    namaMadrasah: DEFAULT_MADRASAH_NAME,
    namaGuru: DEFAULT_GURU_NAME,
    mataPelajaran: '',
    fase: '',
    kelas: '',
    tahunPelajaran: DEFAULT_TAHUN_PELAJARAN,
    semester: '',
    capaianPembelajaran: [''],
  });

  // Ensure `kelas` options update when `fase` changes
  useEffect(() => {
    if (formData.fase && !KELAS_OPTIONS[formData.fase as Fase].some(k => k.value === formData.kelas)) {
      setFormData(prev => ({ ...prev, kelas: '' }));
    }
  }, [formData.fase]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, index?: number) => {
    onClearError(); // Clear error on any input change
    const { name, value } = e.target;
    if (name === 'capaianPembelajaran' && index !== undefined) {
      const newCps = [...formData.capaianPembelajaran];
      newCps[index] = value;
      setFormData({ ...formData, capaianPembelajaran: newCps });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  }, [formData, onClearError]);

  const addCapaianPembelajaran = useCallback(() => {
    if (formData.capaianPembelajaran.length < 6) {
      setFormData({ ...formData, capaianPembelajaran: [...formData.capaianPembelajaran, ''] });
    }
  }, [formData]);

  const removeCapaianPembelajaran = useCallback((index: number) => {
    if (formData.capaianPembelajaran.length > 1) {
      const newCps = formData.capaianPembelajaran.filter((_, i) => i !== index);
      setFormData({ ...formData, capaianPembelajaran: newCps });
    }
  }, [formData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.capaianPembelajaran.some(cp => cp.trim() !== '')) {
      // Basic validation for at least one CP
      alert('Mohon isi setidaknya satu Capaian Pembelajaran.');
      return;
    }
    onSubmit(formData);
  }, [formData, onSubmit]);

  const renderInputField = (label: string, name: keyof InputFormState, type: string = 'text', isRequired: boolean = true) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {isRequired && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name] as string}
        onChange={handleChange}
        required={isRequired}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
        disabled={isLoading}
      />
    </div>
  );

  const renderSelectField = (label: string, name: keyof InputFormState, options: { label: string; value: string }[], isRequired: boolean = true) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {isRequired && <span className="text-red-500">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={formData[name] as string}
        onChange={handleChange}
        required={isRequired}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white"
        disabled={isLoading}
      >
        <option value="">Pilih {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Form Input Kurikulum</h2>
      <p className="text-sm text-gray-600 mb-4 text-center">Isi detail di bawah untuk menghasilkan Tujuan Pembelajaran mendalam.</p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}

      {renderInputField('Nama Madrasah', 'namaMadrasah')}
      {renderInputField('Nama Guru', 'namaGuru')}
      {renderInputField('Mata Pelajaran', 'mataPelajaran')}
      {renderSelectField('Fase', 'fase', FASE_OPTIONS)}
      {renderSelectField('Kelas', 'kelas', formData.fase ? KELAS_OPTIONS[formData.fase as Fase] : [])}
      {renderInputField('Tahun Pelajaran', 'tahunPelajaran')}
      {renderSelectField('Semester', 'semester', SEMESTER_OPTIONS)}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Capaian Pembelajaran (Maksimal 6) <span className="text-red-500">*</span>
        </label>
        {formData.capaianPembelajaran.map((cp, index) => (
          <div key={index} className="flex items-center mb-3">
            <textarea
              name="capaianPembelajaran"
              rows={2}
              value={cp}
              onChange={(e) => handleChange(e, index)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 resize-y"
              placeholder={`Capaian Pembelajaran ${index + 1}`}
              disabled={isLoading}
            />
            {formData.capaianPembelajaran.length > 1 && (
              <button
                type="button"
                onClick={() => removeCapaianPembelajaran(index)}
                className="ml-2 text-red-500 hover:text-red-700 focus:outline-none"
                disabled={isLoading}
              >
                <MinusCircleIcon className="h-6 w-6" />
              </button>
            )}
            {index === formData.capaianPembelajaran.length - 1 && formData.capaianPembelajaran.length < 6 && (
              <button
                type="button"
                onClick={addCapaianPembelajaran}
                className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none"
                disabled={isLoading}
              >
                <PlusCircleIcon className="h-6 w-6" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-6">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? <LoadingSpinner /> : 'Hasilkan Tujuan Pembelajaran'}
        </button>
      </div>
    </form>
  );
};

export default InputForm;