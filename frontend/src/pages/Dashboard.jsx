// FILE: frontend/src/pages/Dashboard.jsx
/**
 * Dashboard — panel principal de ACADEMIX 2.0.
 *
 * REDISEÑO COMPLETO. La versión anterior tenía seis contadores y dos listas:
 *   · sin gráficos, sin panel de contenedores y sin estados de carga reales
 *     (un `LinearProgress` genérico y luego un salto brusco al contenido),
 *   · sin estados vacíos en los bloques (un panel en blanco sin explicación),
 *   · una rejilla de tarjetas que en móvil quedaba a una columna sin jerarquía,
 *   · y una consulta de asistencia que enviaba `?date=YYYY-MM-DD`, un parámetro
 *     que el backend NO filtra (usa `dateFrom`/`dateTo`), así que «Asistencia de
 *     hoy» mostraba en realidad las últimas asistencias de cualquier fecha.
 *
 * Lo que hace ahora:
 *   · 6 KPI verificados contra la API con su variante «activo» cuando aplica,
 *   · 3 visualizaciones reales (matrícula por grado, distribución de asistencia,
 *     promedio por materia) construidas con datos de la API, no con maquetas,
 *   · 2 tablas (bitácora reciente y asistencia del día, esta última ya bien
 *     filtrada con `dateFrom`/`dateTo`),
 *   · estado de carga esqueletado, estado vacío explícito y error recuperable
 *     en CADA bloque — un módulo sin permiso no puede dejar el panel en blanco,
 *   · rejilla responsive real (1 → 2 → 3 → 6 columnas).
 *
 * Nota sobre permisos: cada consulta se hace con `Promise.allSettled`, de modo
 * que un 403 en un módulo (usuario sin permiso) solo deja en cero ESE bloque;
 * antes un único 403 tumbaba el panel entero. Además los KPI se filtran por el
 * permiso real del módulo.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity as ActivityIcon,
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  Clock,
  FileText,
  GraduationCap,
  PieChart,
  RefreshCw,
  School,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { api } from '../api/axiosClient';
import Logo from '../components/Logo';
import { ErrorBanner } from '../components/FormKit';
import {
  EmptyState,
  Panel,
  PanelSkeleton,
  StatCard,
  StatCardSkeleton,
} from '../components/DashboardWidgets';
import { BarChart, DonutChart, ProgressBar } from '../components/Charts';
import { cn } from '../ui/cn';

/** Orden de los grados (idéntico al resto del sistema). */
const GRADE_ORDER = ['1ro', '2do', '3ro', '4to', '5to', '6to'];

/** Metadatos de los estados de asistencia (códigos del backend). */
const ATTENDANCE_STATUS = {
  P: { key: 'present', color: '#047857' },
  O: { key: 'late', color: '#7c3aed' },
  E: { key: 'excused', color: '#b45309' },
  U: { key: 'absent', color: '#b91c1c' },
};

/** Tarjetas de KPI: módulo + permiso que las habilita + acento visual. */
const KPI_DEFS = [
  { key: 'students', module: 'students', icon: Users, accent: 'brand' },
  { key: 'teachers', module: 'teachers', icon: School, accent: 'deep' },
  { key: 'subjects', module: 'subjects', icon: BookOpen, accent: 'lilac' },
  { key: 'grades', module: 'grades', icon: GraduationCap, accent: 'royal' },
  { key: 'attendance', module: 'attendance', icon: CalendarCheck, accent: 'soft' },
  { key: 'reports', module: 'reports', icon: FileText, accent: 'brand' },
];

/** Fila de datos de una lista paginada, o `[]` si la petición falló. */
const listOf = (result) => {
  if (result?.status !== 'fulfilled') return [];
  const rows = result.value?.data;
  return Array.isArray(rows) ? rows : [];
};

/** Total reportado por la API, o `0` si la petición falló. */
const totalOf = (result) =>
  result?.status === 'fulfilled' ? Number(result.value?.total) || 0 : 0;

const DashboardPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { canView } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [totals, setTotals] = useState({});
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);

  const loadDashboardData = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const today = new Date().toISOString().split('T')[0];

    // Lanza la petición solo si el rol tiene permiso de lectura en el módulo.
    // Si no lo tiene, se resuelve como "sin datos" y las tarjetas de ese
    // módulo simplemente no se pintan (ver KPI_DEFS.filter(canView)).
    const ask = (module, request) =>
      canView(module) ? request() : Promise.resolve(null);

    // Una sola tanda de peticiones paralelas. `allSettled` es deliberado: el
    // panel debe seguir siendo útil aunque el usuario no tenga permiso en
    // algún módulo (403) o un endpoint esté caído.
    const [
      studentsRes,
      teachersRes,
      subjectsRes,
      gradesRes,
      attendanceRes,
      reportsRes,
      activityRes,
      todayRes,
    ] = await Promise.allSettled([
      // FIX (bitácora 2026-09-15): con un rol limitado el panel pedía igual
      // TODOS los módulos y el servidor devolvía un 403 por cada uno
      // (/activity, /reports, /teachers...) en cada render. Ahora solo se
      // consulta lo que el rol puede ver; el resto ni se pide.
      ask('students', () => api.get('/students', { params: { pageSize: 200 } })),
      ask('teachers', () => api.get('/teachers', { params: { pageSize: 1 } })),
      ask('subjects', () => api.get('/subjects', { params: { pageSize: 100 } })),
      ask('grades', () => api.get('/grades', { params: { pageSize: 200 } })),
      ask('attendance', () => api.get('/attendance', { params: { pageSize: 200 } })),
      ask('reports', () => api.get('/reports', { params: { pageSize: 1 } })),
      ask('activity', () => api.get('/activity', { params: { pageSize: 6 } })),
      ask('attendance', () =>
        api.get('/attendance', { params: { dateFrom: today, dateTo: today, pageSize: 20 } })
      ),
    ]);

    setTotals({
      students: totalOf(studentsRes),
      teachers: totalOf(teachersRes),
      subjects: totalOf(subjectsRes),
      grades: totalOf(gradesRes),
      attendance: totalOf(attendanceRes),
      reports: totalOf(reportsRes),
    });

    setStudents(listOf(studentsRes));
    setSubjects(listOf(subjectsRes));
    setGrades(listOf(gradesRes));
    setAttendance(listOf(attendanceRes));
    setRecentActivity(listOf(activityRes));
    setTodayAttendance(listOf(todayRes));

    // Solo se avisa de fallo si TODO falló: así un módulo sin permiso no
    // pinta un error rojo en la cara del usuario.
    // Solo cuentan los módulos que SÍ se pidieron: los que el rol no puede ver
    // se resuelven con `null` y no deben interpretarse como éxito ni como fallo.
    const results = [studentsRes, teachersRes, subjectsRes, gradesRes, attendanceRes, reportsRes]
      .filter((r) => !(r.status === 'fulfilled' && r.value === null));
    if (results.length && results.every((r) => r.status === 'rejected')) {
      setError(t('dashboard.loadError'));
    }

    setUpdatedAt(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [t, canView]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  /* ------------------------------------------------------------------ */
  /* Derivaciones                                                        */
  /* ------------------------------------------------------------------ */

  /** Matrícula por grado, en el orden académico correcto. */
  const enrollmentByGrade = useMemo(() => {
    if (!students.length) return [];
    const counts = new Map();
    for (const s of students) {
      const key = s.grade || t('dashboard.ungraded');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const known = GRADE_ORDER.filter((g) => counts.has(g));
    const unknown = [...counts.keys()].filter((g) => !GRADE_ORDER.includes(g));
    return [...known, ...unknown].map((label) => ({ label, value: counts.get(label) }));
  }, [students, t]);

  /** Distribución de los registros de asistencia por estado. */
  const attendanceDistribution = useMemo(() => {
    const counts = { P: 0, O: 0, E: 0, U: 0 };
    for (const record of attendance) {
      if (counts[record.status] != null) counts[record.status] += 1;
    }
    return Object.entries(ATTENDANCE_STATUS).map(([code, meta]) => ({
      label: t(`dashboard.status.${meta.key}`),
      value: counts[code],
      color: meta.color,
    }));
  }, [attendance, t]);

  /** Tasa de asistencia (presentes + tardanzas sobre el total registrado). */
  const attendanceRate = useMemo(() => {
    const present = attendanceDistribution.find((d) => d.color === '#047857')?.value || 0;
    const late = attendanceDistribution.find((d) => d.color === '#7c3aed')?.value || 0;
    const total = attendanceDistribution.reduce((sum, d) => sum + d.value, 0);
    if (!total) return null;
    return { pct: Math.round(((present + late) / total) * 100), total };
  }, [attendanceDistribution]);

  /** Promedio de calificaciones por materia (top 6, de mayor a menor). */
  const averageBySubject = useMemo(() => {
    if (!grades.length) return [];
    const nameById = new Map(subjects.map((s) => [s.id, s.name]));
    const buckets = new Map();

    for (const grade of grades) {
      const value = Number(grade.grade_value);
      if (!Number.isFinite(value)) continue;
      const id = grade.subject_id ?? 'unknown';
      if (!buckets.has(id)) buckets.set(id, { total: 0, count: 0 });
      const bucket = buckets.get(id);
      bucket.total += value;
      bucket.count += 1;
    }

    return [...buckets.entries()]
      .map(([id, { total, count }]) => ({
        id,
        label: nameById.get(id) || t('dashboard.unknownSubject'),
        average: total / count,
        count,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 6);
  }, [grades, subjects, t]);

  /** Nº de estudiantes en estado ACTIVE dentro de la muestra cargada. */
  const activeStudents = useMemo(
    () => students.filter((s) => (s.status || '').toUpperCase() === 'ACTIVE').length,
    [students]
  );

  const kpis = useMemo(
    () =>
      KPI_DEFS.filter((def) => canView(def.module)).map((def) => ({
        ...def,
        title: t(`${def.module}.title`, { defaultValue: def.key }),
        value: totals[def.key] ?? 0,
        hint:
          def.key === 'students' && students.length
            ? t('dashboard.activeCount', { count: activeStudents })
            : undefined,
        to: `/${def.module}`,
      })),
    [canView, t, totals, students.length, activeStudents]
  );

  const formattedUpdatedAt = updatedAt ? updatedAt.toLocaleTimeString() : '';

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* ===================== Cabecera ===================== */}
      <header className="relative overflow-hidden rounded-2xl bg-hero-gradient p-5 text-white shadow-xl sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 95% 0%, rgba(255,255,255,0.14) 0%, transparent 42%), radial-gradient(circle at 0% 100%, rgba(167,139,250,0.16) 0%, transparent 52%)',
          }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="hidden shrink-0 sm:block">
              <Logo showText={false} size={34} withGlow />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
                {t('dashboard.welcome')}, {user?.full_name || t('common.defaultUserName')}
              </h1>
              <p className="mt-1 text-sm text-white/90">{t('dashboard.subtitle')}</p>
              {formattedUpdatedAt && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-2xs font-medium text-white/70">
                  <Clock className="h-3 w-3" />
                  {t('dashboard.lastUpdated', { time: formattedUpdatedAt })}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadDashboardData({ silent: true })}
            disabled={loading || refreshing}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2',
              'text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200',
              'hover:border-white/40 hover:bg-white/20 disabled:pointer-events-none disabled:opacity-60'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </button>
        </div>
      </header>

      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      {/* ===================== KPIs ===================== */}
      <section data-testid="dashboard-kpi" aria-label={t('dashboard.kpiSection')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
            : kpis.map((kpi) => (
                <StatCard
                  key={kpi.key}
                  label={kpi.title}
                  value={kpi.value}
                  icon={kpi.icon}
                  accent={kpi.accent}
                  hint={kpi.hint}
                  to={kpi.to}
                />
              ))}
        </div>

        {!loading && kpis.length === 0 && (
          <Panel className="mt-4">
            <EmptyState
              icon={AlertTriangle}
              title={t('dashboard.noModules')}
              description={t('dashboard.noModulesDesc')}
            />
          </Panel>
        )}
      </section>

      {/* ===================== Gráficos ===================== */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2" data-testid="dashboard-charts" aria-label={t('dashboard.chartsSection')}>
        {loading ? (
          <>
            <PanelSkeleton />
            <PanelSkeleton />
          </>
        ) : (
          <>
            <Panel
              title={t('dashboard.enrollmentByGrade')}
              description={t('dashboard.enrollmentByGradeDesc')}
              icon={TrendingUp}
              actions={
                <Link to="/students" className="text-xs font-semibold text-brand-700 hover:text-brand-600">
                  {t('dashboard.viewAll')}
                </Link>
              }
            >
              {enrollmentByGrade.length > 0 ? (
                <BarChart
                  data={enrollmentByGrade}
                  emptyLabel={t('dashboard.noStudents')}
                  valueFormatter={(v) => v}
                />
              ) : (
                <EmptyState
                  compact
                  icon={Users}
                  title={t('dashboard.noStudents')}
                  description={t('dashboard.noStudentsDesc')}
                />
              )}
            </Panel>

            <Panel
              title={t('dashboard.attendanceDistribution')}
              description={t('dashboard.attendanceDistributionDesc')}
              icon={PieChart}
            >
              {attendanceDistribution.some((d) => d.value > 0) ? (
                <div className="space-y-5">
                  <DonutChart
                    data={attendanceDistribution}
                    centerValue={attendanceRate ? `${attendanceRate.pct}%` : '0%'}
                    centerLabel={t('dashboard.attendanceRate')}
                  />
                  {attendanceRate && (
                    <ProgressBar
                      value={attendanceRate.pct}
                      label={t('dashboard.attendanceRate')}
                      valueLabel={`${attendanceRate.pct}%`}
                      tone={attendanceRate.pct >= 85 ? 'success' : attendanceRate.pct >= 70 ? 'brand' : 'warning'}
                    />
                  )}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={CalendarCheck}
                  title={t('dashboard.noAttendance')}
                  description={t('dashboard.noAttendanceDesc')}
                />
              )}
            </Panel>
          </>
        )}
      </section>

      {/* ===================== Promedios + Bitácora ===================== */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-5" data-testid="dashboard-analytics" aria-label={t('dashboard.analyticsSection')}>
        {loading ? (
          <>
            <PanelSkeleton className="lg:col-span-2" />
            <PanelSkeleton className="lg:col-span-3" />
          </>
        ) : (
          <>
            <Panel
              className="lg:col-span-2"
              title={t('dashboard.averageBySubject')}
              description={t('dashboard.averageBySubjectDesc')}
              icon={GraduationCap}
            >
              {averageBySubject.length > 0 ? (
                <ul className="space-y-4">
                  {averageBySubject.map((subject) => (
                    <li key={subject.id}>
                      <ProgressBar
                        value={subject.average}
                        max={100}
                        label={subject.label}
                        valueLabel={subject.average.toFixed(1)}
                        tone={subject.average >= 80 ? 'success' : subject.average >= 70 ? 'brand' : 'warning'}
                      />
                      <p className="mt-1 text-2xs text-ink-muted">
                        {t('dashboard.gradesCount', { count: subject.count })}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  icon={GraduationCap}
                  title={t('dashboard.noGrades')}
                  description={t('dashboard.noGradesDesc')}
                />
              )}
            </Panel>

            <Panel
              className="lg:col-span-3"
              title={t('dashboard.recentActivity')}
              description={t('dashboard.recentActivityDesc')}
              icon={ActivityIcon}
              actions={
                <Link to="/activity" className="text-xs font-semibold text-brand-700 hover:text-brand-600">
                  {t('dashboard.viewAll')}
                </Link>
              }
              bodyClassName="p-0"
            >
              {recentActivity.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[34rem] border-collapse">
                    <thead>
                      <tr>
                        <th className="table-head-cell">{t('dashboard.columns.module')}</th>
                        <th className="table-head-cell">{t('dashboard.columns.action')}</th>
                        <th className="table-head-cell">{t('dashboard.columns.record')}</th>
                        <th className="table-head-cell">{t('dashboard.columns.user')}</th>
                        <th className="table-head-cell">{t('dashboard.columns.date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map((item, index) => (
                        <tr key={item.id || index} className="table-row">
                          <td className="table-cell font-medium capitalize">{item.module || '—'}</td>
                          <td className="table-cell">
                            <span className="chip bg-brand-50 text-brand-700">{item.action || '—'}</span>
                          </td>
                          <td className="table-cell font-mono text-xs text-ink-soft">
                            {item.record_code || '—'}
                          </td>
                          <td className="table-cell text-ink-soft">{item.user_name || '—'}</td>
                          <td className="table-cell whitespace-nowrap text-xs text-ink-muted">
                            {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={ActivityIcon}
                  title={t('dashboard.noActivity')}
                  description={t('dashboard.noActivityDesc')}
                />
              )}
            </Panel>
          </>
        )}
      </section>

      {/* ===================== Asistencia del día ===================== */}
      <section data-testid="dashboard-today" aria-label={t('dashboard.todayAttendance')}>
        {loading ? (
          <PanelSkeleton />
        ) : (
          <Panel
            title={t('dashboard.todayAttendance')}
            description={t('dashboard.todayAttendanceDesc')}
            icon={UserCheck}
            actions={
              <Link to="/attendance" className="text-xs font-semibold text-brand-700 hover:text-brand-600">
                {t('dashboard.viewAll')}
              </Link>
            }
            bodyClassName="p-0"
          >
            {todayAttendance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] border-collapse">
                  <thead>
                    <tr>
                      <th className="table-head-cell">{t('dashboard.columns.student')}</th>
                      <th className="table-head-cell">{t('dashboard.columns.status')}</th>
                      <th className="table-head-cell">{t('dashboard.columns.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAttendance.map((record, index) => {
                      const meta = ATTENDANCE_STATUS[record.status];
                      return (
                        <tr key={record.id || `${record.student_id}-${record.date}-${index}`} className="table-row">
                          <td className="table-cell font-medium">
                            {record.student_name || t('dashboard.unknownStudent')}
                          </td>
                          <td className="table-cell">
                            <span
                              className="chip"
                              style={{
                                backgroundColor: `${meta?.color || '#7c6faa'}1a`,
                                color: meta?.color || '#7c6faa',
                              }}
                            >
                              <span
                                className="badge-dot"
                                style={{ backgroundColor: meta?.color || '#7c6faa' }}
                              />
                              {meta ? t(`dashboard.status.${meta.key}`) : record.status || '—'}
                            </span>
                          </td>
                          <td className="table-cell whitespace-nowrap text-xs text-ink-muted">
                            {record.date ? new Date(record.date).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={CalendarCheck}
                title={t('dashboard.noTodayAttendance')}
                description={t('dashboard.noTodayAttendanceDesc')}
              />
            )}
          </Panel>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
