'use strict';

const fs = require('fs');
const path = require('path');
// pdfmake 0.3: la API cambió respecto a 0.2. `build/pdfmake` expone
// createPdf() + addVirtualFileSystem(); las fuentes van en `fonts` y el
// vfs se registra con addVirtualFileSystem (ya no `pdfMake.vfs = ...`).
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');

pdfMake.addVirtualFileSystem(pdfFonts);

pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

// SEGURIDAD: el generador de PDFs no debe poder leer archivos locales ni
// descargar recursos remotos (SSRF) — solo puede usar las fuentes del vfs.
pdfMake.localAccessPolicy = () => false;
pdfMake.urlAccessPolicy = () => false;

function createPdf(docDefinition) {
  return pdfMake.createPdf(docDefinition).getBuffer();
}

function toBase64Pdf(docDefinition) {
  return createPdf(docDefinition).then((buffer) => buffer.toString('base64'));
}

function toBuffer(docDefinition) {
  return createPdf(docDefinition);
}

async function savePdfToFile(docDefinition, filePath) {
  const buffer = await createPdf(docDefinition);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// Directorio donde se guardan los PDFs generados (report cards, progress
// reports, transcripts). Debe quedar bajo backend/uploads (NO src/uploads)
// porque los servicios de preview los sirven con resolveWithinRoot sobre
// backend/uploads.
const REPORTS_DIR = path.resolve(__dirname, '../../uploads/reports');

function studentName(student) {
  if (!student) return '';
  return [student.first_name, student.middle_name, student.last_name, student.second_last_name]
    .filter(Boolean)
    .join(' ');
}

function gradesTable(grades = []) {
  const body = [
    ['Subject', 'Q1', 'Q2', 'Q3', 'Q4', 'Final'],
    ...grades.map((g) => [
      g.subject_name || '-',
      g.q1_report ?? g.q1_prog ?? '-',
      g.q2_report ?? g.q2_prog ?? '-',
      g.q3_report ?? g.q3_prog ?? '-',
      g.q4_report ?? g.q4_prog ?? '-',
      g.final ?? '-',
    ]),
  ];
  return {
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
      body,
    },
    layout: 'lightHorizontalLines',
  };
}

function attendanceSummary(attendance = {}) {
  const rows = [
    ['Present', attendance.total_present ?? attendance.q1_present ?? 0],
    ['Absent', attendance.total_absence ?? attendance.q1_absence ?? 0],
    ['Tardy', attendance.total_tardy ?? attendance.q1_tardy ?? 0],
  ];
  return {
    table: {
      widths: ['auto', 'auto'],
      body: [['Attendance Summary', ''], ...rows],
    },
    layout: 'lightHorizontalLines',
  };
}

function reportHeader(student, reportType, teacherName) {
  return [
    {
      text: 'ACADEMIX',
      style: 'header',
      alignment: 'center',
      margin: [0, 0, 0, 2],
    },
    {
      text: reportType || 'ACADEMIC REPORT',
      style: 'subheader',
      alignment: 'center',
      margin: [0, 0, 0, 12],
    },
    {
      columns: [
        [{ text: 'Student', style: 'label' }, { text: studentName(student), style: 'value' }],
        [{ text: 'Grade / Section', style: 'label' }, { text: `${student?.grade || '-'} / ${student?.section || '-'}`, style: 'value' }],
      ],
      columnGap: 20,
      margin: [0, 0, 0, 4],
    },
    {
      columns: [
        [{ text: 'Code', style: 'label' }, { text: student?.code || '-', style: 'value' }],
        [{ text: 'Teacher', style: 'label' }, { text: teacherName || '-', style: 'value' }],
      ],
      columnGap: 20,
      margin: [0, 0, 0, 12],
    },
  ];
}

/**
 * Genera un report card / progress report en PDF y lo guarda en disco.
 * @param {object} params
 * @param {object} params.student
 * @param {Array} params.grades - [{ subject_name, q1_report?, q2_report?, ..., final? }]
 * @param {object} params.attendance
 * @param {string} params.teacherName
 * @param {string} params.reportType
 * @returns {Promise<{path: string, buffer: Buffer}>}
 */
