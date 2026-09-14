// FILE: frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth
import LoginPage from './pages/Login';

// Dashboard
import DashboardPage from './pages/Dashboard';

// Server Control
import ServerControlPage from './pages/ServerControlPage';

// Features
import { AcademicHistoryListPage, AcademicHistoryFormPage } from './features/academicHistory';
import { AcademicPeriodListPage, AcademicPeriodFormPage } from './features/academicPeriods';
import { AcademicYearListPage, AcademicYearFormPage } from './features/academicYears';
import { ActivityListPage, ActivityFormPage } from './features/activity';
import { AssignmentListPage, AssignmentFormPage } from './features/assignments';
import { AttendanceListPage, AttendanceFormPage, MonthlyAttendancePage } from './features/attendance';
import { AuditListPage, AuditFormPage } from './features/audit';
import { BranchListPage, BranchFormPage } from './features/branches';
import { CalendarListPage, CalendarFormPage } from './features/calendar';
import { CreditListPage, CreditFormPage } from './features/credits';
import { DocumentListPage, DocumentFormPage } from './features/documents';
import { GpaListPage, GpaFormPage } from './features/gpa';
import { GradeChangeRequestListPage, GradeChangeRequestFormPage } from './features/gradeChangeRequests';
import { GradeListPage, GradeFormPage } from './features/grades';
import { GraduationListPage, GraduationFormPage } from './features/graduation';
import { GransifListPage, GransifFormPage } from './features/gransif';
import { GuardianListPage, GuardianFormPage } from './features/guardians';
import { MedicalRecordListPage, MedicalRecordFormPage } from './features/medicalRecords';
import { PermissionListPage, PermissionFormPage } from './features/permissions';
import { PreviousSchoolListPage, PreviousSchoolFormPage } from './features/previousSchools';
import { ProgressReportListPage, ProgressReportFormPage } from './features/progressReports';
import { ReportCardListPage, ReportCardFormPage } from './features/reportCards';
import { ReportListPage, ReportFormPage } from './features/reports';
import { RoleListPage, RoleFormPage, RolePermissionsPage } from './features/roles';
import { ScholarshipListPage, ScholarshipFormPage } from './features/scholarships';
import { SettingListPage, SettingFormPage } from './features/settings';
import { StudentListPage, StudentFormPage, StudentRecordPage } from './features/students';
import { SubjectListPage, SubjectFormPage } from './features/subjects';
import { TeacherListPage, TeacherFormPage, TeacherRecordPage } from './features/teachers';
import { TranscriptListPage, TranscriptFormPage } from './features/transcripts';
import { UserListPage, UserFormPage, UserRolesPage } from './features/users';

// Pages
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFound';
import ProfilePage from './pages/Profile';
import SuperAdminConsolePage from './pages/SuperAdminConsole';

// ============================================================================
// TEMA CORPORATIVO — "New Direction Academy" (Premium, claro)
// Paleta morado/lila (violeta) — identidad ACADEMIX. Morado académico
// profundo + lila suave como acento. Cambiar estos valores reestiliza toda
// la aplicación (tablas, formularios, tarjetas, menús).
// ============================================================================
// REDISEÑO VISUAL: paleta azul (antes morado académico) — lenguaje visual del
// panel de referencia: azul marino profundo para el chrome corporativo y azul
// #7847e3 como acento de acción. Los nombres se conservan porque todo el tema
// MUI de abajo los referencia por clave.
const palette = {
  purple900: '#241046',
  purple800: '#2f1657',
  purple700: '#6532c4',
  purple600: '#7847e3',
  purple500: '#8f6bf2',
  purple400: '#ad93fb',
  purple300: '#cdbcff',
  lilac600: '#6532c4',
  lilac500: '#8f6bf2',
  lilac400: '#ad93fb',
  lilac300: '#cdbcff',
  lilac200: '#e3dbff',
  lilac100: '#f0ebff',
  lilac50: '#f7f5ff',
  ink: '#1e1233',
  slate: '#564a75',
  slateLight: '#7d6f9c',
  bg: '#faf9ff',
  surface: '#ffffff',
  surfaceHover: '#f4f1fd',
  line: '#ebe4f7',
  lineHover: '#d8cdee',
  success: '#047857',
  warning: '#b45309',
  error: '#b91c1c',
  info: '#7847e3',
};

