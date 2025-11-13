import { Fase, Kelas, Semester, NilaiKBC, DimensiProfilLulusan } from './types';

export const FASE_OPTIONS: { label: string; value: Fase }[] = [
  { label: 'Fase A (Kelas 1-2 SD/MI)', value: Fase.A },
  { label: 'Fase B (Kelas 3-4 SD/MI)', value: Fase.B },
  { label: 'Fase C (Kelas 5-6 SD/MI)', value: Fase.C },
  { label: 'Fase D (Kelas 7-9 SMP/MTs)', value: Fase.D },
  { label: 'Fase E (Kelas 10 SMA/MA)', value: Fase.E },
  { label: 'Fase F (Kelas 11-12 SMA/MA)', value: Fase.F },
];

export const KELAS_OPTIONS: { [key in Fase]: { label: string; value: Kelas }[] } = {
  [Fase.A]: [{ label: 'Kelas 1', value: Kelas._1 }, { label: 'Kelas 2', value: Kelas._2 }],
  [Fase.B]: [{ label: 'Kelas 3', value: Kelas._3 }, { label: 'Kelas 4', value: Kelas._4 }],
  [Fase.C]: [{ label: 'Kelas 5', value: Kelas._5 }, { label: 'Kelas 6', value: Kelas._6 }],
  [Fase.D]: [{ label: 'Kelas 7', value: Kelas._7 }, { label: 'Kelas 8', value: Kelas._8 }, { label: 'Kelas 9', value: Kelas._9 }],
  [Fase.E]: [{ label: 'Kelas 10', value: Kelas._10 }],
  [Fase.F]: [{ label: 'Kelas 11', value: Kelas._11 }, { label: 'Kelas 12', value: Kelas._12 }],
};

export const SEMESTER_OPTIONS: { label: string; value: Semester }[] = [
  { label: 'Ganjil', value: Semester.Ganjil },
  { label: 'Genap', value: Semester.Genap },
];

export const NILAI_KBC_OPTIONS: { label: string; value: NilaiKBC }[] = [
  { label: 'Cinta Allah dan Rasul-Nya', value: NilaiKBC.CintaAllahDanRasulNya },
  { label: 'Cinta Ilmu', value: NilaiKBC.CintaIlmu },
  { label: 'Cinta Diri dan Sesama', value: NilaiKBC.CintaDiriDanSesama },
  { label: 'Cinta Alam', value: NilaiKBC.CintaAlam },
  { label: 'Cinta Bangsa dan Negara', value: NilaiKBC.CintaBangsaDanNegara },
];

export const DIMENSI_PROFIL_LULUSAN_OPTIONS: { label: string; value: DimensiProfilLulusan }[] = [
  { label: 'Keimanan dan Ketakwaan terhadap Tuhan YME', value: DimensiProfilLulusan.KeimananKetakwaanYME },
  { label: 'Kewargaan', value: DimensiProfilLulusan.Kewargaan },
  { label: 'Penalaran Kritis', value: DimensiProfilLulusan.PenalaranKritis },
  { label: 'Kreativitas', value: DimensiProfilLulusan.Kreativitas },
  { label: 'Kolaborasi', value: DimensiProfilLulusan.Kolaborasi },
  { label: 'Kemandirian', value: DimensiProfilLulusan.Kemandirian },
  { label: 'Kesehatan', value: DimensiProfilLulusan.Kesehatan },
  { label: 'Komunikasi', value: DimensiProfilLulusan.Komunikasi },
];

export const GEMINI_MODEL = 'gemini-2.5-pro'; // Using pro for complex curriculum generation

export const DEFAULT_MADRASAH_NAME = "Madrasah XYZ";
export const DEFAULT_GURU_NAME = "HARMAJI";
export const DEFAULT_TAHUN_PELAJARAN = "2024/2025";
