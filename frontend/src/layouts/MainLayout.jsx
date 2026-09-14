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
  ChevronUp,
  ChevronDown,
  FolderOpen,
  HeartPulse,
  ClipboardCheck,
  ChevronLeft,
  Server,
  Activity,
  Search,
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

  const [openSections, setOpenSections] = useState({
    students: true,
    teachers: false,
    attendance: true,
    grades: false,
    reports: false,
    graduation: false,
    admin: false,
  });

  const userMenuRef = useClickOutside(() => setUserMenuOpen(false));
  const langMenuRef = useClickOutside(() => setLangMenuOpen(false));

  const toggleSection = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

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
      { to: '/settings', label: t('settings.title') || 'Settings', icon: Settings },
    ],
    [t]
  );

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
  const NavLink = ({ to, icon: Icon, label, active }) => (
    <button
      type="button"
      onClick={() => goTo(to)}
      className={cn('nav-item', (active ?? isSelected(to)) && 'nav-item-active')}
      title={drawerOpen ? undefined : label}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {drawerOpen && <span className="truncate">{label}</span>}
    </button>
  );

  /** Enlace secundario (dentro de un acordeón). */
  const SubLink = ({ to, label, active }) => (
    <button
      type="button"
      onClick={() => goTo(to)}
      className={cn(
        'mx-2 mb-0.5 flex w-[calc(100%-1rem)] items-center rounded py-2 pl-10 pr-3 text-left text-sm',
        'text-sidebar-item transition-colors duration-200 hover:bg-white/[0.06] hover:text-white',
        (active ?? isSelected(to)) && 'bg-brand-600/25 font-semibold text-white'
      )}
    >
      <span className="truncate">{label}</span>
    </button>
  );

  /** Cabecera de sección desplegable. */
  const SectionHeader = ({ section, icon: Icon, label }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="nav-item"
      title={drawerOpen ? undefined : label}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {drawerOpen && (
        <>
          <span className="flex-1 truncate text-left">{label}</span>
          {openSections[section] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </>
      )}
    </button>
  );

  const sectionVisible = (key) => drawerOpen && openSections[key];

  return (
    <div className="flex min-h-screen">
      {/* ===================== Barra superior ===================== */}
      <header className="no-print fixed inset-x-0 top-0 z-appbar flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label="Toggle navigation"
          className="rounded p-2 text-ink-soft transition-colors hover:bg-hover hover:text-ink"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <button type="button" onClick={() => navigate('/dashboard')} className="rounded p-0.5">
          <Logo withGlow text="NEW DIRECTION ACADEMY" fontSize="0.95rem" />
        </button>

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
            <kbd className="hidden shrink-0 rounded bg-surface-3 px-1.5 py-0.5 font-mono text-2xs font-medium text-ink-muted lg:block">
              ⌘K
            </kbd>
          </div>

          {quickOpen && quickQuery.trim() && (
            <div className="absolute left-0 right-0 top-full z-modal mt-2 animate-scale-in overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg">
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
            className="rounded p-2 text-ink-soft transition-colors hover:bg-hover hover:text-ink"
          >
            <Languages className="h-5 w-5" />
          </button>
          {langMenuOpen && (
            <div className="absolute right-0 mt-2 min-w-[10rem] animate-scale-in overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg">
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
          className="relative rounded p-2 text-ink-soft transition-colors hover:bg-hover hover:text-ink"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* Menú de usuario */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            aria-label="User menu"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white ring-2 ring-white"
          >
            {user?.full_name?.charAt(0) || 'U'}
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 min-w-[13rem] animate-scale-in overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg">
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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 shadow-brand">
            <span className="font-display text-sm font-bold text-white">A</span>
          </div>
          {drawerOpen && (
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold leading-tight tracking-wide text-white">
                ACADEMIX
              </p>
              <p className="truncate font-mono text-2xs text-brand-400">v2.0 · NDA</p>
            </div>
          )}
        </div>

        {/* Tarjeta de bienvenida */}
        {drawerOpen && (
          <div className="relative mx-3 mb-3 mt-4 overflow-hidden rounded-lg bg-hero-gradient p-4 text-white shadow-brand">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.14) 0%, transparent 50%), radial-gradient(circle at 10% 90%, rgba(173,147,251,0.22) 0%, transparent 45%)',
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
                <span className="mt-1 w-fit rounded border border-white/20 bg-white/[0.15] px-2 py-0.5 text-[0.65rem] font-semibold">
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

          <SectionHeader section="students" icon={Users} label={t('students.title') || 'Students'} />
          {sectionVisible('students') && (
            <div className="animate-fade-in">
              <SubLink to="/students" label={t('admin.menu.studentsList')} />
              <SubLink to="/guardians" label={t('admin.menu.guardians')} />
              <SubLink to="/documents" label={t('admin.menu.documents')} />
              <SubLink to="/medical-records" label={t('admin.menu.medicalRecords')} />
              <SubLink to="/academic-history" label={t('admin.menu.academicHistory')} />
              <SubLink to="/previous-schools" label={t('admin.menu.previousSchools')} />
            </div>
          )}

          <SectionHeader section="teachers" icon={School} label={t('teachers.title') || 'Teachers'} />
          {sectionVisible('teachers') && (
            <div className="animate-fade-in">
              <SubLink to="/teachers" label={t('admin.menu.teachersList')} />
              <SubLink to="/assignments" label={t('admin.menu.myAssignments')} />
              <SubLink to="/subjects" label={t('admin.menu.subjects')} />
            </div>
          )}

          {/* ---------------- Tracking ---------------- */}
          <NavGroupLabel open={drawerOpen}>{t('common.tracking') || 'Tracking'}</NavGroupLabel>

          <SectionHeader section="attendance" icon={CalendarCheck} label={t('attendance.title') || 'Attendance'} />
          {sectionVisible('attendance') && (
            <div className="animate-fade-in">
              <SubLink to="/attendance" label={t('admin.menu.dailyAttendance')} />
              <SubLink
                to="/attendance/monthly"
                label={t('admin.menu.monthlyGrid')}
                active={location.pathname.startsWith('/attendance/monthly')}
              />
            </div>
          )}

          <SectionHeader section="grades" icon={GraduationCap} label={t('grades.title') || 'Grades'} />
          {sectionVisible('grades') && (
            <div className="animate-fade-in">
              <SubLink to="/grades" label={t('admin.menu.gradebook')} />
              <SubLink to="/academic-periods" label={t('admin.menu.academicPeriods')} />
              <SubLink to="/grade-change-requests" label={t('admin.menu.gradeChangeRequests')} />
              <SubLink to="/credits" label={t('admin.menu.creditsManagement')} />
              <SubLink to="/gpa" label={t('admin.menu.gpaCalculation')} />
            </div>
          )}

          <NavLink to="/scholarships" icon={Star} label={t('scholarships.title') || 'Scholarships'} />

          {/* ---------------- Documents ---------------- */}
          <NavGroupLabel open={drawerOpen}>{t('common.documentsGroup') || 'Documents'}</NavGroupLabel>

          <SectionHeader section="reports" icon={FileText} label={t('admin.menu.reportCenter')} />
          {sectionVisible('reports') && (
            <div className="animate-fade-in">
              <SubLink to="/reports" label={t('admin.menu.allReports')} />
              <SubLink to="/progress-reports" label={t('admin.menu.progressReports')} />
              <SubLink to="/report-cards" label={t('admin.menu.reportCards')} />
              <SubLink to="/transcripts" label={t('admin.menu.officialTranscripts')} />
            </div>
          )}

          <SectionHeader section="graduation" icon={Award} label={t('graduation.title') || 'Graduation'} />
          {sectionVisible('graduation') && (
            <div className="animate-fade-in">
              <SubLink to="/graduation" label={t('admin.menu.graduationCenter')} />
              <SubLink to="/gransif" label={t('admin.menu.gransif')} />
            </div>
          )}

          <NavLink to="/branches" icon={Building2} label={t('branches.title') || 'Branches'} />
          <NavLink to="/calendar" icon={CalendarDays} label={t('calendar.title') || 'School Calendar'} />

          {/* ---------------- Administration ---------------- */}
          {isAdmin && (
            <>
              <div className="mx-3 my-2 border-t border-white/[0.08]" />
              <NavGroupLabel open={drawerOpen}>
                {t('common.administrationGroup') || 'Administration'}
              </NavGroupLabel>

              <SectionHeader section="admin" icon={ShieldCheck} label={t('admin.menu.administration')} />
              {sectionVisible('admin') && (
                <div className="animate-fade-in">
                  <SubLink to="/users" label={t('admin.menu.users')} />
                  <SubLink to="/roles" label={t('admin.menu.roles')} />
                  <SubLink to="/permissions" label={t('admin.menu.permissions')} />
                  <SubLink to="/academic-years" label={t('admin.menu.academicYears')} />
                  <SubLink to="/audit" label={t('admin.menu.auditLogs')} />
                  <SubLink to="/activity" label={t('admin.menu.activityFeed')} />
                  <SubLink to="/settings" label={t('admin.menu.systemSettings')} />
                </div>
              )}
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
              'flex items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-white/5',
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
            className="mt-1 flex w-full items-center gap-3 rounded px-2.5 py-2 text-xs font-medium text-sidebar-item/80 transition-colors hover:bg-white/[0.06] hover:text-white"
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
