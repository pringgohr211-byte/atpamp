import { Modality } from '@google/genai';

export enum Fase {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
}

export enum Kelas {
  _1 = '1',
  _2 = '2',
  _3 = '3',
  _4 = '4',
  _5 = '5',
  _6 = '6',
  _7 = '7',
  _8 = '8',
  _9 = '9',
  _10 = '10',
  _11 = '11',
  _12 = '12',
}

export enum Semester {
  Ganjil = 'Ganjil',
  Genap = 'Genap',
}

export enum NilaiKBC {
  CintaAllahDanRasulNya = 'Cinta Allah dan Rasul-Nya',
  CintaIlmu = 'Cinta Ilmu',
  CintaDiriDanSesama = 'Cinta Diri dan Sesama',
  CintaAlam = 'Cinta Alam',
  CintaBangsaDanNegara = 'Cinta Bangsa dan Negara',
}

export enum DimensiProfilLulusan {
  KeimananKetakwaanYME = 'Keimanan dan Ketakwaan terhadap Tuhan YME',
  Kewargaan = 'Kewargaan',
  PenalaranKritis = 'Penalaran Kritis',
  Kreativitas = 'Kreativitas',
  Kolaborasi = 'Kolaborasi',
  Kemandirian = 'Kemandirian',
  Kesehatan = 'Kesehatan',
  Komunikasi = 'Komunikasi',
}

export interface InputFormState {
  namaMadrasah: string;
  namaGuru: string;
  mataPelajaran: string;
  fase: Fase | '';
  kelas: Kelas | '';
  tahunPelajaran: string;
  semester: Semester | '';
  capaianPembelajaran: string[];
}

export interface CapaianPembelajaranDetail {
  no: number; // 1 to 6 per CP
  kontenPembelajaran: string;
  kompetensi: string;
  materiPokok: string;
  tujuanPembelajaran: string; // KBC integrated
}

export interface CPAnalysisEntry {
  capaianPembelajaran: string;
  details: CapaianPembelajaranDetail[]; // Array of 6 items
}

export interface TPCreationResponse {
  semester: Semester;
  cpAnalyses: CPAnalysisEntry[]; // Array of CP analyses
}

export interface TPAnalysisItemFlat {
  no: number; // Global number for display in table
  capaianPembelajaranParent: string; // The original CP it belongs to
  kontenPembelajaran: string;
  kompetensi: string;
  materiPokok: string;
  tujuanPembelajaran: string;
}

export interface AtpItem {
  no: number;
  tujuanPembelajaran: string;
  indikator: string;
  materiPokok: string;
  nilaiKBC: string; // Explanation of relevant KBC values
  alokasiWaktu: string; // e.g., "90 Menit (2 JP)"
  dimensiProfilLulusan: DimensiProfilLulusan[]; // Array of selected dimensions
  asesmen: string;
  sumberBelajar: string;
}

export interface ATPCreationResponse {
  atpList: AtpItem[];
}

// Lesson Plan Interfaces (for Gemini's JSON response, if structured)
export interface PraktikPedagogis {
  model: string;
  strategi: string;
  metode: string;
}

export interface KemitraanPembelajaranItem {
  pihak: string;
  penjelasan: string;
}

export interface LingkunganPembelajaran {
  fisik: string;
  virtual: string;
  budayaBelajar: string;
}

export interface PengalamanBelajarKegiatan {
  nama: string; // e.g., "Kegiatan Awal"
  alokasiWaktuMenit: number;
  deskripsi: string; // Markdown content describing activities
}

export interface AsesmenPembelajaran {
  asesmenAwal: string;
  asesmenProses: string; // Formatif dan Sikap
  asesmenAkhir: string; // Sumatif
}

export interface LKPDItem {
  judul: string;
  tabelContent: string; // Markdown table or description
}

export interface RubrikPenilaian {
  kognitif: string; // Markdown table or description
  sikap: string; // Markdown table or description
  presentasi: string; // Markdown table or description
}

export interface LessonPlanResponse {
  identitas: {
    namaMadrasah: string;
    namaGuru: string;
    mataPelajaran: string;
    fase: Fase;
    semester: Semester;
    materiPelajaran: string; // Integrated with KBC
    dimensiProfilLulusan: DimensiProfilLulusan[];
    pokokMateri: string;
  };
  desainPembelajaran: {
    capaianPembelajaran: string; // KBC integrated
    lintasDisiplinIlmu: string[];
    tujuanPembelajaran: string; // KBC integrated, the specific TP this plan is for
    praktikPedagogis: PraktikPedagogis;
    kemitraanPembelajaran: KemitraanPembelajaranItem[];
    lingkunganPembelajaran: LingkunganPembelajaran;
    pemanfaatanDigital: string;
  };
  pengalamanBelajar: {
    pendekatanIntegrasi: {
      berkesadaran: string;
      bermakna: string;
      menggembirakan: string;
    };
    langkahPembelajaran: PengalamanBelajarKegiatan[];
  };
  asesmenPembelajaran: AsesmenPembelajaran;
  lampiran: {
    lkpd: LKPDItem;
    instrumenPenilaian: RubrikPenilaian;
  };
}

// Gemini specific types (re-export or define as needed for clearer type inference)
export { Modality };