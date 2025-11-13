import { GoogleGenAI, Type, GenerateContentResponse, GenerateContentParameters } from '@google/genai';
import {
  InputFormState,
  TPCreationResponse,
  ATPCreationResponse,
  LessonPlanResponse,
  CapaianPembelajaranDetail,
  CPAnalysisEntry,
  AtpItem, // Corrected from ATPItem to AtpItem
} from '../types';
import { NILAI_KBC_OPTIONS, DIMENSI_PROFIL_LULUSAN_OPTIONS, GEMINI_MODEL } from '../constants'; // Added GEMINI_MODEL

const getGeminiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY environment variable is not set.');
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

async function generateContentWithRetry<T>(
  params: GenerateContentParameters,
  parseResponse: (text: string) => T,
  retries = 3,
  delay = 1000,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const ai = getGeminiClient();
      const response: GenerateContentResponse = await ai.models.generateContent(params);
      const text = response.text.trim();
      try {
        return parseResponse(text);
      } catch (parseError) {
        console.error(`Attempt ${i + 1}: Failed to parse JSON. Raw text:`, text, 'Error:', parseError);
        // If JSON parsing fails, it might be a model generation issue, retry
      }
    } catch (error: any) {
      console.error(`Attempt ${i + 1}: Gemini API error:`, error);
      if (error.message && error.message.includes("Requested entity was not found.")) {
        console.error("API Key might be invalid or model not accessible. Please ensure a valid API key is selected.");
        // Specific handling for API key issues (though not using `window.aistudio` here)
        throw new Error("API Key error: Requested entity was not found. Please check your API key.");
      }
    }
    await new Promise(res => setTimeout(res, delay * (2 ** i))); // Exponential backoff
  }
  throw new Error('Failed to generate content after multiple retries.');
}

export async function generateTPAnalysis(
  formData: InputFormState,
): Promise<TPCreationResponse> {
  const {
    namaMadrasah,
    namaGuru,
    mataPelajaran,
    fase,
    kelas,
    tahunPelajaran,
    semester,
    capaianPembelajaran,
  } = formData;

  const prompt = `Sebagai seorang pakar kurikulum dan pengembang pembelajaran di madrasah, bantu saya menghasilkan analisis Tujuan Pembelajaran (TP) mendalam yang terintegrasi dengan kurikulum deep learning dan kurikulum berbasis cinta (KBC).

Berikut adalah detail input:
- Nama Madrasah: ${namaMadrasah}
- Nama Guru: ${namaGuru}
- Mata Pelajaran: ${mataPelajaran}
- Fase: ${fase}
- Kelas: ${kelas}
- Tahun Pelajaran: ${tahunPelajaran}
- Semester: ${semester}
- Capaian Pembelajaran (CP) yang akan dianalisis:
${capaianPembelajaran.map((cp, idx) => `- CP ${idx + 1}: ${cp}`).join('\n')}

Untuk setiap Capaian Pembelajaran yang diberikan, saya membutuhkan 6 set (materi pokok, kompetensi, konten pembelajaran, tujuan pembelajaran). Setiap Tujuan Pembelajaran harus secara eksplisit mengintegrasikan nilai-nilai Kurikulum Berbasis Cinta (KBC: Cinta Allah dan Rasul-Nya, Cinta Ilmu, Cinta Diri dan Sesama, Cinta Alam, Cinta Bangsa dan Negara).

Pastikan outputnya terstruktur dalam format JSON yang valid, mengikuti skema di bawah.

Nilai KBC yang harus dipertimbangkan untuk integrasi:
${NILAI_KBC_OPTIONS.map(opt => `- ${opt.value}`).join('\n')}

\`\`\`json
{
  "semester": "Ganjil" | "Genap",
  "cpAnalyses": [
    {
      "capaianPembelajaran": "Contoh Capaian Pembelajaran 1",
      "details": [
        {
          "no": 1,
          "kontenPembelajaran": "Konten Pembelajaran untuk TP 1",
          "kompetensi": "Kompetensi untuk TP 1",
          "materiPokok": "Materi Pokok untuk TP 1",
          "tujuanPembelajaran": "Tujuan Pembelajaran 1 yang mengintegrasikan KBC (misal: 'Peserta didik mampu memahami konsep X dan menerapkan nilai Cinta Ilmu melalui Y.')"
        },
        // ... 5 item lainnya
      ]
    },
    {
      "capaianPembelajaran": "Contoh Capaian Pembelajaran 2",
      "details": [
        {
          "no": 1,
          "kontenPembelajaran": "Konten Pembelajaran untuk TP 1",
          "kompetensi": "Kompetensi untuk TP 1",
          "materiPokok": "Materi Pokok untuk TP 1",
          "tujuanPembelajaran": "Tujuan Pembelajaran 1 yang mengintegrasikan KBC"
        },
        // ... 5 item lainnya
      ]
    }
  ]
}
\`\`\`
`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      semester: { type: Type.STRING, enum: [formData.semester] },
      cpAnalyses: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            capaianPembelajaran: { type: Type.STRING },
            details: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  no: { type: Type.INTEGER },
                  kontenPembelajaran: { type: Type.STRING },
                  kompetensi: { type: Type.STRING },
                  materiPokok: { type: Type.STRING },
                  tujuanPembelajaran: { type: Type.STRING },
                },
                required: ['no', 'kontenPembelajaran', 'kompetensi', 'materiPokok', 'tujuanPembelajaran'],
                propertyOrdering: ['no', 'kontenPembelajaran', 'kompetensi', 'materiPokok', 'tujuanPembelajaran'],
              },
            },
          },
          required: ['capaianPembelajaran', 'details'],
          propertyOrdering: ['capaianPembelajaran', 'details'],
        },
      },
    },
    required: ['semester', 'cpAnalyses'],
    propertyOrdering: ['semester', 'cpAnalyses'],
  };

  return generateContentWithRetry(
    {
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    },
    (text: string) => JSON.parse(text) as TPCreationResponse
  );
}