const gradientPrimary = `linear-gradient(135deg, ${palette.purple700} 0%, ${palette.purple500} 100%)`;
const gradientAccent = `linear-gradient(135deg, ${palette.lilac500} 0%, ${palette.lilac400} 100%)`;
const gradientHero = `linear-gradient(135deg, ${palette.purple800} 0%, ${palette.purple600} 45%, ${palette.lilac600} 100%)`;
const shadowSm = '0 1px 3px rgba(58,28,118,0.08), 0 1px 2px rgba(58,28,118,0.06)';
const shadowMd = '0 6px 20px rgba(58,28,118,0.10), 0 2px 8px rgba(58,28,118,0.06)';
const shadowLg = '0 20px 50px rgba(58,28,118,0.16), 0 4px 16px rgba(58,28,118,0.08)';

const theme = createTheme({
  academix: { palette, gradientPrimary, gradientAccent, gradientHero, shadowSm, shadowMd, shadowLg },
  palette: {
    mode: 'light',
    primary: {
      main: palette.purple700,
      light: palette.purple500,
      dark: palette.purple900,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: palette.lilac500,
      light: palette.lilac400,
      dark: palette.lilac600,
      contrastText: '#FFFFFF',
    },
    background: {
      default: palette.bg,
      paper: palette.surface,
    },
    text: {
      primary: palette.ink,
      secondary: palette.slate,
      disabled: palette.slateLight,
    },
    divider: palette.line,
    success: {
      main: palette.success,
      light: '#22c55e',
      dark: '#15803d',
    },
    warning: {
      main: palette.warning,
      light: '#f59e0b',
      dark: '#b45309',
    },
    error: {
      main: palette.error,
      light: '#ef4444',
      dark: '#b91c1c',
    },
    info: {
      main: palette.info,
      light: '#ad93fb',
      dark: '#6532c4',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, letterSpacing: '0.01em' },
    overline: { fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em', fontWeight: 500 },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    shadowSm, shadowSm, shadowMd, shadowMd, shadowMd, shadowMd, shadowMd, shadowMd,
    shadowLg, shadowLg, shadowLg, shadowLg, shadowLg, shadowLg, shadowLg, shadowLg,
    shadowLg, shadowLg, shadowLg, shadowLg, shadowLg, shadowLg, shadowLg, shadowLg, shadowLg,
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.bg,
        },
        '::selection': {
          backgroundColor: 'rgba(120,71,227,0.2)',
          color: palette.ink,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${palette.line}`,
          boxShadow: 'none',
          color: palette.ink,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          paddingTop: 8,
          paddingBottom: 8,
        },
        containedPrimary: {
          backgroundImage: gradientPrimary,
          boxShadow: '0 4px 14px rgba(36,16,70,0.25)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(36,16,70,0.35)',
            backgroundImage: gradientPrimary,
            filter: 'brightness(1.08)',
          },
        },
        outlinedPrimary: {
          borderColor: palette.purple500,
          color: palette.purple700,
          '&:hover': {
            borderColor: palette.purple500,
            backgroundColor: 'rgba(120,71,227,0.06)',
          },
        },
        containedSecondary: {
          backgroundImage: gradientAccent,
          color: '#1a1a1a',
          '&:hover': { backgroundImage: gradientAccent, filter: 'brightness(1.05)' },
        },
        text: {
          color: palette.purple700,
          '&:hover': { backgroundColor: 'rgba(120,71,227,0.06)' },
        },
      },
    },
    // ---------------------------------------------------------------------
    // Formularios — estilo único para TODOS los módulos
    //
    // El tema ya estilizaba botones, tablas y tarjetas, pero los campos de
    // formulario seguían con la apariencia por defecto de MUI. Al declararlos
    // aquí, los cientos de campos de los 31 formularios heredan el mismo
    // diseño sin tocar cada archivo: borde lavanda hairline, foco morado con
    // halo suave, etiqueta semibold y textos de ayuda atenuados.
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: palette.slate,
          '&.Mui-focused': { color: palette.purple700 },
          '&.Mui-error': { color: palette.error },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          fontSize: '0.875rem',
          transition:
            'border-color 160ms cubic-bezier(0.4,0,0.2,1), box-shadow 160ms cubic-bezier(0.4,0,0.2,1)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.line,
            transition: 'border-color 160ms cubic-bezier(0.4,0,0.2,1)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: palette.lilac400 },
          '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(120,71,227,0.14)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.purple500,
            borderWidth: 2,
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: palette.error },
          '&.Mui-error.Mui-focused': { boxShadow: '0 0 0 3px rgba(185,28,28,0.12)' },
          '&.Mui-disabled': { backgroundColor: '#faf9ff' },
        },
        input: { paddingTop: 11, paddingBottom: 11 },
        inputSizeSmall: { paddingTop: 8, paddingBottom: 8 },
        multiline: { paddingTop: 11, paddingBottom: 11 },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: { paddingTop: 11, paddingBottom: 11 },
        icon: { color: palette.lilac500 },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 2,
          marginTop: 6,
          fontSize: '0.75rem',
          lineHeight: 1.45,
          color: palette.slateLight,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: { asterisk: { color: palette.error } },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: { border: `1px solid ${palette.line}`, boxShadow: shadowMd, borderRadius: 10 },
        option: {
          fontSize: '0.875rem',
          '&[aria-selected="true"]': { backgroundColor: 'rgba(120,71,227,0.10)' },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: { color: palette.lilac400, '&.Mui-checked': { color: palette.purple600 } },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: { color: palette.lilac400, '&.Mui-checked': { color: palette.purple600 } },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { '&.Mui-checked': { color: palette.purple600 } },
        track: { '.Mui-checked.Mui-checked + &': { backgroundColor: palette.purple500 } },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, boxShadow: shadowLg, border: `1px solid ${palette.line}` },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: '"Outfit", "Inter", sans-serif',
          fontWeight: 700,
          fontSize: '1.0625rem',
          padding: '18px 24px 12px',
          borderBottom: `1px solid ${palette.line}`,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: { root: { paddingTop: 20 } },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: { padding: '14px 24px 18px', borderTop: `1px solid ${palette.line}`, gap: 8 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, fontSize: '0.8125rem', fontWeight: 500, alignItems: 'center' },
        standardError: {
          backgroundColor: '#fef2f2',
          color: '#b91c1c',
          border: '1px solid rgba(185,28,28,0.22)',
        },
        standardSuccess: {
          backgroundColor: '#ecfdf5',
          color: '#047857',
          border: '1px solid rgba(4,120,87,0.22)',
        },
        standardWarning: {
          backgroundColor: '#fffbeb',
          color: '#b45309',
          border: '1px solid rgba(180,83,9,0.22)',
        },
        standardInfo: {
          backgroundColor: '#f0ebff',
          color: palette.purple700,
          border: '1px solid rgba(101,50,196,0.22)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: palette.purple900,
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '6px 10px',
          borderRadius: 8,
        },
        arrow: { color: palette.purple900 },
      },
    },
    MuiFab: {
      styleOverrides: {
        primary: {
          backgroundImage: gradientPrimary,
          '&:hover': { backgroundImage: gradientPrimary, filter: 'brightness(1.08)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: shadowMd,
          border: `1px solid ${palette.line}`,
          backgroundColor: palette.surface,
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
          backgroundColor: palette.surface,
        },
        outlined: {
          border: `1px solid ${palette.line}`,
          backgroundColor: palette.surface,
        },
        elevation1: { boxShadow: shadowSm, backgroundColor: palette.surface },
        elevation2: { boxShadow: shadowMd, backgroundColor: palette.surface },
        elevation3: { boxShadow: shadowMd, backgroundColor: palette.surface },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.purple900,
          backgroundImage: 'none',
          borderRight: `1px solid ${palette.purple700}`,
          color: '#f0ebff',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginLeft: 8,
          marginRight: 8,
          marginBottom: 2,
          width: 'auto',
          color: '#d8cdee',
          '&.Mui-selected': {
            backgroundColor: 'rgba(120,71,227,0.35)',
            border: '1px solid rgba(147, 197, 253, 0.4)',
            color: '#ffffff',
            boxShadow: 'none',
            '& .MuiListItemIcon-root': { color: palette.lilac300 },
            '&:hover': { backgroundColor: 'rgba(120,71,227,0.45)' },
          },
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: '#ffffff',
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: palette.lilac300,
          minWidth: 40,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { color: 'inherit' },
        secondary: { color: '#9c8fbb' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
        colorPrimary: {
          backgroundImage: gradientPrimary,
          color: '#FFFFFF',
        },
        colorSecondary: {
          backgroundColor: 'rgba(143,107,242,0.15)',
          color: palette.lilac600,
        },
        outlined: {
          borderColor: palette.lineHover,
          color: palette.slate,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 700 },
        colorDefault: {
          backgroundImage: gradientPrimary,
          color: '#FFFFFF',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${palette.line}`,
          backgroundColor: palette.surface,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#faf9ff',
          '& .MuiTableCell-root': {
            borderBottom: `2px solid ${palette.line}`,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: 'rgba(30, 90, 168, 0.04)' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: palette.purple700,
          fontWeight: 700,
          fontSize: '0.7rem',
          fontFamily: '"JetBrains Mono", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        },
        root: {
          borderBottomColor: palette.line,
          color: palette.ink,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 3,
          backgroundImage: gradientPrimary,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          color: palette.slate,
          '&.Mui-selected': { color: palette.purple700 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: palette.slate,
          '&.Mui-focused': { color: palette.purple500 },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: palette.surface,
          color: palette.ink,
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.purple500,
            borderWidth: 2,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.lineHover,
          },
        },
        notchedOutline: { borderColor: palette.line },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': { color: palette.purple500 },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: palette.purple500 },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: palette.slateLight,
          '&.Mui-checked': { color: palette.purple500 },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: palette.slateLight,
          '&.Mui-checked': { color: palette.purple500 },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 8,
          backgroundColor: 'rgba(36,16,70,0.08)',
        },
        bar: {
          borderRadius: 8,
          backgroundImage: gradientPrimary,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: shadowLg,
          backgroundColor: palette.surface,
          backgroundImage: 'none',
          border: `1px solid ${palette.line}`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 700, color: palette.purple700 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: palette.purple800,
          color: '#f0ebff',
          borderRadius: 8,
          fontSize: '0.75rem',
          border: `1px solid ${palette.purple600}`,
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        colorError: { backgroundColor: palette.error },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: shadowMd,
          backgroundColor: palette.surface,
          backgroundImage: 'none',
          border: `1px solid ${palette.line}`,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: palette.surfaceHover },
          '&.Mui-selected': { backgroundColor: 'rgba(120,71,227,0.1)' },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: palette.line },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: { minHeight: 64 },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(58,28,118,0.08)' },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.surface,
          backgroundImage: 'none',
          border: `1px solid ${palette.line}`,
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          backgroundColor: palette.purple800,
          color: '#f0ebff',
          border: `1px solid ${palette.purple600}`,
          borderRadius: 12,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: {
          '&:hover .MuiCardActionArea-focusHighlight': { opacity: 0.06 },
        },
      },
    },
  },
});

