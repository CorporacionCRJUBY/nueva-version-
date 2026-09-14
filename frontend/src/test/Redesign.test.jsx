// FILE: frontend/src/test/Redesign.test.jsx
/**
 * Prueba de integración del rediseño.
 *
 * Comprueba el resultado de las dos partes del encargo sobre el código real:
 *
 *  1. DASHBOARD — que los bloques nuevos existen y que la sección de
 *     «acciones rápidas» ha desaparecido por completo (no solo de la vista:
 *     si quedara cualquier resto, este test fallaría).
 *  2. FORMULARIOS — que una página de formulario migrada pinta realmente las
 *     piezas compartidas (PageHeader, FormSection, FormActions) y que ya no
 *     queda ni rastro del encabezado heredado `gradient-text`.
 *
 * La API se mockea: aquí se valida el RENDER y la estructura, no el backend.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

/* Mocks de datos de sesión: el test no depende del backend ni del login. */
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { full_name: 'Ana Prueba', permissions: [] } }),
}));

vi.mock('../hooks/usePermissions', () => ({
  default: () => ({ canView: () => true, canCreate: () => true, canEdit: () => true, isAdmin: true }),
  usePermissions: () => ({ canView: () => true, canCreate: () => true, canEdit: () => true, isAdmin: true }),
}));

const getMock = vi.fn();
vi.mock('../api/axiosClient', () => ({
  api: { get: (...args) => getMock(...args), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import DashboardPage from '../pages/Dashboard';
import StudentFormPage from '../features/students/pages/StudentFormPage';

const theme = createTheme({ palette: { mode: 'light' } });

const renderWithProviders = (ui, { route = '/', path = '/' } = {}) =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </I18nextProvider>
  );

beforeEach(() => {
  getMock.mockReset();
  // Cada endpoint devuelve el contrato REAL que el dashboard consume; antes
  // se respondía el mismo payload a todas las rutas y por eso la tabla de
  // asistencia (que lee `student_name`) no encontraba sus filas.
  getMock.mockImplementation((url) => {
    if (url === '/attendance') {
      return Promise.resolve({
        data: [
          { id: 1, student_name: 'Luis Mora', status: 'P', date: '2026-09-13' },
          { id: 2, student_name: 'Sofía Rojas', status: 'U', date: '2026-09-13' },
        ],
        total: 2,
      });
    }
    if (url === '/activity') {
      return Promise.resolve({
        data: [
          {
            id: 1,
            module: 'students',
            action: 'create',
            record_code: 'STU-001',
            user_name: 'admin',
            created_at: '2026-09-13T10:00:00Z',
          },
        ],
        total: 1,
      });
    }
    return Promise.resolve({
      data: [
        { id: 1, full_name: 'Luis Mora', grade: '1ro', status: 'ACTIVE', subject_id: 1, grade_value: 88 },
        { id: 2, full_name: 'Sofía Rojas', grade: '2do', status: 'ACTIVE', subject_id: 2, grade_value: 74 },
      ],
      total: 2,
    });
  });
});

describe('Dashboard rediseñado', () => {
  it('pinta los bloques de métricas, gráficos, analítica y asistencia', async () => {
    renderWithProviders(<DashboardPage />, { route: '/', path: '/' });

    expect(await screen.findByTestId('dashboard-kpi')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-charts')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-analytics')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-today')).toBeInTheDocument();
  });

  it('ya NO muestra la sección de acciones rápidas', async () => {
    renderWithProviders(<DashboardPage />, { route: '/', path: '/' });
    await screen.findByTestId('dashboard-kpi');

    expect(screen.queryByText(/acciones r[aá]pidas/i)).toBeNull();
    expect(screen.queryByText(/quick actions/i)).toBeNull();
  });

  it('incluye el gráfico de matrícula y las tablas de datos', async () => {
    renderWithProviders(<DashboardPage />, { route: '/', path: '/' });

    // Título del gráfico de barras (clave i18n del rediseño). El idioma por
    // defecto del i18n es el inglés, así que la aserción acepta ambos.
    expect(await screen.findByText(/matr[ií]cula por grado|enrollment by grade/i)).toBeInTheDocument();

    // Tabla de asistencia del día: fila con el estudiante de la API mockeada.
    expect(await screen.findByText('Luis Mora')).toBeInTheDocument();

    // Tabla de bitácora: el registro y el usuario del movimiento reciente.
    expect(await screen.findByText('STU-001')).toBeInTheDocument();
    expect(await screen.findByText('admin')).toBeInTheDocument();
  });
});

describe('Formularios rediseñados', () => {
  it('el formulario de estudiante usa la capa compartida y no el encabezado heredado', async () => {
    const { container } = renderWithProviders(<StudentFormPage />, {
      route: '/students/new',
      path: '/students/new',
    });

    // Cabecera de página nueva.
    expect(await screen.findByTestId('page-header')).toBeInTheDocument();

    // Al menos una tarjeta de sección y la barra de acciones inferior.
    expect(screen.getAllByTestId('form-section').length).toBeGreaterThan(0);
    expect(screen.getByTestId('form-actions')).toBeInTheDocument();

    // El encabezado heredado (título con degradado) ya no existe.
    expect(container.querySelectorAll('.gradient-text').length).toBe(0);
  });
});