export async function generateATP(
  formData: InputFormState,
  tpAnalyses: CPAnalysisEntry[],
): Promise<ATPCreationResponse> {
  const allTujuanPembelajaran = tpAnalyses.flatMap(cp =>
    cp.details.map(detail => detail.tujuanPembelajaran)
  );
  const allMateriPokok = tpAnalyses.flatMap(cp =>
    cp.details.map(detail => detail.materiPokok)
  );

  const prompt = `Sebagai seorang pakar kurikulum, buatlah Alur Tujuan Pembelajaran (ATP) dari daftar Tujuan Pembelajaran (TP) yang telah diberikan.

Berikut adalah detail konteks:
- Nama Madrasah: ${formData.namaMadrasah}
- Nama Guru: ${formData.namaGuru}
- Mata Pelajaran: ${formData.mataPelajaran}
- Fase: ${formData.fase}
- Kelas: ${formData.kelas}
- Semester: ${formData.semester}

Daftar Tujuan Pembelajaran yang akan dibuatkan ATP-nya:
${allTujuanPembelajaran.map((tp, idx) => `${idx + 1}. ${tp}`).join('\n')}

Untuk setiap Tujuan Pembelajaran, hasilkan Indikator, Materi Pokok (ambil dari yang sudah diberikan), nilai KBC yang relevan (jelaskan kenapa sesuai), Alokasi Waktu yang realistis (contoh: "90 Menit (2 JP)"), Dimensi Profil Lulusan yang sesuai (pilih dari daftar ini: ${DIMENSI_PROFIL_LULUSAN_OPTIONS.map(opt => opt.value).join(', ')}), Asesmen yang cocok, dan Sumber Belajar.

Pastikan outputnya terstruktur dalam format JSON yang valid, mengikuti skema di bawah.

\`\`\`json
{
  "atpList": [
    {
      "no": 1,
      "tujuanPembelajaran": "Tujuan Pembelajaran dari daftar di atas",
      "indikator": "Indikator pencapaian tujuan pembelajaran ini",
      "materiPokok": "Materi Pokok yang sesuai dari daftar di atas",
      "nilaiKBC": "Penjelasan nilai KBC yang sesuai dengan materi pembelajaran dan alasannya (misal: 'Cinta Ilmu: Materi ini mendorong eksplorasi pengetahuan dan rasa ingin tahu.').",
      "alokasiWaktu": "Misal: 90 Menit (2 JP)",
      "dimensiProfilLulusan": ["Dimensi 1", "Dimensi 2"],
      "asesmen": "Jenis asesmen yang sesuai (misal: 'Observasi diskusi kelompok', 'Tes tertulis pilihan ganda')",
      "sumberBelajar": "Contoh: Buku teks, Artikel jurnal, Video edukasi, Lingkungan sekitar"
    },
    // ... item ATP lainnya sesuai jumlah TP
  ]
}
\`\`\`
`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      atpList: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            no: { type: Type.INTEGER },
            tujuanPembelajaran: { type: Type.STRING },
            indikator: { type: Type.STRING },
            materiPokok: { type: Type.STRING },
            nilaiKBC: { type: Type.STRING },
            alokasiWaktu: { type: Type.STRING },
            dimensiProfilLulusan: { type: Type.ARRAY, items: { type: Type.STRING, enum: DIMENSI_PROFIL_LULUSAN_OPTIONS.map(o => o.value) } },
            asesmen: { type: Type.STRING },
            sumberBelajar: { type: Type.STRING },
          },
          required: ['no', 'tujuanPembelajaran', 'indikator', 'materiPokok', 'nilaiKBC', 'alokasiWaktu', 'dimensiProfilLulusan', 'asesmen', 'sumberBelajar'],
          propertyOrdering: ['no', 'tujuanPembelajaran', 'indikator', 'materiPokok', 'nilaiKBC', 'alokasiWaktu', 'dimensiProfilLulusan', 'asesmen', 'sumberBelajar'],
        },
      },
    },
    required: ['atpList'],
    propertyOrdering: ['atpList'],
  };

  return generateContentWithRetry(
    {
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    },
    (text: string) => JSON.parse(text) as ATPCreationResponse
  );
}