// The old metadata-only "/documents/new" route can't save (file_path/file_name
// are NOT NULL in the schema), so it redirects into the upload flow — this
// preserves any query string (e.g. ?studentId=X) across that redirect.
function DocumentsNewRedirect() {
  const location = useLocation();
  return <Navigate to={`/documents/upload${location.search}`} replace />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forbidden" element={<ForbiddenPage />} />

              {/* Rutas protegidas */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />

                  {/* Academic History */}
                  <Route element={<ProtectedRoute permission="academic-history.view" />}>
                    <Route path="/academic-history" element={<AcademicHistoryListPage />} />
                    <Route path="/academic-history/new" element={<AcademicHistoryFormPage />} />
                    <Route path="/academic-history/:id" element={<AcademicHistoryFormPage />} />
                    <Route path="/academic-history/:id/edit" element={<AcademicHistoryFormPage />} />
                  </Route>

                  {/* Academic Periods */}
                  <Route element={<ProtectedRoute permission="academic-periods.view" />}>
                    <Route path="/academic-periods" element={<AcademicPeriodListPage />} />
                    <Route path="/academic-periods/new" element={<AcademicPeriodFormPage />} />
                    <Route path="/academic-periods/:id" element={<AcademicPeriodFormPage />} />
                    <Route path="/academic-periods/:id/edit" element={<AcademicPeriodFormPage />} />
                  </Route>

                  {/* Academic Years */}
                  <Route element={<ProtectedRoute permission="academic-years.view" />}>
                    <Route path="/academic-years" element={<AcademicYearListPage />} />
                    <Route path="/academic-years/new" element={<AcademicYearFormPage />} />
                    <Route path="/academic-years/:id" element={<AcademicYearFormPage />} />
                    <Route path="/academic-years/:id/edit" element={<AcademicYearFormPage />} />
                  </Route>

                  {/* Activity */}
                  <Route element={<ProtectedRoute permission="activity.view" />}>
                    <Route path="/activity" element={<ActivityListPage />} />
                    <Route path="/activity/:id" element={<ActivityFormPage />} />
                  </Route>

                  {/* Assignments */}
                  <Route element={<ProtectedRoute permission="assignments.view" />}>
                    <Route path="/assignments" element={<AssignmentListPage />} />
                    <Route path="/assignments/new" element={<AssignmentFormPage />} />
                    <Route path="/assignments/:id" element={<AssignmentFormPage />} />
                    <Route path="/assignments/:id/edit" element={<AssignmentFormPage />} />
                  </Route>

                  {/* Attendance */}
                  <Route element={<ProtectedRoute permission="attendance.view" />}>
                    <Route path="/attendance" element={<AttendanceListPage />} />
                    <Route path="/attendance/monthly" element={<MonthlyAttendancePage />} />
                    <Route path="/attendance/monthly/:assignmentId" element={<MonthlyAttendancePage />} />
                    <Route path="/attendance/new" element={<AttendanceFormPage />} />
                    <Route path="/attendance/:id" element={<AttendanceFormPage />} />
                    <Route path="/attendance/:id/edit" element={<AttendanceFormPage />} />
                  </Route>

                  {/* Audit */}
                  <Route element={<ProtectedRoute permission="audit.view" />}>
                    <Route path="/audit" element={<AuditListPage />} />
                    <Route path="/audit/:id" element={<AuditFormPage />} />
                  </Route>

                  {/* Branches */}
                  <Route element={<ProtectedRoute permission="branches.view" />}>
                    <Route path="/branches" element={<BranchListPage />} />
                    <Route path="/branches/new" element={<BranchFormPage />} />
                    <Route path="/branches/:id" element={<BranchFormPage />} />
                    <Route path="/branches/:id/edit" element={<BranchFormPage />} />
                  </Route>

                  {/* Calendar */}
                  <Route element={<ProtectedRoute permission="calendar.view" />}>
                    <Route path="/calendar" element={<CalendarListPage />} />
                    <Route path="/calendar/new" element={<CalendarFormPage />} />
                    <Route path="/calendar/:id" element={<CalendarFormPage />} />
                    <Route path="/calendar/:id/edit" element={<CalendarFormPage />} />
                  </Route>

                  {/* Credits */}
                  <Route element={<ProtectedRoute permission="credits.view" />}>
                    <Route path="/credits" element={<CreditListPage />} />
                    <Route path="/credits/new" element={<CreditFormPage />} />
                    <Route path="/credits/:id" element={<CreditFormPage />} />
                    <Route path="/credits/:id/edit" element={<CreditFormPage />} />
                  </Route>

                  {/* Documents */}
                  <Route element={<ProtectedRoute permission="documents.view" />}>
                    <Route path="/documents" element={<DocumentListPage />} />
                    <Route path="/documents/new" element={<DocumentsNewRedirect />} />
                    <Route path="/documents/upload" element={<DocumentFormPage />} />
                    <Route path="/documents/:id" element={<DocumentFormPage />} />
                    <Route path="/documents/:id/edit" element={<DocumentFormPage />} />
                  </Route>

                  {/* GPA */}
                  <Route element={<ProtectedRoute permission="gpa.view" />}>
                    <Route path="/gpa" element={<GpaListPage />} />
                    <Route path="/gpa/new" element={<GpaFormPage />} />
                    <Route path="/gpa/:id" element={<GpaFormPage />} />
                    <Route path="/gpa/:id/edit" element={<GpaFormPage />} />
                  </Route>

                  {/* Grade Change Requests */}
                  <Route element={<ProtectedRoute permission="grade-change-requests.view" />}>
                    <Route path="/grade-change-requests" element={<GradeChangeRequestListPage />} />
                    <Route path="/grade-change-requests/new" element={<GradeChangeRequestFormPage />} />
                    <Route path="/grade-change-requests/:id" element={<GradeChangeRequestFormPage />} />
                    <Route path="/grade-change-requests/:id/edit" element={<GradeChangeRequestFormPage />} />
                  </Route>

                  {/* Grades */}
                  <Route element={<ProtectedRoute permission="grades.view" />}>
                    <Route path="/grades" element={<GradeListPage />} />
                    <Route path="/grades/new" element={<GradeFormPage />} />
                    <Route path="/grades/:id" element={<GradeFormPage />} />
                    <Route path="/grades/:id/edit" element={<GradeFormPage />} />
                  </Route>

                  {/* Graduation */}
                  <Route element={<ProtectedRoute permission="graduation.view" />}>
                    <Route path="/graduation" element={<GraduationListPage />} />
                    <Route path="/graduation/new" element={<GraduationFormPage />} />
                    <Route path="/graduation/:id" element={<GraduationFormPage />} />
                    <Route path="/graduation/:id/edit" element={<GraduationFormPage />} />
                  </Route>

                  {/* Gransif */}
                  <Route element={<ProtectedRoute permission="gransif.view" />}>
                    <Route path="/gransif" element={<GransifListPage />} />
                    <Route path="/gransif/new" element={<GransifFormPage />} />
                    <Route path="/gransif/:id" element={<GransifFormPage />} />
                    <Route path="/gransif/:id/edit" element={<GransifFormPage />} />
                  </Route>

                  {/* Guardians */}
                  <Route element={<ProtectedRoute permission="guardians.view" />}>
                    <Route path="/guardians" element={<GuardianListPage />} />
                    <Route path="/guardians/new" element={<GuardianFormPage />} />
                    <Route path="/guardians/:id" element={<GuardianFormPage />} />
                    <Route path="/guardians/:id/edit" element={<GuardianFormPage />} />
                  </Route>

                  {/* Medical Records */}
                  <Route element={<ProtectedRoute permission="medical-records.view" />}>
                    <Route path="/medical-records" element={<MedicalRecordListPage />} />
                    <Route path="/medical-records/new" element={<MedicalRecordFormPage />} />
                    <Route path="/medical-records/:id" element={<MedicalRecordFormPage />} />
                    <Route path="/medical-records/:id/edit" element={<MedicalRecordFormPage />} />
                  </Route>

                  {/* Permissions */}
                  <Route element={<ProtectedRoute permission="permissions.view" />}>
                    <Route path="/permissions" element={<PermissionListPage />} />
                    <Route path="/permissions/new" element={<PermissionFormPage />} />
                    <Route path="/permissions/:id" element={<PermissionFormPage />} />
                    <Route path="/permissions/:id/edit" element={<PermissionFormPage />} />
                  </Route>

                  {/* Previous Schools */}
                  <Route element={<ProtectedRoute permission="previous-schools.view" />}>
                    <Route path="/previous-schools" element={<PreviousSchoolListPage />} />
                    <Route path="/previous-schools/new" element={<PreviousSchoolFormPage />} />
                    <Route path="/previous-schools/:id" element={<PreviousSchoolFormPage />} />
                    <Route path="/previous-schools/:id/edit" element={<PreviousSchoolFormPage />} />
                  </Route>

                  {/* Progress Reports */}
                  <Route element={<ProtectedRoute permission="progress-reports.view" />}>
                    <Route path="/progress-reports" element={<ProgressReportListPage />} />
                    <Route path="/progress-reports/new" element={<ProgressReportFormPage />} />
                    <Route path="/progress-reports/:id" element={<ProgressReportFormPage />} />
                    <Route path="/progress-reports/:id/edit" element={<ProgressReportFormPage />} />
                  </Route>

                  {/* Report Cards */}
                  <Route element={<ProtectedRoute permission="report-cards.view" />}>
                    <Route path="/report-cards" element={<ReportCardListPage />} />
                    <Route path="/report-cards/new" element={<ReportCardFormPage />} />
                    <Route path="/report-cards/:id" element={<ReportCardFormPage />} />
                    <Route path="/report-cards/:id/edit" element={<ReportCardFormPage />} />
                  </Route>

                  {/* Reports */}
                  <Route element={<ProtectedRoute permission="reports.view" />}>
                    <Route path="/reports" element={<ReportListPage />} />
                    <Route path="/reports/:id" element={<ReportFormPage />} />
                  </Route>

                  {/* Roles */}
                  <Route element={<ProtectedRoute permission="roles.view" />}>
                    <Route path="/roles" element={<RoleListPage />} />
                    <Route path="/roles/new" element={<RoleFormPage />} />
                    <Route path="/roles/:id" element={<RoleFormPage />} />
                    <Route path="/roles/:id/edit" element={<RoleFormPage />} />
                    <Route path="/roles/:id/permissions" element={<RolePermissionsPage />} />
                  </Route>

                  {/* Scholarships */}
                  <Route element={<ProtectedRoute permission="scholarships.view" />}>
                    <Route path="/scholarships" element={<ScholarshipListPage />} />
                    <Route path="/scholarships/new" element={<ScholarshipFormPage />} />
                    <Route path="/scholarships/:id" element={<ScholarshipFormPage />} />
                    <Route path="/scholarships/:id/edit" element={<ScholarshipFormPage />} />
                  </Route>

                  {/* Settings */}
                  <Route element={<ProtectedRoute permission="settings.view" />}>
                    <Route path="/settings" element={<SettingListPage />} />
                    <Route path="/settings/edit" element={<SettingListPage />} />
                  </Route>

                  {/* Students */}
                  <Route element={<ProtectedRoute permission="students.view" />}>
                    <Route path="/students" element={<StudentListPage />} />
                    <Route path="/students/new" element={<StudentFormPage />} />
                    <Route path="/students/:id" element={<StudentRecordPage />} />
                    <Route path="/students/:id/edit" element={<StudentFormPage />} />
                    <Route path="/students/:id/record" element={<StudentRecordPage />} />
                  </Route>

                  {/* Subjects */}
                  <Route element={<ProtectedRoute permission="subjects.view" />}>
                    <Route path="/subjects" element={<SubjectListPage />} />
                    <Route path="/subjects/new" element={<SubjectFormPage />} />
                    <Route path="/subjects/:id" element={<SubjectFormPage />} />
                    <Route path="/subjects/:id/edit" element={<SubjectFormPage />} />
                  </Route>

                  {/* Teachers */}
                  <Route element={<ProtectedRoute permission="teachers.view" />}>
                    <Route path="/teachers" element={<TeacherListPage />} />
                    <Route path="/teachers/new" element={<TeacherFormPage />} />
                    <Route path="/teachers/:id" element={<TeacherRecordPage />} />
                    <Route path="/teachers/:id/edit" element={<TeacherFormPage />} />
                    <Route path="/teachers/:id/assignments" element={<TeacherRecordPage />} />
                  </Route>

                  {/* Transcripts */}
                  <Route element={<ProtectedRoute permission="transcripts.view" />}>
                    <Route path="/transcripts" element={<TranscriptListPage />} />
                    <Route path="/transcripts/new" element={<TranscriptFormPage />} />
                    <Route path="/transcripts/:id" element={<TranscriptFormPage />} />
                    <Route path="/transcripts/:id/edit" element={<TranscriptFormPage />} />
                  </Route>

                  {/* Users */}
                  <Route element={<ProtectedRoute permission="users.view" />}>
                    <Route path="/users" element={<UserListPage />} />
                    <Route path="/users/new" element={<UserFormPage />} />
                    <Route path="/users/:id" element={<UserFormPage />} />
                    <Route path="/users/:id/edit" element={<UserFormPage />} />
                    <Route path="/users/:id/change-password" element={<UserFormPage />} />
                    <Route path="/users/:id/roles" element={<UserRolesPage />} />
                  </Route>

                  {/* Profile (autogestión del propio usuario: solo auth) */}
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Server Control Panel: requiere permiso de sistema */}
                  <Route element={<ProtectedRoute anyPermissions={['system.view', 'system.manage']} />}>
                    <Route path="/server-control" element={<ServerControlPage />} />
                  </Route>

                  {/* Super Admin Console: requiere permiso de administración */}
                  <Route
                    element={
                      <ProtectedRoute
                        anyPermissions={[
                          'users.view',
                          'roles.view',
                          'permissions.view',
                          'branches.view',
                          'settings.view',
                          'audit.view',
                          'activity.view',
                        ]}
                      />
                    }
                  >
                    <Route path="/admin" element={<SuperAdminConsolePage />} />
                  </Route>
                </Route>
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;