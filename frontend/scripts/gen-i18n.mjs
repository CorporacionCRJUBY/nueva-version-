// Generador de traducciones faltantes (es/en) a partir de las claves t() que
// usan los componentes. Solo crea archivos para módulos que NO tienen
// traducción todavía — los existentes (common, students, etc.) se respetan.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const srcDir = path.join(root, 'src');
const i18nDir = path.join(root, 'src/i18n');

// 1. Recoger claves t('modulo.clave') del código
const usedKeys = new Map(); // modulo -> Set de claves completas
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(path.join(dir, entry.name));
    else if (/\.(jsx|js)$/.test(entry.name)) {
      const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
      const re = /t\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
      let m;
      while ((m = re.exec(content)) !== null) {
        const key = m[1];
        const mod = key.split('.')[0];
        if (!usedKeys.has(mod)) usedKeys.set(mod, new Set());
        usedKeys.get(mod).add(key);
      }
    }
  }
}
walk(srcDir);

// 2. Módulos que ya tienen traducción
const existingEs = new Set(fs.readdirSync(path.join(i18nDir, 'es')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')));

// 3. Nombres de módulo legibles (EN) y en español
const moduleNames = {
  academicHistory: ['Academic History', 'Historial Académico'],
  academicPeriods: ['Academic Periods', 'Períodos Académicos'],
  academicYears: ['Academic Years', 'Años Académicos'],
  activity: ['Activity', 'Actividad'],
  admin: ['Admin Console', 'Consola de Administración'],
  assignments: ['Assignments', 'Asignaciones'],
  attendance: ['Attendance', 'Asistencia'],
  audit: ['Audit', 'Auditoría'],
  auth: ['Authentication', 'Autenticación'],
  branches: ['Branches', 'Sedes'],
  calendar: ['Calendar', 'Calendario'],
  credits: ['Credits', 'Créditos'],
  dashboard: ['Dashboard', 'Panel Principal'],
  documents: ['Documents', 'Documentos'],
  forbidden: ['Forbidden', 'Acceso Denegado'],
  gpa: ['GPA', 'GPA'],
  gradeChangeRequests: ['Grade Change Requests', 'Solicitudes de Cambio de Nota'],
  grades: ['Grades', 'Calificaciones'],
  graduation: ['Graduation', 'Graduación'],
  gransif: ['GRANSIF', 'GRANSIF'],
  guardians: ['Guardians', 'Tutores'],
  medicalRecords: ['Medical Records', 'Expedientes Médicos'],
  notFound: ['Not Found', 'No Encontrado'],
  permissions: ['Permissions', 'Permisos'],
  previousSchools: ['Previous Schools', 'Escuelas Anteriores'],
  profile: ['Profile', 'Perfil'],
  progressReports: ['Progress Reports', 'Informes de Progreso'],
  reportCards: ['Report Cards', 'Boletas'],
  reports: ['Reports', 'Reportes'],
  roles: ['Roles', 'Roles'],
  scholarships: ['Scholarships', 'Becas'],
  settings: ['Settings', 'Configuración'],
  status: ['Status', 'Estado'],
  subjects: ['Subjects', 'Materias'],
  teachers: ['Teachers', 'Profesores'],
  transcripts: ['Transcripts', 'Expedientes Académicos'],
  users: ['Users', 'Usuarios'],
  common: ['Common', 'Común'],
};

// 4. Diccionario de componentes palabra -> español (los más usados)
const esWords = {
  add: 'Agregar', edit: 'Editar', delete: 'Eliminar', view: 'Ver', save: 'Guardar', cancel: 'Cancelar',
  search: 'Buscar', filter: 'Filtrar', refresh: 'Actualizar', export: 'Exportar', upload: 'Subir',
  download: 'Descargar', copy: 'Copiar', print: 'Imprimir', generate: 'Generar', preview: 'Vista Previa',
  reprint: 'Reimprimir', approve: 'Aprobar', reject: 'Rechazar', validate: 'Validar', activate: 'Activar',
  close: 'Cerrar', lock: 'Bloquear', unlock: 'Desbloquear', recalculate: 'Recalcular', assign: 'Asignar',
  change: 'Cambiar', status: 'Estado', title: 'Título', name: 'Nombre', code: 'Código', date: 'Fecha',
  year: 'Año', month: 'Mes', description: 'Descripción', notes: 'Notas', reason: 'Motivo',
  observation: 'Observación', email: 'Correo Electrónico', phone: 'Teléfono', address: 'Dirección',
  select: 'Seleccionar', file: 'Archivo', size: 'Tamaño', format: 'Formato', formats: 'Formatos',
  uploadDate: 'Fecha de Subida', uploading: 'Subiendo...', consent: 'Consentimiento', certificate: 'Certificado',
  deadline: 'Fecha Límite', day: 'Día', is: 'Es', has: 'Tiene', number: 'Número', insurance: 'Seguro',
  last: 'Último', checkup: 'Chequeo', health: 'Salud', emergency: 'Emergencia', contact: 'Contacto',
  available: 'Disponibles', own: 'Propios', assigned: 'Asignados', list: 'Lista', create: 'Crear',
  cumulative: 'Acumulado', calculated: 'Calculado', letter: 'Letra', requirements: 'Requisitos',
  met: 'Cumplidos', validation: 'Validación', zone: 'Zona', use: 'Usar', max: 'Máximo', min: 'Mínimo',
  graduate: 'Graduar', received: 'Recibido', transcript: 'Expediente', placeholder: 'Indicación',
  firstName: 'Nombre', lastName: 'Apellido', middleName: 'Segundo Nombre', secondLastName: 'Segundo Apellido',
  fullName: 'Nombre Completo', identification: 'Identificación', identificationType: 'Tipo de Identificación',
  identificationNumber: 'Número de Identificación', gender: 'Género', male: 'Masculino', female: 'Femenino',
  other: 'Otro', grade: 'Grado', section: 'Sección', branch: 'Sede', academicYear: 'Año Académico',
  academicPeriod: 'Período Académico', period: 'Período', enrollmentDate: 'Fecha de Inscripción',
  graduationYear: 'Año de Graduación', student: 'Estudiante', teacher: 'Profesor', subject: 'Materia',
  guardian: 'Tutor', user: 'Usuario', role: 'Rol', permission: 'Permiso', module: 'Módulo', action: 'Acción',
  type: 'Tipo', category: 'Categoría', amount: 'Monto', percentage: 'Porcentaje', value: 'Valor',
  credits: 'Créditos', credit: 'Crédito', gpa: 'GPA', gradeValue: 'Nota', gradeLetter: 'Letra',
  attendance: 'Asistencia', present: 'Presente', absent: 'Ausente', tardy: 'Tardanza', excuse: 'Justificado',
  record: 'Registro', records: 'Registros', history: 'Historial', details: 'Detalles', general: 'General',
  generalInfo: 'Información General', personalInfo: 'Información Personal', contactInfo: 'Información de Contacto',
  academicInfo: 'Información Académica', additionalInfo: 'Información Adicional', noData: 'Sin datos',
  notFound: 'No Encontrado', back: 'Volver', backToList: 'Volver a la lista', confirm: 'Confirmar',
  continue: 'Continuar', cancelEdit: 'Cancelar Edición', invalid: 'Inválido', required: 'Requerido',
  password: 'Contraseña', currentPassword: 'Contraseña Actual', newPassword: 'Nueva Contraseña',
  confirmPassword: 'Confirmar Contraseña', changePassword: 'Cambiar Contraseña', passwordMismatch: 'Las contraseñas no coinciden',
  saveSuccess: 'Guardado exitosamente', deleteSuccess: 'Eliminado exitosamente', success: 'Éxito',
  error: 'Error', warning: 'Advertencia', info: 'Información', loading: 'Cargando...',
  active: 'Activo', inactive: 'Inactivo', pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado',
  locked: 'Bloqueado', open: 'Abierto', closed: 'Cerrado', draft: 'Borrador', official: 'Oficial',
  archived: 'Archivado', reprinted: 'Reimpreso', published: 'Publicado', unlocked: 'Desbloqueado',
  suspended: 'Suspendido', graduated: 'Graduado', withdrawn: 'Retirado', transferred: 'Transferido',
  completed: 'Completado', validated: 'Validado', activated: 'Activado', activeToday: 'Activo hoy',
  total: 'Total', subtotal: 'Subtotal', quantity: 'Cantidad', price: 'Precio', fee: 'Cuota',
  scholarship: 'Beca', scholarshipType: 'Tipo de Beca', startDate: 'Fecha de Inicio', endDate: 'Fecha de Fin',
  dateOfBirth: 'Fecha de Nacimiento', photo: 'Foto', uploadPhoto: 'Subir Foto', language: 'Idioma',
  actions: 'Acciones', createdAt: 'Creado el', updatedAt: 'Actualizado el', createdBy: 'Creado por',
  updatedBy: 'Actualizado por', deletedAt: 'Eliminado el', default: 'Predeterminado', empty: 'Vacío',
  all: 'Todos', none: 'Ninguno', yes: 'Sí', no: 'No', of: 'de', page: 'Página', rowsPerPage: 'Filas por página',
  searchPlaceholder: 'Buscar...', confirmDelete: '¿Confirmar eliminación?', confirmDeleteRecord: '¿Eliminar este registro?',
  confirmDeleteUser: '¿Eliminar este usuario?', confirmDeleteStudent: '¿Eliminar este estudiante?',
  confirmDeleteTeacher: '¿Eliminar este profesor?', confirmDeleteGuardian: '¿Eliminar este tutor?',
  confirmDeleteDocument: '¿Eliminar este documento?', confirmDeleteCredit: '¿Eliminar este crédito?',
  confirmDeleteScholarship: '¿Eliminar esta beca?', confirmDeleteGpa: '¿Eliminar este registro de GPA?',
  confirmDeleteSubject: '¿Eliminar esta materia?', confirmDeleteBranch: '¿Eliminar esta sede?',
  confirmDeleteRole: '¿Eliminar este rol?', confirmDeletePermission: '¿Eliminar este permiso?',
  lockedNotice: 'Este registro está bloqueado', lockedHint: 'Registro bloqueado — no se puede editar',
  lockedInfo: 'Bloqueado: no se puede modificar', welcome: 'Bienvenido', subtitle: 'Subtítulo',
  recentActivity: 'Actividad Reciente', todayAttendance: 'Asistencia de Hoy', brand: 'Marca',
  highlightReports: 'Reportes', highlightManagement: 'Gestión', highlightSecurity: 'Seguridad',
  heading: 'Encabezado', rights: 'Derechos', goHome: 'Ir al Inicio', memberSince: 'Miembro desde',
  security: 'Seguridad', invalidCode: 'Código inválido', invalidPassword: 'Contraseña inválida',
  twoFactor: 'Doble Factor', enable2FA: 'Activar 2FA', disable2FA: 'Desactivar 2FA',
  saveAndContinue: 'Guardar y Continuar', schoolName: 'Nombre de la Escuela', schoolAddress: 'Dirección de la Escuela',
  schoolPhone: 'Teléfono de la Escuela', schoolEmail: 'Correo de la Escuela', schoolInfo: 'Información de la Escuela',
  location: 'Ubicación', yearsAttended: 'Años Cursados', creditsTransferred: 'Créditos Transferidos',
  previousSchools: 'Escuelas Anteriores', cumulativeGpa: 'GPA Acumulado', creditsEarned: 'Créditos Obtenidos',
  attendanceRate: 'Porcentaje de Asistencia', generateReportCard: 'Generar Boleta',
  generateProgressReport: 'Generar Informe de Progreso', generateTranscript: 'Generar Expediente',
  overview: 'Resumen', academic: 'Académico', medical: 'Médico', documents: 'Documentos',
  guardians: 'Tutores', scholarships: 'Becas', grades: 'Calificaciones', fullRecord: 'Expediente Completo',
  uploads: 'Subidas', uploadedAt: 'Subido el', uploadedBy: 'Subido por', file: 'Archivo', fileName: 'Nombre de Archivo',
  fileSize: 'Tamaño', fileType: 'Tipo de Archivo', mimeType: 'Tipo MIME', downloadFile: 'Descargar Archivo',
  documentType: 'Tipo de Documento', condition: 'Condición', diagnosis: 'Diagnóstico', treatment: 'Tratamiento',
  notesPrivate: 'Notas Privadas', bloodType: 'Tipo de Sangre', allergies: 'Alergias', medications: 'Medicamentos',
  relationship: 'Parentesco', occupation: 'Ocupación', emergency: 'Emergencia', isPrimary: 'Es Primario',
  isAuthorized: 'Autorizado', schedule: 'Horario', startTime: 'Hora de Inicio', endTime: 'Hora de Fin',
  dayOfWeek: 'Día de la Semana', monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
  friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo', eventType: 'Tipo de Evento', event: 'Evento',
  holiday: 'Feriado', exam: 'Examen', meeting: 'Reunión', eventDate: 'Fecha del Evento', descriptionShort: 'Descripción',
  semester: 'Semestre', trimester: 'Trimestre', quarter: 'Trimestre', isActive: 'Activo', isOpen: 'Abierto',
  current: 'Actual', requested: 'Solicitado', requestedGrade: 'Nota Solicitada', currentGrade: 'Nota Actual',
  newGrade: 'Nota Nueva', gradeChange: 'Cambio de Nota', request: 'Solicitud', submittedAt: 'Enviado el',
  processedAt: 'Procesado el', processedBy: 'Procesado por', graduationDate: 'Fecha de Graduación',
  diploma: 'Diploma', honors: 'Honores', honorRoll: 'Cuadro de Honor', gransifNumber: 'Número GRANSIF',
  gransifStatus: 'Estado GRANSIF', applicationDate: 'Fecha de Solicitud', approvedDate: 'Fecha de Aprobación',
  beneficiary: 'Beneficiario', program: 'Programa', school: 'Escuela', institution: 'Institución',
  transcripts: 'Expedientes', transcriptType: 'Tipo de Expediente', reprintReason: 'Motivo de Reimpresión',
  reportDate: 'Fecha del Reporte', version: 'Versión', versionNumber: 'Número de Versión',
  generatedBy: 'Generado por', generatedAt: 'Generado el', draftVersion: 'Borrador', archivedVersion: 'Archivado',
  // admin console
  menu: 'Menú', studentsList: 'Lista de Estudiantes', guardiansList: 'Lista de Tutores',
  documentsList: 'Lista de Documentos', medicalRecordsList: 'Lista de Expedientes Médicos',
  academicHistoryList: 'Lista de Historial Académico', attendanceList: 'Lista de Asistencia',
  gradesList: 'Lista de Calificaciones', reportsList: 'Lista de Reportes', settingsList: 'Configuración',
  userManagement: 'Gestión de Usuarios', roleManagement: 'Gestión de Roles',
  permissionManagement: 'Gestión de Permisos', branchManagement: 'Gestión de Sedes',
  auditLog: 'Registro de Auditoría', activityLog: 'Registro de Actividad', systemHealth: 'Salud del Sistema',
  console: 'Consola', database: 'Base de Datos', backup: 'Respaldo', restore: 'Restaurar',
  logs: 'Registros', serverStatus: 'Estado del Servidor', environment: 'Entorno', version: 'Versión',
  // auth
  login: 'Iniciar Sesión', logout: 'Cerrar Sesión', username: 'Usuario', signIn: 'Iniciar Sesión',
  forgotPassword: '¿Olvidó su contraseña?', rememberMe: 'Recordarme', emailOrUsername: 'Correo o Usuario',
  twoFactor: 'Verificación en Dos Pasos', verify: 'Verificar', label: 'Etiqueta', helper: 'Ayuda',
  subtitle: 'Subtítulo', loginError: 'Error al iniciar sesión', loginSubtitle: 'Inicia sesión para continuar',
  backToLogin: 'Volver al inicio de sesión', brand: 'Marca', heading: 'Encabezado', rights: 'Derechos',
  description: 'Descripción', welcome: 'Bienvenido',
  // teachers / empleo
  employmentInfo: 'Información Laboral', hireDate: 'Fecha de Contratación', specialization: 'Especialidad',
  assignments: 'Asignaciones', noAssignments: 'Sin asignaciones', schedule: 'Horario',
  // misc
  submit: 'Enviar', submitted: 'Enviado', processed: 'Procesado', process: 'Procesar',
  report: 'Reporte', reports: 'Reportes', reportCard: 'Boleta', transcript: 'Transcript',
  official: 'Oficial', unofficial: 'No Oficial', draft: 'Borrador', archived: 'Archivado',
  activate: 'Activar', activated: 'Activado', deactivate: 'Desactivar', deactivated: 'Desactivado',
  scholarship: 'Beca', scholarshipType: 'Tipo de Beca', monthly: 'Mensual', annual: 'Anual',
  coverage: 'Cobertura', beneficiaries: 'Beneficiarios', beneficiary: 'Beneficiario',
  awarded: 'Otorgada', active: 'Activo', cancelled: 'Cancelada', canceled: 'Cancelada',
  gransif: 'GRANSIF', granted: 'Otorgado', notGranted: 'No Otorgado',
  requested: 'Solicitado', current: 'Actual', gradeValue: 'Nota', gradeLetter: 'Letra',
  approvedBy: 'Aprobado por', rejectedBy: 'Rechazado por', requestedBy: 'Solicitado por',
  requestDate: 'Fecha de Solicitud', approvalDate: 'Fecha de Aprobación', rejectReason: 'Motivo de Rechazo',
};

// Frases completas que no se pueden traducir palabra por palabra
// (orden distinto en español, acrónimos, contexto de UI).
const esPhrases = {
  'academicHistory.letter': 'Letra',
  'calendar.deadline': 'Fecha Límite',
  'calendar.isHoliday': 'Es Feriado',
  'calendar.isWorkingDay': 'Es Día Laborable',
  'documents.certificate': 'Certificado',
  'documents.consent': 'Consentimiento',
  'documents.fileFormats': 'Formatos de Archivo',
  'documents.selectFile': 'Seleccionar Archivo',
  'documents.size': 'Tamaño',
  'documents.transcript': 'Expediente Académico',
  'documents.uploadDate': 'Fecha de Subida',
  'documents.uploading': 'Subiendo...',
  'gpa.calculated': 'Calculado',
  'gpa.cumulative': 'Acumulado',
  'graduation.certificate': 'Certificado',
  'graduation.requirementsMet': 'Requisitos Cumplidos',
  'graduation.validationNotes': 'Notas de Validación',
  'medicalRecords.allergiesPlaceholder': 'Ej.: maní, penicilina',
  'medicalRecords.conditionPlaceholder': 'Describe la condición médica',
  'medicalRecords.emergencyContact': 'Contacto de Emergencia',
  'medicalRecords.emergencyPhone': 'Teléfono de Emergencia',
  'medicalRecords.hasAllergy': '¿Tiene Alergias?',
  'medicalRecords.healthInsurance': 'Seguro de Salud',
  'medicalRecords.insuranceNumber': 'Número de Seguro',
  'medicalRecords.lastCheckup': 'Último Chequeo',
  'medicalRecords.medicationsPlaceholder': 'Ej.: ibuprofeno 400 mg',
  'permissions.create': 'Crear',
  'previousSchools.transcript': 'Expediente',
  'previousSchools.transcriptReceived': 'Expediente Recibido',
  'roles.availablePermissions': 'Permisos Disponibles',
  'roles.permissions': 'Permisos',
  'settings.globalSettingsHint': 'Configuración general del sistema',
  'settings.maxUploadSizeMb': 'Tamaño Máximo de Subida (MB)',
  'settings.minGpaToGraduate': 'GPA Mínimo para Graduar',
  'settings.timeFormat': 'Formato de Hora',
  'settings.timeZone': 'Zona Horaria',
  'settings.useListPage': 'Usar Página de Lista',
  'users.availableRoles': 'Roles Disponibles',
  'users.cannotEditOwnRoles': 'No Puede Editar Sus Propios Roles',
  'users.noRolesAssigned': 'Sin Roles Asignados',
};

// 5. Dividir camelCase en palabras
const splitCamel = (s) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean);

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const ACRONYMS = new Set(['gpa', 'id', '2fa', 'mb', 'gransif', 'pdf', 'otp', 'api', 'url', 'ip']);

function fmtWord(w) {
  const lower = w.toLowerCase();
  return ACRONYMS.has(lower) ? lower.toUpperCase() : capitalize(w);
}

function enFromKey(leaf, modName) {
  if (leaf === 'title') return modName;
  const words = splitCamel(leaf);
  if (words.length === 0) return leaf;
  return words.map(fmtWord).join(' ');
}

function esFromKey(leaf, modName, fullKey) {
  if (leaf === 'title') return modName;
  if (fullKey && esPhrases[fullKey]) return esPhrases[fullKey];
  // Claves compuestas conocidas (más largas primero)
  const full = esWords[leaf];
  if (full) return full;
  const words = splitCamel(leaf);
  const translated = words.map((w) => {
    const key = w.charAt(0).toLowerCase() + w.slice(1);
    return esWords[key] || null;
  });
  if (translated.every(Boolean)) {
    return translated.map(capitalize).join(' ');
  }
  // Fallback: si al menos la mitad traduce, mezclar; si no, dejar el inglés legible
  const translatedCount = translated.filter(Boolean).length;
  if (translatedCount >= Math.ceil(words.length / 2)) {
    return translated.map((t, i) => (t ? capitalize(t) : capitalize(words[i]))).join(' ');
  }
  return null; // sin traducción razonable -> el generador usa inglés
}

// 6. Generar archivos
let created = 0;
for (const [mod, keySet] of usedKeys) {
  if (existingEs.has(mod)) continue; // respetar traducciones existentes
  if (!moduleNames[mod]) continue; // módulos sin nombre conocido (falsos positivos)
  const [enName, esName] = moduleNames[mod];
  const en = { [mod]: {} };
  const es = { [mod]: {} };

  // Mantener orden: agrupar por prefijo para claves anidadas (modulo.seccion.clave)
  const keys = [...keySet].sort();
  const setNested = (obj, segments, value) => {
    let cur = obj;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (typeof cur[seg] !== 'object' || cur[seg] === null) cur[seg] = {};
      cur = cur[seg];
    }
    cur[segments[segments.length - 1]] = value;
  };
  for (const key of keys) {
    if (!key.includes('.')) continue;
    const segments = key.split('.').slice(1); // quitar el nombre del módulo
    const enValue = segments.map((s) => enFromKey(s, enName)).join(' ');
    const esValue = segments.map((s) => esFromKey(s, esName, key) || enFromKey(s, enName)).join(' ');
    // Objetos ANIDADOS de verdad (i18next recorre la jerarquía con '.');
    // claves planas con punto no se resuelven por defecto.
    setNested(en[mod], segments, enValue);
    setNested(es[mod], segments, esValue);
  }

  fs.writeFileSync(path.join(i18nDir, 'en', `${mod}.json`), JSON.stringify(en, null, 2) + '\n');
  fs.writeFileSync(path.join(i18nDir, 'es', `${mod}.json`), JSON.stringify(es, null, 2) + '\n');
  created++;
  console.log(`creado ${mod}.json (${keys.length} claves)`);
}

console.log(`\n${created} archivos creados por idioma (es/en)`);