export async function generateLessonPlan(
  formData: InputFormState,
  selectedATP: AtpItem,
): Promise<string> {
  const prompt = `Sebagai seorang pengembang kurikulum yang ahli dalam pembelajaran mendalam (deep learning) dan integrasi nilai-nilai, buatkan Perencanaan Pembelajaran Mendalam yang sistematis dan komprehensif berdasarkan Tujuan Pembelajaran berikut.

**I. IDENTITAS**
- Nama Madrasah: ${formData.namaMadrasah}
- Nama Guru: ${formData.namaGuru}
- Mata Pelajaran: ${formData.mataPelajaran}
- Fase: ${formData.fase}
- Kelas: ${formData.kelas}
- Semester: ${formData.semester}
- Tahun Pelajaran: ${formData.tahunPelajaran}

Detail Tujuan Pembelajaran yang dipilih untuk perencanaan ini:
- Tujuan Pembelajaran: ${selectedATP.tujuanPembelajaran}
- Materi Pokok: ${selectedATP.materiPokok}
- Indikator: ${selectedATP.indikator}
- Nilai KBC: ${selectedATP.nilaiKBC}
- Alokasi Waktu: ${selectedATP.alokasiWaktu}
- Dimensi Profil Lulusan: ${selectedATP.dimensiProfilLulusan.join(', ')}
- Asesmen: ${selectedATP.asesmen}
- Sumber Belajar: ${selectedATP.sumberBelajar}

Integrasikan konsep pembelajaran mendalam (mindful, meaningful, joyful) dan kurikulum berbasis cinta (KBC) secara eksplisit dalam setiap bagian.

Berikan output dalam format Markdown yang rapi dan terstruktur, mengikuti sistematika yang telah ditentukan:

# Perencanaan Pembelajaran Mendalam
## TP ke-${selectedATP.no}

**I. IDENTITAS**
Nama Madrasah: ${formData.namaMadrasah}
Nama Guru: ${formData.namaGuru}
Mata Pelajaran: ${formData.mataPelajaran}
Fase: ${formData.fase}
Semester: ${formData.semester}

1.  **Materi Pelajaran**: Berikan uraian materi pelajaran yang diintegrasikan dengan nilai KBC, yaitu: Cinta Allah dan Rasul-Nya; Cinta Ilmu; Cinta Diri dan Sesama; Cinta Alam; Cinta Bangsa dan Negara. Jelaskan bagaimana integrasi tersebut dilakukan.
2.  **Dimensi Profil Lulusan**: Otomatis berisi kesesuaian tujuan pembelajaran dengan: ${DIMENSI_PROFIL_LULUSAN_OPTIONS.map(opt => opt.value).join('; ')}. Pilih yang sesuai dari daftar ini: ${selectedATP.dimensiProfilLulusan.join(', ')}.
3.  **Pokok Materi**: ${selectedATP.materiPokok}

**II. DESAIN PEMBELAJARAN**
Pembelajaran mendalam adalah pendekatan holistik yang mengintegrasikan pembelajaran penuh kesadaran (mindful), pembelajaran bermakna (meaningful), dan pembelajaran menyenangkan (joyful). Ketiga komponen ini saling berkaitan dan memperkuat satu sama lain untuk menciptakan lingkungan belajar yang efektif dan menyenangkan. Pembelajaran yang bermakna akan meningkatkan motivasi, pembelajaran yang sadar akan membantu siswa fokus, dan pembelajaran yang menyenangkan akan membuat mereka lebih menikmati prosesnya. Pendekatan ini mengintegrasikan olah pikir, olah hati, olah rasa, dan olah raga secara terpadu untuk pembelajaran yang lebih holistik.

1.  **Capaian Pembelajaran**: Tuliskan capaian pembelajaran yang relevan, diintegrasikan dengan nilai cinta atau KBC.
2.  **Lintas Disiplin Ilmu**: Sebutkan mata pelajaran lain yang sesuai dengan tujuan pembelajaran ini (misal: Matematika, Bahasa Indonesia, Seni Budaya).
3.  **Tujuan Pembelajaran**: ${selectedATP.tujuanPembelajaran}
4.  **Praktik Pedagogis**:
    a.  **Model**: Otomatis isi model pembelajaran yang sesuai dengan Tujuan Pembelajaran dan disarankan oleh pembelajaran mendalam (misal: Pembelajaran Berbasis Proyek (PBL), Pembelajaran Berbasis Masalah (PBL), Pembelajaran Kooperatif).
    b.  **Strategi**: Otomatis isi strategi pembelajaran yang sesuai dengan Tujuan Pembelajaran (misal: Diskusi Kelompok, Penemuan Terbimbing, Simulasi).
    c.  **Metode**: Otomatis isi metode pembelajaran yang sesuai dengan Tujuan Pembelajaran (misal: Tanya Jawab, Observasi, Presentasi, Bermain Peran).
5.  **Kemitraan Pembelajaran**: Hubungkan pembelajaran untuk berkolaborasi dengan apa saja.
    a.  **Laboran sekolah**: Jelaskan bagaimana laboran dapat mendukung pembelajaran ini.
    b.  **Guru lain**: Jelaskan bagaimana kolaborasi dengan guru mata pelajaran lain dapat memperkaya pembelajaran.
    c.  **Pihak dari luar Sekolah**: Sebutkan pihak eksternal (misal: Komunitas lokal, Praktisi ahli, Lembaga lingkungan) yang sesuai untuk mendukung pembelajaran dan jelaskan bentuk kolaborasinya.
6.  **Lingkungan Pembelajaran**:
    a.  **Fisik**: Jelaskan pengaturan ruang kelas atau lokasi fisik lainnya yang mendukung pembelajaran (misal: Tata letak tempat duduk fleksibel, Sudut baca, Area eksperimen).
    b.  **Virtual**: Sebutkan platform atau media virtual yang mendukung pembelajaran (misal: Google Classroom, Padlet, Video YouTube, Aplikasi simulasi).
    c.  **Budaya Belajar**: Jelaskan budaya belajar yang ingin dikembangkan (misal: Kolaboratif, Inklusif, Reflektif, Berani bertanya).
7.  **Pemanfaatan Digital**: Jelaskan pemanfaatan media digital yang ada kaitannya dengan materi pembelajaran (misal: Penggunaan aplikasi interaktif untuk simulasi, Pencarian informasi melalui internet, Pembuatan presentasi digital).

**III. PENGALAMAN BELAJAR**
Kaitkan ketiga hal ini (Berkesadaran, Bermakna, Menggembirakan) dengan kegiatan pembelajaran. Jelaskan langkah pembelajaran mendalam dengan alokasi waktu yang sesuai.

1.  **Kegiatan Awal** (${Math.round(parseInt(selectedATP.alokasiWaktu.match(/(\d+)/)?.[1] || '0') * 0.15)} Menit):
    *   **Berkesadaran (Mindful)**: Jelaskan bagaimana kegiatan awal mendorong kesadaran dan fokus siswa.
    *   **Bermakna (Meaningful)**: Kaitkan kegiatan awal dengan pengalaman hidup siswa.
    *   **Menggembirakan (Joyful)**: Deskripsikan elemen yang membuat kegiatan awal menyenangkan.
    *   **Langkah-langkah**: Uraikan langkah-langkah kegiatan awal.
2.  **Kegiatan Inti** (${Math.round(parseInt(selectedATP.alokasiWaktu.match(/(\d+)/)?.[1] || '0') * 0.70)} Menit):
    *   **Berkesadaran (Mindful)**: Jelaskan bagaimana kegiatan inti melibatkan refleksi dan pemahaman mendalam.
    *   **Bermakna (Meaningful)**: Deskripsikan bagaimana konsep dikaitkan dengan dunia nyata dan relevansi pribadinya.
    *   **Menggembirakan (Joyful)**: Jelaskan aktivitas yang mendorong partisipasi aktif dan kegembiraan.
    *   **Langkah-langkah**: Uraikan langkah-langkah kegiatan inti secara detail.
3.  **Kegiatan Penutup** (${Math.round(parseInt(selectedATP.alokasiWaktu.match(/(\d+)/)?.[1] || '0') * 0.15)} Menit):
    *   **Berkesadaran (Mindful)**: Jelaskan bagaimana kegiatan penutup mendorong refleksi akhir.
    *   **Bermakna (Meaningful)**: Kaitkan penutup dengan kesimpulan dan tindak lanjut yang relevan.
    *   **Menggembirakan (Joyful)**: Deskripsikan cara menutup pelajaran dengan kesan positif.
    *   **Langkah-langkah**: Uraikan langkah-langkah kegiatan penutup.

**IV. ASESMEN PEMBELAJARAN**
Jelaskan jenis asesmen yang paling sesuai dengan materi dan tujuan pembelajaran.

1.  **Asesmen Awal Pembelajaran**: Jelaskan asesmen awal yang digunakan (misal: Pre-test singkat, Diskusi awal, Pemetaan konsep).
2.  **Asesmen Proses Pembelajaran (Formatif dan Sikap)**: Jelaskan bentuk asesmen formatif (misal: Observasi, Rubrik kinerja, Refleksi diri) dan penilaian sikap (misal: Jurnal, Catatan anekdot) selama proses pembelajaran.
3.  **Asesmen Akhir Pembelajaran (Sumatif)**: Jelaskan bentuk asesmen sumatif (misal: Proyek akhir, Tes tertulis esai, Presentasi produk) untuk mengukur pencapaian tujuan pembelajaran.

**Lampiran**
Buat secara bagus dan ada kaitannya dengan materi dan tujuan pembelajaran.

1.  **Lembar Kerja Peserta Didik (LKPD)**
    *   **Judul**: Judul LKPD yang sesuai dengan materi pembelajaran.
    *   **Tabel LKPD**: Buatkan struktur tabel LKPD dengan kolom-kolom relevan (misal: Kegiatan, Petunjuk, Hasil Pengamatan/Analisis).
\`\`\`markdown
| No. | Kegiatan | Petunjuk | Hasil Pengamatan/Analisis |
|-----|----------|----------|-------------------------|
| 1   |          |          |                         |
| 2   |          |          |                         |
\`\`\`
2.  **Instrumen/Rubrik Penilaian**
    a.  **Rubrik Penilaian Kognitif**: Buatkan contoh rubrik penilaian untuk aspek pengetahuan.
\`\`\`markdown
| Level | Kriteria |
|-------|----------|
| 4     | Sangat Baik: ... |
| 3     | Baik: ... |
| 2     | Cukup: ... |
| 1     | Kurang: ... |
\`\`\`
    b.  **Rubrik Penilaian Sikap**: Buatkan contoh rubrik penilaian untuk aspek sikap, terintegrasi dengan KBC jika relevan.
\`\`\`markdown
| Sikap (Aspek KBC) | Indikator | Ya/Tidak | Catatan |
|-------------------|-----------|----------|---------|
| Cinta Ilmu         | Menunjukkan rasa ingin tahu... |          |         |
| Kolaborasi        | Aktif berkontribusi... |          |         |
\`\`\`
    c.  **Rubrik Penilaian Presentasi**: Buatkan contoh rubrik penilaian untuk presentasi siswa.
\`\`\`markdown
| Aspek Penilaian | Bobot | Kriteria Sangat Baik (4) | Kriteria Baik (3) | Kriteria Cukup (2) | Kriteria Kurang (1) |
|-----------------|-------|--------------------------|--------------------|--------------------|---------------------|
| Isi Materi      | 30%   | Sangat relevan, akurat... | Relevan, akurat... | Cukup relevan...   | Kurang relevan...   |
| Penyampaian     | 30%   | Jelas, percaya diri...   | Cukup jelas...     | Kurang jelas...    | Tidak jelas...      |
| Visual          | 20%   | Menarik, informatif...   | Cukup menarik...   | Kurang menarik...  | Tidak menarik...    |
| Interaksi       | 20%   | Aktif, responsif...      | Cukup aktif...     | Kurang aktif...    | Pasif...            |
\`\`\`
`;

  return generateContentWithRetry(
    {
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "text/plain", // Expecting Markdown text
      },
    },
    (text: string) => text // No JSON parsing needed
  );
}