async function generateReportCard(params = {}) {
  const { student, grades = [], attendance = {}, teacherName = '', reportType = 'REPORT CARD' } = params;

  const doc = documentDefinition({
    title: '',
    body: [
      ...reportHeader(student, reportType, teacherName),
      { text: 'Academic Performance', style: 'section' },
      gradesTable(grades),
      { text: ' ', margin: [0, 8, 0, 4] },
      attendanceSummary(attendance),
    ],
  });

  doc.styles = {
    ...doc.styles,
    label: { fontSize: 8, color: '#666666' },
    value: { fontSize: 10, bold: true, margin: [0, 0, 0, 4] },
    section: { fontSize: 12, bold: true, margin: [0, 10, 0, 6] },
  };

  const filename = `report_card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`;
  const filePath = path.join(REPORTS_DIR, filename);
  const buffer = await createPdf(doc);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return { path: filePath, buffer };
}

/**
 * Genera un transcript académico en PDF y lo guarda en disco.
 * @param {object} params
 * @param {object} params.student
 * @param {Array} params.academicHistory
 * @param {Array} params.previousSchools
 * @param {object} params.summary - { totalCredits, cumulativeGPA, diplomaEarned }
 * @returns {Promise<{path: string, buffer: Buffer}>}
 */
async function generateTranscript(params = {}) {
  const { student, academicHistory = [], previousSchools = [], summary = {} } = params;

  const historyBody = [
    ['Year', 'Subject', 'Credits', 'Grade', 'GPA'],
    ...academicHistory.map((h) => [
      h.academic_year_name || h.year || '-',
      h.subject_name || '-',
      h.credits || '-',
      h.grade_value ?? h.grade ?? '-',
      h.gpa ?? '-',
    ]),
  ];

  const schoolsBody = [
    ['School', 'Years Attended', 'Credits Transferred'],
    ...previousSchools.map((ps) => [
      ps.school_name || '-',
      ps.years_attended || '-',
      ps.credits_transferred || '-',
    ]),
  ];

  const summaryRows = [
    ['Total Credits', summary.totalCredits ?? '-'],
    ['Cumulative GPA', summary.cumulativeGPA ?? '-'],
    ['Diploma Status', summary.diplomaEarned ?? '-'],
  ];

  const doc = documentDefinition({
    title: '',
    body: [
      ...reportHeader(student, 'ACADEMIC TRANSCRIPT', ''),
      { text: 'Academic History', style: 'section' },
      {
        table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto', 'auto'], body: historyBody },
        layout: 'lightHorizontalLines',
      },
      ...(previousSchools.length > 0
        ? [
            { text: 'Previous Schools', style: 'section' },
            {
              table: { headerRows: 1, widths: ['*', 'auto', 'auto'], body: schoolsBody },
              layout: 'lightHorizontalLines',
            },
          ]
        : []),
      { text: 'Summary', style: 'section' },
      {
        table: { widths: ['auto', '*'], body: summaryRows },
        layout: 'lightHorizontalLines',
      },
    ],
  });

  doc.styles = {
    ...doc.styles,
    label: { fontSize: 8, color: '#666666' },
    value: { fontSize: 10, bold: true, margin: [0, 0, 0, 4] },
    section: { fontSize: 12, bold: true, margin: [0, 10, 0, 6] },
  };

  const filename = `transcript_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`;
  const filePath = path.join(REPORTS_DIR, filename);
  const buffer = await createPdf(doc);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return { path: filePath, buffer };
}

function documentDefinition(params = {}) {
  const {
    title = 'Document',
    subtitle = '',
    body = [],
    pageSize = 'A4',
    pageOrientation = 'portrait',
    content = [],
  } = params;

  return {
    pageSize,
    pageOrientation,
    content: [
      {
        text: title,
        style: 'header',
        margin: [0, 0, 0, 6],
      },
      ...(subtitle
        ? [
            {
              text: subtitle,
              style: 'subheader',
              margin: [0, 0, 0, 12],
            },
          ]
        : []),
      ...body,
      ...content,
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 4],
      },
      subheader: {
        fontSize: 12,
        italics: true,
        margin: [0, 0, 0, 10],
      },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
  };
}

module.exports = {
  createPdf,
  toBase64Pdf,
  toBuffer,
  savePdfToFile,
  documentDefinition,
  generateReportCard,
  generateTranscript,
};
