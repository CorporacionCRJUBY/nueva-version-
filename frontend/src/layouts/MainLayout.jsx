// FILE: frontend/src/layouts/MainLayout.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu as MenuIcon,
  LayoutDashboard,
  Users,
  School,
  GraduationCap,
  CalendarCheck,
  History,
  CalendarDays,
  FileText,
  Settings,
  UserCircle,
  LogOut,
  ShieldCheck,
  Bell,
  Languages,
  Building2,
  Award,
  Star,
  FolderOpen,
  HeartPulse,
  ClipboardCheck,
  ChevronLeft,
  Server,
  Activity,
  Search,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import GlobalErrorSnackbar from '../components/GlobalErrorSnackbar';
import Logo from '../components/Logo';
import { cn } from '../ui/cn';

/**
 * Layout principal del panel administrativo.
 *
 * REDISEÑO VISUAL — el shell adopta el lenguaje visual del panel de referencia:
 * sidebar azul marino profundo (navy-900) con acento azul, topbar blanca con
 * búsqueda rápida «⌘K», grupos de navegación con etiqueta en mayúsculas,
 * colapso a 76px y tarjeta de usuario al pie.
 *
 * Se conservan ÍNTEGRAS todas las capacidades funcionales:
 *   - la estructura de navegación y sus agrupaciones,
 *   - el filtrado por permisos/roles (system.view, isAdmin),
 *   - el cambio de idioma, las notificaciones y el logout,
 *   - el colapso del sidebar y su comportamiento responsive.
 */
const SIDEBAR_WIDTH = 264;
const SIDEBAR_COLLAPSED = 76;

/** Ancho (px) a partir del cual se considera pantalla de escritorio. */
const DESKTOP_MIN_WIDTH = 1024;

const isDesktopViewport = () =>
  typeof window === 'undefined' ? true : window.innerWidth >= DESKTOP_MIN_WIDTH;

/** Hook de "click fuera" para los menús desplegables. */
function useClickOutside(onOutside) {
  const ref = useRef(null);
  useEffect(() => {
    if (!onOutside) return undefined;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && onOutside());
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [onOutside]);
  return ref;
}

/** Etiqueta de grupo de navegación. */
const NavGroupLabel = ({ children, open }) =>
  open ? <p className="nav-group-label">{children}</p> : <div className="h-3" />;

const MainLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();

  // FIX (QA — responsive): en móvil el sidebar ocupaba 264px de un viewport
  // de 390px y desbordaba la página en horizontal. Ahora arranca COLAPSADO en
  // pantallas pequeñas y se reajusta al cambiar el tamaño de ventana.
  const [drawerOpen, setDrawerOpen] = useState(isDesktopViewport);
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Búsqueda rápida de la barra superior (⌘K): navega a cualquier destino.
  const [quickQuery, setQuickQuery] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const quickInputRef = useRef(null);
  const quickRef = useClickOutside(() => setQuickOpen(false));

  useEffect(() => {
    const onResize = () => {
      const desktop = isDesktopViewport();
      setIsDesktop((prev) => {
        // Al cruzar el umbral, ajustamos el sidebar al modo correspondiente.
        if (prev !== desktop) setDrawerOpen(desktop);
        return desktop;
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    // En móvil el cambio de orientación también alterna el modo del sidebar.
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  /** Navega y, en móvil, cierra el sidebar para liberar la pantalla. */
  const goTo = (path) => {
    navigate(path);
    if (!isDesktopViewport()) setDrawerOpen(false);
  };


  const userMenuRef = useClickOutside(() => setUserMenuOpen(false));
  const langMenuRef = useClickOutside(() => setLangMenuOpen(false));


  const isAdmin = user?.roles?.includes('SUPER_ADMIN') || user?.roles?.includes('ADMIN');
  const canViewSystem = isAdmin || user?.permissions?.includes('system.view');

  const handleLanguageChange = async (lang) => {
    await changeLanguage(lang);
    setLangMenuOpen(false);
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  const isSelected = (path) => location.pathname === path;

  /**
   * Destinos de la búsqueda rápida (⌘K).
   *
   * Es una lista REAL de rutas: el cuadro de búsqueda no es decorativo — filtra
   * estas entradas y navega a la seleccionada. Se alimenta con las mismas
   * etiquetas traducidas que el menú lateral, de modo que el idioma se respeta.
   */
  const quickDestinations = useMemo(
    () => [
      { to: '/dashboard', label: t('dashboard.title') || 'Dashboard', icon: LayoutDashboard },
      { to: '/students', label: t('students.title') || 'Students', icon: Users },
      { to: '/guardians', label: t('guardians.title') || 'Guardians', icon: Users },
      { to: '/teachers', label: t('teachers.title') || 'Teachers', icon: School },
      { to: '/subjects', label: t('subjects.title') || 'Subjects', icon: FileText },
      { to: '/assignments', label: t('assignments.title') || 'Academic Assignments', icon: ClipboardCheck },
      { to: '/attendance', label: t('attendance.title') || 'Attendance', icon: CalendarCheck },
      { to: '/attendance/monthly', label: t('attendance.monthlyTitle') || 'Monthly Attendance', icon: CalendarCheck },
      { to: '/grades', label: t('grades.title') || 'Grades', icon: GraduationCap },
      { to: '/grade-change-requests', label: t('gradeChangeRequests.title') || 'Grade Change Requests', icon: GraduationCap },
      { to: '/academic-history', label: t('academicHistory.title') || 'Academic History', icon: History },
      { to: '/scholarships', label: t('scholarships.title') || 'Scholarships', icon: Star },
      { to: '/documents', label: t('documents.title') || 'Documents', icon: FolderOpen },
      { to: '/medical-records', label: t('medicalRecords.title') || 'Medical Records', icon: HeartPulse },
      { to: '/previous-schools', label: t('previousSchools.title') || 'Previous Schools', icon: School },
      { to: '/reports', label: t('reports.title') || 'Reports', icon: FileText },
      { to: '/report-cards', label: t('reportCards.title') || 'Report Cards', icon: FileText },
      { to: '/progress-reports', label: t('progressReports.title') || 'Progress Reports', icon: FileText },
      { to: '/transcripts', label: t('transcripts.title') || 'Transcripts', icon: FileText },
      { to: '/graduation', label: t('graduation.title') || 'Graduation', icon: Award },
      { to: '/gransif', label: t('gransif.title') || 'GRANSIF', icon: Award },
      { to: '/branches', label: t('branches.title') || 'Branches', icon: Building2 },
      { to: '/calendar', label: t('calendar.title') || 'School Calendar', icon: CalendarDays },
      { to: '/users', label: t('admin.menu.users') || 'Users', icon: ShieldCheck },
      { to: '/roles', label: t('admin.menu.roles') || 'Roles', icon: ShieldCheck },
      { to: '/permissions', label: t('admin.menu.permissions') || 'Permissions', icon: ShieldCheck },
      { to: '/academic-years', label: t('admin.menu.academicYears') || 'Academic Years', icon: CalendarDays },
      { to: '/academic-periods', label: t('admin.menu.academicPeriods') || 'Academic Periods', icon: CalendarDays },
      { to: '/credits', label: t('admin.menu.creditsManagement') || 'Credits', icon: GraduationCap },
      { to: '/gpa', label: t('admin.menu.gpaCalculation') || 'GPA', icon: GraduationCap },
      { to: '/audit', label: t('admin.menu.auditLogs') || 'Audit Logs', icon: History },
      { to: '/activity', label: t('admin.menu.activityFeed') || 'Activity', icon: Activity },
      { to: '/settings', label: t('admin.menu.systemSettings') || 'Settings', icon: Settings },
      { to: '/server-control', label: t('admin.menu.serverControl') || 'Server Control', icon: Activity },
    ],
    [t]
  );

  /**
   * Título de la sección activa, para la topbar del diseño de referencia.
   * Se deriva de los MISMOS destinos traducidos del menú (declarados arriba):
   * no añade datos nuevos y respeta el idioma seleccionado.
   */
  const currentTitle = useMemo(() => {
    const exact = quickDestinations.find((d) => d.to === location.pathname);
    if (exact) return exact.label;
    // Se elige la COINCIDENCIA MÁS LARGA: sin ordenar, '/assignments' ganaba a
    // '/assignments/my-groups' y la topbar rotulaba «Academic Assignments» una
    // pantalla que es en realidad «My Groups».
    const parent = quickDestinations
      .filter((d) => d.to !== '/dashboard' && location.pathname.startsWith(d.to))
      .sort((a, b) => b.to.length - a.to.length)[0];
    return parent?.label || t('dashboard.title') || 'Dashboard';
  }, [quickDestinations, location.pathname, t]);

  const quickResults = useMemo(() => {
    const q = quickQuery.trim().toLowerCase();
    if (!q) return [];
    return quickDestinations.filter((d) => d.label.toLowerCase().includes(q)).slice(0, 7);
  }, [quickQuery, quickDestinations]);

  // Atajo de teclado ⌘K / Ctrl+K para enfocar la búsqueda rápida.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        quickInputRef.current?.focus();
        setQuickOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleQuickSelect = (to) => {
    setQuickOpen(false);
    setQuickQuery('');
    goTo(to);
  };

  /** Enlace de navegación de primer nivel. */
  const NavLink = ({ to, icon: Icon, label, active }) => {
    const isActive = active ?? isSelected(to);
    return (
      <button
        type="button"
        onClick={() => goTo(to)}
        className={cn('nav-item', isActive && 'nav-item-active')}
        title={drawerOpen ? undefined : label}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        {drawerOpen && <span className="truncate">{label}</span>}
        {/* Referencia: punto guía a la derecha del elemento activo */}
        {drawerOpen && isActive && (
          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" aria-hidden="true" />
        )}
      </button>
    );
  };


  return (
    <div className="flex min-h-screen">
      {/* ===================== Barra superior ===================== */}
      <header className="no-print fixed inset-x-0 top-0 z-appbar flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 shadow-xs backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label="Toggle navigation"
          className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-hover hover:text-ink"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        {/* `shrink-0`: sin él, el bloque de título comprimía la marca y el
            nombre «NEW DIRECTION ACADEMY» se leía cortado («…ACA»). */}
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="shrink-0 rounded-md p-0.5"
        >
          <Logo withGlow text="NEW DIRECTION ACADEMY" fontSize="0.95rem" />
        </button>

        {/* Título de la sección + ciclo lectivo (topbar de la referencia) */}
        <div className="ml-1 hidden min-w-0 flex-1 items-center gap-2 sm:flex">
          <p className="truncate font-display text-base font-semibold text-ink">{currentTitle}</p>
          <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
            2026–2027
          </span>
        </div>

        {/* ---------------- Búsqueda rápida (⌘K) ---------------- */}
        <div className="relative ml-2 hidden flex-1 max-w-sm md:block" ref={quickRef}>
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 transition-colors focus-within:border-brand-300 focus-within:bg-surface">
            <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <input
              ref={quickInputRef}
              type="text"
              value={quickQuery}
              onChange={(e) => {
                setQuickQuery(e.target.value);
                setQuickOpen(true);
              }}
              onFocus={() => setQuickOpen(true)}
              placeholder={t('common.quickSearch') || 'Quick search…'}
              aria-label={t('common.quickSearch') || 'Quick search'}
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
            <kbd className="hidden shrink-0 rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-2xs font-medium text-ink-muted lg:block">
              ⌘K
            </kbd>
          </div>

          {quickOpen && quickQuery.trim() && (
            <div className="absolute left-0 right-0 top-full z-modal mt-2 animate-scale-in overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
              {quickResults.length === 0 ? (
                <p className="px-4 py-3 text-sm text-ink-muted">
                  {t('common.noResults') || 'No results'}
                </p>
              ) : (
                quickResults.map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => handleQuickSelect(item.to)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-ink transition-colors hover:bg-hover"
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Periodo académico (informativo) */}
        <span className="hidden text-xs font-medium text-ink-muted lg:block">
          {t('dashboard.academicYearLabel') || 'AY 2026—2027 · Fall'}
        </span>

        {/* Idioma */}
        <div className="relative" ref={langMenuRef}>
          <button
            type="button"
            onClick={() => setLangMenuOpen((v) => !v)}
            title={t('common.language')}
            aria-label={t('common.language')}
            className="focus-ring rounded-lg p-2 text-ink-soft transition-colors hover:bg-hover hover:text-ink"
          >
            <Languages className="h-5 w-5" />
          </button>
          {langMenuOpen && (
            <div className="absolute right-0 mt-2 min-w-[10rem] animate-scale-in overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={cn(
                    'block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-hover',
                    currentLanguage === lang.code && 'bg-brand-500/10 font-semibold text-brand-700'
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <button
          type="button"
          className="focus-ring relative rounded-lg p-2 text-ink-soft transition-colors hover:bg-hover hover:text-ink"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {/* Referencia: indicador rojo de aviso pendiente */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-400" aria-hidden="true" />
        </button>

        {/* Menú de usuario */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            aria-label="User menu"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-hover"
          >
            {/* Referencia: avatar + nombre del usuario a la vista */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {user?.full_name?.charAt(0) || 'U'}
            </span>
            <span className="hidden max-w-[9rem] truncate text-sm font-medium text-ink sm:inline">
              {user?.full_name?.split(' ')[0] || 'Admin'}
            </span>
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 min-w-[13rem] animate-scale-in overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
              <div className="border-b border-line px-4 py-2.5">
                <p className="truncate text-sm font-semibold text-ink">
                  {user?.full_name || t('common.defaultUserName')}
                </p>
                <p className="truncate text-xs text-ink-muted">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => { setUserMenuOpen(false); goTo('/profile'); }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-hover"
              >
                <UserCircle className="h-4 w-4 text-ink-soft" />
                {t('profile.title') || 'My Profile'}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => { setUserMenuOpen(false); goTo('/admin'); }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-hover"
                >
                  <ShieldCheck className="h-4 w-4 text-ink-soft" />
                  {t('admin.console') || 'Super Admin Console'}
                </button>
              )}
              {canViewSystem && (
                <button
                  type="button"
                  onClick={() => { setUserMenuOpen(false); goTo('/server-control'); }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-hover"
                >
                  <Server className="h-4 w-4 text-ink-soft" />
                  {t('serverControl.title') || 'Server Control'}
                </button>
              )}
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/5"
              >
                <LogOut className="h-4 w-4" />
                {t('auth.logout') || 'Logout'}
              </button>
            </div>
          )}
        </div>

        {/* Salir — atajo directo, como en la referencia */}
        <div className="hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
        <button
          type="button"
          onClick={handleLogout}
          className="hidden rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-danger/30 hover:bg-danger/5 hover:text-danger sm:inline-flex"
        >
          {t('auth.logout') || 'Logout'}
        </button>
      </header>

      {/* ===================== Sidebar ===================== */}
      {/* RESPONSIVE: en móvil/tablet el sidebar es un panel SUPERPUESTO, no una
          columna. Sin este fondo, al abrirlo tapaba el contenido sin indicar
          que se trataba de un panel temporal ni ofrecer forma de cerrarlo. */}
      {!isDesktop && drawerOpen && (
        <div
          className="no-print fixed inset-0 top-16 z-[1150] bg-navy-950/50 backdrop-blur-[2px]"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className="no-print fixed bottom-0 left-0 top-16 z-drawer overflow-y-auto overflow-x-hidden bg-sidebar-gradient pb-6 shadow-xl transition-[width,transform] duration-200 ease-smooth lg:shadow-none"
        style={{
          width: drawerOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED,
          // RESPONSIVE: en móvil el sidebar cerrado queda FUERA de pantalla
          // (off-canvas) en lugar de dejar una franja fija que se comería los
          // primeros 76px del contenido. Al abrirlo entra deslizándose como
          // panel superpuesto sobre el fondo oscurecido.
          transform: !isDesktop && !drawerOpen ? 'translateX(-100%)' : 'translateX(0)',
        }}
      >
        {/* Cabecera de marca */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient shadow-brand">
            <span className="font-display text-base font-bold text-white">A</span>
          </div>
          {drawerOpen && (
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold leading-tight tracking-wide text-white">
                ACADEMIX
              </p>
              <p className="truncate font-mono text-2xs text-brand-400">v2.0 · NDA</p>
            </div>
          )}
          {/* FIX (2026-09-19 — móvil): el panel superpuesto no tenía botón de
              cierre, de modo que en pantallas pequeñas parecía «cortado» a
              media pantalla. Escritorio conserva su comportamiento. */}
          {drawerOpen && !isDesktop && (
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Cerrar menú"
              className="focus-ring shrink-0 rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tarjeta de bienvenida */}
        {drawerOpen && (
          <div className="relative mx-3 mb-3 mt-4 overflow-hidden rounded-lg bg-hero-gradient p-4 text-white shadow-brand">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.14) 0%, transparent 50%), radial-gradient(circle at 10% 90%, rgba(167,139,250,0.22) 0%, transparent 45%)',
              }}
              aria-hidden="true"
            />
            <div className="relative flex flex-col gap-1">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-white/75">
                {t('dashboard.welcome') || 'Welcome'}
              </p>
              <p className="truncate text-base font-bold leading-tight">
                {user?.full_name || t('common.defaultUserName')}
              </p>
              {user?.roles && (
                <span className="mt-1 w-fit rounded-md border border-white/20 bg-white/[0.15] px-2 py-0.5 text-[0.65rem] font-semibold">
                  {user.roles[0]}
                </span>
              )}
            </div>
          </div>
        )}

        <nav>
          {/* ---------------- Overview ---------------- */}
          <NavGroupLabel open={drawerOpen}>{t('common.overview') || 'Overview'}</NavGroupLabel>
          <NavLink to="/dashboard" icon={LayoutDashboard} label={t('dashboard.title') || 'Dashboard'} />

          <div className="mx-3 my-2 border-t border-white/[0.08]" />

          {/* ---------------- Academic Management ---------------- */}
          <NavGroupLabel open={drawerOpen}>
            {t('common.academicManagement') || 'Academic Management'}
          </NavGroupLabel>
          <NavLink to="/students" icon={Users} label={t('admin.menu.studentsList')} />
          <NavLink to="/guardians" icon={Users} label={t('admin.menu.guardians')} />
          <NavLink to="/teachers" icon={School} label={t('admin.menu.teachersList')} />
          <NavLink to="/subjects" icon={FileText} label={t('admin.menu.subjects')} />
          <NavLink to="/assignments" icon={ClipboardCheck} label={t('admin.menu.myAssignments')} />

          <div className="mx-3 my-2 border-t border-white/[0.08]" />

          {/* ---------------- Tracking ---------------- */}
          <NavGroupLabel open={drawerOpen}>{t('common.tracking') || 'Tracking'}</NavGroupLabel>
          <NavLink to="/attendance" icon={CalendarCheck} label={t('admin.menu.dailyAttendance')} />
          <NavLink
            to="/attendance/monthly"
            icon={CalendarCheck}
            label={t('admin.menu.monthlyGrid')}
            active={location.pathname.startsWith('/attendance/monthly')}
          />
          <NavLink to="/grades" icon={GraduationCap} label={t('admin.menu.gradebook')} />
          <NavLink to="/grade-change-requests" icon={GraduationCap} label={t('admin.menu.gradeChangeRequests')} />

          <div className="mx-3 my-2 border-t border-white/[0.08]" />

          {/* ---------------- Student Records ---------------- */}
          <NavGroupLabel open={drawerOpen}>
            {t('common.studentRecords') || 'Student Records'}
          </NavGroupLabel>
          <NavLink to="/academic-history" icon={History} label={t('admin.menu.academicHistory')} />
          <NavLink to="/previous-schools" icon={School} label={t('admin.menu.previousSchools')} />
          <NavLink to="/medical-records" icon={HeartPulse} label={t('admin.menu.medicalRecords')} />
          <NavLink to="/documents" icon={FolderOpen} label={t('admin.menu.documents')} />
          <NavLink to="/scholarships" icon={Star} label={t('scholarships.title') || 'Scholarships'} />

          <div className="mx-3 my-2 border-t border-white/[0.08]" />

          {/* ---------------- Reports & Documents ---------------- */}
          <NavGroupLabel open={drawerOpen}>
            {t('common.documentsGroup') || 'Reports & Documents'}
          </NavGroupLabel>
          <NavLink to="/reports" icon={FileText} label={t('admin.menu.allReports')} />
          <NavLink to="/progress-reports" icon={FileText} label={t('admin.menu.progressReports')} />
          <NavLink to="/report-cards" icon={FileText} label={t('admin.menu.reportCards')} />
          <NavLink to="/transcripts" icon={FileText} label={t('admin.menu.officialTranscripts')} />

          <div className="mx-3 my-2 border-t border-white/[0.08]" />

          {/* ---------------- Graduation ---------------- */}
          <NavGroupLabel open={drawerOpen}>{t('graduation.title') || 'Graduation'}</NavGroupLabel>
          <NavLink to="/graduation" icon={Award} label={t('admin.menu.graduationCenter')} />
          <NavLink to="/gransif" icon={Award} label={t('admin.menu.gransif')} />

          <div className="mx-3 my-2 border-t border-white/[0.08]" />

          {/* ---------------- Institution ---------------- */}
          <NavGroupLabel open={drawerOpen}>{t('common.institution') || 'Institution'}</NavGroupLabel>
          <NavLink to="/branches" icon={Building2} label={t('branches.title') || 'Branches'} />
          <NavLink to="/calendar" icon={CalendarDays} label={t('calendar.title') || 'School Calendar'} />

          {/* ---------------- Administration ---------------- */}
          {isAdmin && (
            <>
              <div className="mx-3 my-2 border-t border-white/[0.08]" />
              <NavGroupLabel open={drawerOpen}>
                {t('common.administrationGroup') || 'Administration'}
              </NavGroupLabel>
              <NavLink to="/users" icon={ShieldCheck} label={t('admin.menu.users')} />
              <NavLink to="/roles" icon={ShieldCheck} label={t('admin.menu.roles')} />
              <NavLink to="/permissions" icon={ShieldCheck} label={t('admin.menu.permissions')} />
              <NavLink to="/academic-years" icon={CalendarDays} label={t('admin.menu.academicYears')} />
              <NavLink to="/academic-periods" icon={CalendarDays} label={t('admin.menu.academicPeriods')} />
              <NavLink to="/credits" icon={GraduationCap} label={t('admin.menu.creditsManagement')} />
              <NavLink to="/gpa" icon={GraduationCap} label={t('admin.menu.gpaCalculation')} />
              <NavLink to="/audit" icon={History} label={t('admin.menu.auditLogs')} />
              <NavLink to="/activity" icon={Activity} label={t('admin.menu.activityFeed')} />
              <NavLink to="/settings" icon={Settings} label={t('admin.menu.systemSettings')} />
            </>
          )}

          {/* ---------------- System ---------------- */}
          {canViewSystem && (
            <>
              <div className="mx-3 my-2 border-t border-white/[0.08]" />
              <NavGroupLabel open={drawerOpen}>{t('common.systemGroup') || 'System'}</NavGroupLabel>
              <NavLink
                to="/server-control"
                icon={Activity}
                label={t('admin.menu.serverControl') || 'Server Control'}
              />
            </>
          )}
        </nav>

        {/* Pie: usuario + colapso */}
        <div className="mx-2 mt-4 border-t border-white/[0.08] pt-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.06]',
              !drawerOpen && 'justify-center'
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-semibold text-white">
              {(user?.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            {drawerOpen && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{user?.full_name || 'User'}</p>
                  <p className="truncate text-2xs text-white/40">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title={t('auth.logout') || 'Logout'}
                  aria-label={t('auth.logout') || 'Logout'}
                  className="shrink-0 text-white/40 transition-colors hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium text-sidebar-item/80 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <ChevronLeft className={cn('h-4 w-4 shrink-0 transition-transform', !drawerOpen && 'rotate-180')} />
            {drawerOpen && <span>{t('common.collapse') || 'Collapse'}</span>}
          </button>
        </div>
      </aside>

      {/* ===================== Contenido ===================== */}
      {/* `min-w-0` + `overflow-x-hidden`: sin esto, un hijo ancho (una tabla
          con muchas columnas) empuja el layout y aparece scroll horizontal
          en móvil. */}
      <main
        className="min-h-screen min-w-0 flex-1 overflow-x-hidden bg-canvas p-4 pt-24 transition-[margin] duration-200 ease-smooth sm:p-6 sm:pt-28"
        style={{ marginLeft: isDesktop ? (drawerOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED) : 0 }}
      >
        <Outlet />
      </main>

      <GlobalErrorSnackbar />
    </div>
  );
};

export default MainLayout;
