/**
 * Regresión: estos formularios llamaban a `loadOptions()` (función eliminada)
 * o usaban un icono sin importar, lo que lanzaba ReferenceError al abrirlos y
 * dejaba la página en blanco. Aquí se comprueba que montan sin excepciones.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

vi.mock('../api/axiosClient', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ data: { data: [], total: 0 } })),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import GuardianFormPage from '../features/guardians/pages/GuardianFormPage';
import MedicalRecordFormPage from '../features/medicalRecords/pages/MedicalRecordFormPage';
import PreviousSchoolFormPage from '../features/previousSchools/pages/PreviousSchoolFormPage';
import ReportFormPage from '../features/reports/pages/ReportFormPage';

const theme = createTheme();
const mount = (Page, path) =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={path} element={<Page />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </I18nextProvider>
  );

describe('Formularios sin ReferenceError al montar', () => {
  it.each([
    ['Guardian', GuardianFormPage, '/guardians/new'],
    ['MedicalRecord', MedicalRecordFormPage, '/medical-records/new'],
    ['PreviousSchool', PreviousSchoolFormPage, '/previous-schools/new'],
    ['Report (detalle)', ReportFormPage, '/reports/1'],
  ])('%s monta sin lanzar', (_n, Page, path) => {
    expect(() => mount(Page, path)).not.toThrow();
  });
});
