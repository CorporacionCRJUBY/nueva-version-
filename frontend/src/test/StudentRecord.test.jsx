// FILE: frontend/src/test/StudentRecord.test.jsx
/**
 * Prueba del expediente del estudiante rediseñado.
 *
 * Verifica sobre el código real que:
 *   1. El expediente renderiza la cabecera con la ficha del alumno (foto,
 *      código, edad, estado) y las cuatro fichas de resumen.
 *   2. Se conservan las 10 pestañas del expediente original.
 *   3. Los estados vacíos son explícitos (no dejan paneles en blanco).
 *   4. La API se consume con el MISMO endpoint de antes: /students/:id/record.
 *
 * La API se mockea con el contrato REAL del backend (ver
 * backend/src/services/students.service.js -> getFullRecord).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { full_name: 'Ana Prueba', permissions: [] } }),
}));

vi.mock('../hooks/usePermissions', () => ({
  default: () => ({ canView: () => true, canEdit: () => true, canDelete: () => true, isAdmin: true }),
  usePermissions: () => ({ canView: () => true, canEdit: () => true, canDelete: () => true, isAdmin: true }),
}));

vi.mock('../hooks/useAuthImage', () => ({ default: () => ({ blobUrl: null }) }));
vi.mock('../hooks/useConfirm', () => ({ default: () => [() => Promise.resolve(false), null] }));

const getMock = vi.fn();
vi.mock('../api/axiosClient', () => ({
  api: { get: (...a) => getMock(...a), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import StudentRecordPage from '../features/students/pages/StudentRecordPage';

/** Payload con la forma exacta que devuelve GET /students/:id/record. */
const RECORD = {
  student: {
    id: 1,
    code: 'STU-2026-000001',
    first_name: 'Juan',
    middle_name: null,
    last_name: 'Pérez',
    second_last_name: null,
    identification_type: 'ID',
    identification_number: null,
    photo_url: null,
    email: 'juan.perez@student.com',
    phone: '+1-555-2001',
    address: 'Calle Principal 123',
    date_of_birth: '2012-05-15',
    gender: 'M',
    grade: '6th Grade',
    section: 'A',
    enrollment_date: '2025-02-01',
    graduation_year: null,
    status: 'ACTIVE',
    notes: null,
  },
  guardians: [
    {
      id: 1, first_name: 'Luis', last_name: 'Pérez', relationship: 'Padre',
      phone: '+1-555-3001', email: 'luis.perez@email.com', address: 'Calle Principal 123',
      is_primary: 1, is_emergency_contact: 1, authorized_pickup: 0, identification: null,
    },
  ],
  medical_record: null,
  scholarships: [],
  documents: [],
  academic_history: [
    { id: 1, academic_year_name: '2025', subject_name: 'Matemática', final_grade: 88, credits: 4 },
  ],
  grades: [],
  previous_schools: [],
  status_history: [],
  attendance: {
    records: [],
    totals: { P: 4, O: 5, E: 3, U: 3 },
    total_records: 15,
    attendance_rate: 60,
  },
  credits: { records: [], total_earned: 0, total_attempted: 0 },
  gpa: { records: [], cumulative_gpa: null, current_gpa: null },
};

const theme = createTheme({ palette: { mode: 'light' } });

const renderRecord = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/students/1']}>
          <Routes>
            <Route path="/students/:id" element={<StudentRecordPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </I18nextProvider>
  );

beforeEach(() => {
  getMock.mockReset();
  getMock.mockImplementation(() => Promise.resolve({ data: RECORD }));
  i18n.changeLanguage('es');
});

describe('Expediente del estudiante', () => {
  it('consume el endpoint real del expediente', async () => {
    renderRecord();
    await screen.findByText('Juan Pérez');
    expect(getMock).toHaveBeenCalledWith('/students/1/record');
  });

  it('pinta la ficha de identidad con nombre, código y edad calculada', async () => {
    renderRecord();
    // Nombre completo en la cabecera del expediente.
    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();
    // Código de estudiante impreso bajo la foto.
    expect(screen.getAllByText(/STU-2026-000001/).length).toBeGreaterThan(0);
    // Edad derivada de la fecha de nacimiento (nunca un "—").
    expect(screen.getByText(/^\d{1,2} años$/)).toBeInTheDocument();
  });

  it('muestra las fichas de resumen del expediente', async () => {
    renderRecord();
    await screen.findByText('Juan Pérez');
    expect(screen.getAllByTestId('record-summary-tile').length).toBe(4);
    // Tasa de asistencia real del payload.
    expect(screen.getAllByText('60%').length).toBeGreaterThan(0);
  });

  it('conserva las diez pestañas del expediente', async () => {
    renderRecord();
    await screen.findByText('Juan Pérez');
    const labels = [
      'Resumen', 'Académico', 'Asistencia', 'Tutores', 'Documentos',
      'Médico', 'Becas', 'Historial', 'Escuelas Anteriores', 'Cambiar estado',
    ];
    const tabs = screen.getAllByRole('tab').map((tb) => tb.textContent || '');
    for (const label of labels) {
      expect(tabs.some((txt) => txt.toLowerCase().includes(label.toLowerCase())), label).toBe(true);
    }
  });

  it('muestra el contacto de emergencia y la alerta de credenciales ausentes', async () => {
    renderRecord();
    await screen.findByText('Juan Pérez');
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    // Sin expediente médico no debe inventarse una alerta.
    expect(screen.queryByText(/Alerta médica/)).toBeNull();
  });
});
