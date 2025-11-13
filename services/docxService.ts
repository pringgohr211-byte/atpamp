import { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, Packer, AlignmentType, HeadingLevel, UnderlineType, BorderStyle } from 'docx';
import { InputFormState, TPCreationResponse, ATPCreationResponse, AtpItem, TPAnalysisItemFlat } from '../types';
import { DEFAULT_GURU_NAME } from '../constants';

/**
 * Helper to parse basic Markdown (headings, paragraphs, bold, italic, and simple tables)
 * into docx elements. This is a simplified parser tailored for the expected output.
 */
function parseMarkdownToDocxElements(markdown: string): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];
    const lines = markdown.split('\n');
    let inCodeBlock = false;
    let tableLines: string[] = []; // Collects lines belonging to a single markdown table
    let potentialTableHeaders: string[] = []; // Store potential header lines

    const defaultCellBorders = {
        top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' },
        left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' },
        right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' },
    };

    const parseInlineFormatting = (text: string): TextRun[] => {
        const textRuns: TextRun[] = [];
        let currentText = text;
        let inlineMatch;
        // Regex to match **bold**, *italic*, __bold__, _italic_
        const inlineRegex = /(\*\*([^*]+?)\*\*)|(\*([^*]+?)\*)|(__([^__]+?)__)|(_([^_]+?)_)/g;

        let lastInlineIndex = 0;
        while ((inlineMatch = inlineRegex.exec(currentText)) !== null) {
            // Add text before the match
            if (inlineMatch.index > lastInlineIndex) {
                textRuns.push(new TextRun(currentText.substring(lastInlineIndex, inlineMatch.index)));
            }

            // Add the formatted text
            let formattedText = '';
            let bold = false;
            let italic = false;

            if (inlineMatch[2]) { formattedText = inlineMatch[2]; bold = true; }       // **bold**
            // FIX: Changed `inline4Match[4]` to `inlineMatch[4]`
            else if (inlineMatch[4]) { formattedText = inlineMatch[4]; italic = true; } // *italic*
            else if (inlineMatch[6]) { formattedText = inlineMatch[6]; bold = true; }   // __bold__
            else if (inlineMatch[8]) { formattedText = inlineMatch[8]; italic = true; } // _italic_

            textRuns.push(new TextRun({ text: formattedText, bold, italic }));
            lastInlineIndex = inlineRegex.lastIndex;
        }
        // Add any remaining text after the last inline match
        if (lastInlineIndex < currentText.length) {
            textRuns.push(new TextRun(currentText.substring(lastInlineIndex)));
        }
        return textRuns;
    };

    const flushTable = () => {
        if (tableLines.length === 0) return;

        const docxTableRows: TableRow[] = [];
        let headerParsed = false;

        // Combine potential headers and table lines
        const allTableDataLines = [...potentialTableHeaders, ...tableLines].filter(line => line.trim().startsWith('|'));

        if (allTableDataLines.length === 0) return;

        const separatorLineIndex = allTableDataLines.findIndex(line => line.match(/^\|(?:-+\|)+-+$/));

        let headerData: string[] = [];
        let bodyData: string[][] = [];

        if (separatorLineIndex > -1) {
            // Header row is the line before the separator
            if (separatorLineIndex > 0) {
                headerData = allTableDataLines[separatorLineIndex - 1]
                    .split('|').map(c => c.trim()).filter(c => c !== '');
            }
            // Body rows are after the separator
            bodyData = allTableDataLines.slice(separatorLineIndex + 1)
                .map(line => line.split('|').map(c => c.trim()).filter(c => c !== ''));
            headerParsed = true;
        } else {
            // No separator, treat first line as header if it looks like one, rest as body
            headerData = allTableDataLines[0]
                .split('|').map(c => c.trim()).filter(c => c !== '');
            bodyData = allTableDataLines.slice(1)
                .map(line => line.split('|').map(c => c.trim()).filter(c => c !== ''));
            if (headerData.length > 0) headerParsed = true;
        }

        if (headerParsed && headerData.length > 0) {
            docxTableRows.push(new TableRow({
                children: headerData.map(h => new TableCell({
                    children: [new Paragraph({ children: parseInlineFormatting(h), spacing: { after: 100 } })],
                    borders: defaultCellBorders,
                    verticalAlign: AlignmentType.CENTER
                })),
                tableHeader: true, // Mark this row as a table header
            }));
        }

        bodyData.forEach(row => {
            // Basic validation: row should not be empty and ideally match header column count
            if (row.length > 0 && (headerData.length === 0 || row.length === headerData.length)) {
                docxTableRows.push(new TableRow({
                    children: row.map(cellText => new TableCell({
                        children: [new Paragraph({ children: parseInlineFormatting(cellText), spacing: { after: 100 } })],
                        borders: defaultCellBorders,
                    })),
                }));
            }
        });

        if (docxTableRows.length > 0) {
            elements.push(new Table({
                rows: docxTableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
                look: {
                    firstRow: true,
                    lastRow: false,
                    firstColumn: false,
                    lastColumn: false,
                    noHBand: false,
                    noVBand: true,
                },
            }));
        }
        tableLines = [];
        potentialTableHeaders = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code block handling
        if (line.trim().startsWith('```')) {
            flushTable(); // Flush any table before entering/exiting code block
            if (!inCodeBlock) { // Entering code block
                elements.push(new Paragraph({ text: '', spacing: { after: 120 } })); // Spacer before code
            } else { // Exiting code block
                elements.push(new Paragraph({ text: '', spacing: { after: 120 } })); // Spacer after code
            }
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) {
            elements.push(new Paragraph({ text: line })); // Add code line as is
            continue;
        }

        // Table detection and accumulation
        // A line is part of a table if it starts with '|' and contains another '|'
        // or if it's a separator line (e.g., |---|---|)
        if (line.trim().startsWith('|') && line.includes('|')) {
            tableLines.push(line);
            // If the next line is also a table line or this is the last line, continue accumulating.
            // Otherwise, it might be the end of a table.
            if (i === lines.length - 1 || !(lines[i + 1]?.trim().startsWith('|') && lines[i + 1]?.includes('|')) ) {
                 flushTable();
            }
            continue;
        } else if (tableLines.length > 0) { // If we were collecting table lines but current line isn't a table line
            flushTable(); // Flush the collected table lines
        }


        // Handle Headings
        const headingMatch = line.match(/^(#+)\s(.+)/);
        if (headingMatch) {
            flushTable(); // Ensure no hanging table data
            const level = headingMatch[1].length;
            const text = headingMatch[2];
            elements.push(new Paragraph({
                children: parseInlineFormatting(text),
                heading: level === 1 ? HeadingLevel.HEADING_1 :
                         level === 2 ? HeadingLevel.HEADING_2 :
                         level === 3 ? HeadingLevel.HEADING_3 :
                         level === 4 ? HeadingLevel.HEADING_4 :
                         level === 5 ? HeadingLevel.HEADING_5 :
                         HeadingLevel.HEADING_6,
                spacing: { after: 180, before: 180 }, // Increased spacing for headings
            }));
            continue;
        }

        // Handle blank lines for paragraph separation
        if (!line.trim()) {
            elements.push(new Paragraph({ text: '', spacing: { after: 120 } })); // Adds a blank line with spacing
            continue;
        }

        // Handle paragraphs with inline formatting
        const paragraphChildren = parseInlineFormatting(line);
        if (paragraphChildren.length > 0) {
            elements.push(new Paragraph({ children: paragraphChildren }));
        }
    }
    // Flush any remaining content after the loop
    flushTable();
    return elements;
}


export async function createWordDocumentAllCurriculum(data: {
    formData: InputFormState | null;
    tpAnalysisResult: TPCreationResponse | null;
    atpResult: ATPCreationResponse | null;
}) {
    const { formData, tpAnalysisResult, atpResult } = data;

    const children: any[] = []; // Use 'any' for children as it can be Paragraph or Table

    // --- Header and Identitas ---
    children.push(new Paragraph({ text: 'Aplikasi Tujuan & Perencanaan Pembelajaran Mendalam', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }));
    children.push(new Paragraph({ text: `Oleh: ${formData?.namaGuru || DEFAULT_GURU_NAME}`, alignment: AlignmentType.CENTER }));
    children.push(new Paragraph({ text: '', spacing: { after: 240 } })); // Spacer

    if (formData) {
        children.push(new Paragraph({ text: 'I. IDENTITAS UMUM', heading: HeadingLevel.HEADING_1 }));
        children.push(new Paragraph({ text: `Nama Madrasah: ${formData.namaMadrasah}` }));
        children.push(new Paragraph({ text: `Nama Guru: ${formData.namaGuru}` }));
        children.push(new Paragraph({ text: `Mata Pelajaran: ${formData.mataPelajaran}` }));
        children.push(new Paragraph({ text: `Fase: ${formData.fase}` }));
        children.push(new Paragraph({ text: `Kelas: ${formData.kelas}` }));
        children.push(new Paragraph({ text: `Tahun Pelajaran: ${formData.tahunPelajaran}` }));
        children.push(new Paragraph({ text: `Semester: ${formData.semester}` }));
        children.push(new Paragraph({ text: '', spacing: { after: 240 } })); // Spacer
    }

    // --- TP Analysis Table ---
    if (tpAnalysisResult && tpAnalysisResult.cpAnalyses.length > 0) {
        children.push(new Paragraph({ text: `II. Hasil Analisis Tujuan Pembelajaran (${tpAnalysisResult.semester} Semester)`, heading: HeadingLevel.HEADING_1 }));
        children.push(new Paragraph({ text: '', spacing: { after: 120 } })); // Spacer

        let globalNo = 0;
        const flatTPData: TPAnalysisItemFlat[] = tpAnalysisResult.cpAnalyses.flatMap(cpEntry => {
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

        const tpTableRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Capaian Pembelajaran', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Konten Pembelajaran', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Kompetensi', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Materi Pokok', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tujuan Pembelajaran', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                ],
                tableHeader: true,
            }),
            ...flatTPData.map(item =>
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(item.no.toString())], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.capaianPembelajaranParent)], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.kontenPembelajaran)], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.kompetensi)], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.materiPokok)], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.tujuanPembelajaran)], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                    ],
                })
            ),
        ];

        children.push(new Table({
            rows: tpTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            look: {
                firstRow: true,
                lastRow: false,
                firstColumn: false,
                lastColumn: false,
                noHBand: false,
                noVBand: true,
            },
        }));
        children.push(new Paragraph({ text: '', spacing: { after: 240 } })); // Spacer
    }

    // --- ATP Table ---
    if (atpResult && atpResult.atpList.length > 0) {
        children.push(new Paragraph({ text: 'III. Alur Tujuan Pembelajaran (ATP)', heading: HeadingLevel.HEADING_1 }));
        children.push(new Paragraph({ text: '', spacing: { after: 120 } })); // Spacer

        const atpTableRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tujuan Pembelajaran', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Indikator', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Materi Pokok', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nilai KBC', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Alokasi Waktu', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Dimensi Profil Lulusan', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Asesmen', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Sumber Belajar', bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' } } }),
                ],
                tableHeader: true,
            }),
            ...atpResult.atpList.map(item =>
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(item.no.toString())], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.tujuanPembelajaran)], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.indikator)], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.materiPokok)], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.nilaiKBC)], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.alokasiWaktu)], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.dimensiProfilLulusan.join(', ')) ], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.asesmen)], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                        new TableCell({ children: [new Paragraph(item.sumberBelajar)], borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' } } }),
                    ],
                })
            ),
        ];

        children.push(new Table({
            rows: atpTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            look: {
                firstRow: true,
                lastRow: false,
                firstColumn: false,
                lastColumn: false,
                noHBand: false,
                noVBand: true,
            },
        }));
        children.push(new Paragraph({ text: '', spacing: { after: 240 } })); // Spacer
    }

    const doc = new Document({
        sections: [{
            children: children,
        }],
    });

    return doc;
}

export async function createWordDocumentSingleLessonPlan(lessonPlanContent: string, tpNo: number, formData: InputFormState | null) {
    const children: any[] = [];
    const mataPelajaran = formData?.mataPelajaran || 'Pelajaran';

    children.push(new Paragraph({ text: `Perencanaan Pembelajaran Mendalam TP ke-${tpNo}`, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }));
    children.push(new Paragraph({ text: `Mata Pelajaran: ${mataPelajaran}`, alignment: AlignmentType.CENTER }));
    children.push(new Paragraph({ text: `Oleh: ${formData?.namaGuru || DEFAULT_GURU_NAME}`, alignment: AlignmentType.CENTER }));
    children.push(new Paragraph({ text: '', spacing: { after: 240 } })); // Spacer

    const parsedElements = parseMarkdownToDocxElements(lessonPlanContent);
    parsedElements.forEach(el => children.push(el));

    const doc = new Document({
        sections: [{
            children: children,
        }],
    });

    return doc;
}


export async function downloadWordDocument(doc: Document, filename: string) {
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}