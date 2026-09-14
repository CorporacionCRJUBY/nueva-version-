// FILE: frontend/src/components/DataTable.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Search,
  Filter,
  MoreVertical,
  RefreshCw,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../ui/cn';

/**
 * Tabla de datos reutilizable del panel administrativo.
 *
 * Migrada por completo a Tailwind CSS (antes usaba Table/Paper/Menu/TextField
 * de MUI). La API pública es IDÉNTICA, por lo que las ~30 páginas que la
 * consumen siguen funcionando sin cambios.
 *
 * Capacidades conservadas:
 *   - búsqueda con callback, filtros por campo, refresco y exportación,
 *   - ordenamiento por columna, selección múltiple (checkbox),
 *   - acciones por fila en menú contextual (con `show(row)` condicional),
 *   - render personalizado de celda (`column.render`) y tipos de dato
 *     (status, date, datetime, currency, percentage),
 *   - paginación, estado de carga (barra indeterminada + skeletons) y estado
 *     vacío, cabecera fija y modo denso, y un `<div>` por fila que respeta
 *     `onRowClick` sin romper la semántica de tabla.
 */

/** Colores del chip según el estado. */
const STATUS_STYLE = {
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  danger: 'bg-danger-light text-danger-dark',
  neutral: 'bg-brand-500/10 text-brand-700',
};
const STATUS_BY_VALUE = {
  ACTIVE: { key: 'active', variant: 'success' },
  INACTIVE: { key: 'inactive', variant: 'neutral' },
  PENDING: { key: 'pending', variant: 'warning' },
  APPROVED: { key: 'approved', variant: 'success' },
  REJECTED: { key: 'rejected', variant: 'danger' },
  LOCKED: { key: 'locked', variant: 'danger' },
  OPEN: { key: 'open', variant: 'success' },
  CLOSED: { key: 'closed', variant: 'neutral' },
  DRAFT: { key: 'draft', variant: 'warning' },
  OFFICIAL: { key: 'official', variant: 'success' },
  ARCHIVED: { key: 'archived', variant: 'neutral' },
};

/** Cierra un desplegable al hacer clic fuera o pulsar Escape. */
function useDismiss(onDismiss, active) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onDismiss();
    };
    const onKey = (e) => e.key === 'Escape' && onDismiss();
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onDismiss, active]);
  return ref;
}

const DataTable = ({
  columns,
  data,
  loading = false,
  total = 0,
  page = 0,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  onPageChange,
  onPageSizeChange,
  onSort,
  onSearch,
  onRefresh,
  onExport,
  onRowClick,
  onRowAction,
  actions = [],
  selectable = false,
  selected = [],
  onSelectChange,
  searchPlaceholder,
  showSearch = true,
  showFilter = true,
  showRefresh = true,
  showExport = true,
  filterFields = [],
  filterValues = {},
  onFilterChange,
  emptyMessage,
  dense = false,
  stickyHeader = false,
  height = 'auto',
  rowActions = [],
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMenuRowId, setActionMenuRowId] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const filterRef = useDismiss(() => setFilterOpen(false), filterOpen);

  // Defensa: si `data` no llega como array (p. ej. la API devuelve un objeto
  // de paginación), evitamos que la tabla explote con ".map is not a function".
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const handleSort = (field) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    const direction = isAsc ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(direction);
    if (onSort) onSort(field, direction);
  };

  const handleSearch = (e) => {
    const { value } = e.target;
    setSearchTerm(value);
    if (onSearch) onSearch(value);
  };

  const handleSelectAll = (e) => {
    if (!onSelectChange) return;
    onSelectChange(e.target.checked ? rows.map((item) => item.id) : []);
  };

  const handleSelectRow = (id) => {
    if (!onSelectChange) return;
    onSelectChange(
      selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]
    );
  };

  /** Contenido de una celda según el tipo declarado en la columna. */
  const renderCell = (column, row) => {
    const value = row[column.field];

    if (column.render) return column.render(value, row);

    if (column.type === 'status') {
      const status = STATUS_BY_VALUE[value];
      const label = status ? t(`status.${status.key}`) : value || '-';
      const variant = status?.variant || 'neutral';
      return (
        <span className={cn('chip', STATUS_STYLE[variant])}>{label}</span>
      );
    }

    if (column.type === 'date' && value) return new Date(value).toLocaleDateString();
    if (column.type === 'datetime' && value) return new Date(value).toLocaleString();

    if (column.type === 'currency' && value) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }

    if (column.type === 'percentage' && value !== undefined && value !== null) return `${value}%`;

    if (value === null || value === undefined) return '-';
    return value;
  };

  const emptyColSpan = columns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0);
  const allSelected = rows.length > 0 && rows.length === selected.length;
  const someSelected = selected.length > 0 && !allSelected;

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  const cellPad = dense ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className="w-full overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      {/* ==================== Barra de herramientas ==================== */}
      {(showSearch || showFilter || showRefresh || showExport || actions.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-card-shine p-4">
          <div className="flex flex-1 items-center gap-2">
            {showSearch && (
              <div className="relative min-w-[12rem] max-w-sm flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder={searchPlaceholder || t('common.search')}
                  aria-label={searchPlaceholder || t('common.search')}
                  className="field rounded-full bg-canvas pl-10"
                />
              </div>
            )}

            {showFilter && filterFields.length > 0 && (
              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setFilterOpen((v) => !v)}
                  aria-label={t('common.filter')}
                  aria-expanded={filterOpen}
                  className={cn(
                    'rounded p-2 transition-colors hover:bg-hover',
                    filterOpen ? 'bg-brand-500/10 text-brand-700' : 'text-ink-soft'
                  )}
                >
                  <Filter className="h-5 w-5" />
                </button>

                {filterOpen && (
                  <div className="absolute left-0 z-modal mt-2 min-w-[14rem] animate-scale-in rounded-lg border border-line bg-surface p-4 shadow-md">
                    {filterFields.map((field) => (
                      <div key={field.name} className="mb-3 last:mb-0">
                        <label htmlFor={`filter-${field.name}`} className="field-label text-xs">
                          {field.label}
                        </label>
                        <select
                          id={`filter-${field.name}`}
                          value={filterValues[field.name] || ''}
                          onChange={(e) => onFilterChange && onFilterChange(field.name, e.target.value)}
                          className="field"
                        >
                          <option value="">{t('common.all')}</option>
                          {field.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {showRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                title={t('common.refresh')}
                aria-label={t('common.refresh')}
                className="rounded p-2 text-ink-soft transition-colors hover:bg-hover disabled:opacity-40"
              >
                <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
              </button>
            )}

            {showExport && (
              <button
                type="button"
                onClick={onExport}
                disabled={loading}
                title={t('common.export')}
                aria-label={t('common.export')}
                className="rounded p-2 text-ink-soft transition-colors hover:bg-hover disabled:opacity-40"
              >
                <Download className="h-5 w-5" />
              </button>
            )}

            {actions.map((action, index) => (
              <button
                key={action.label || index}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled || loading}
                title={action.label}
                aria-label={action.label}
                className={cn(
                  'rounded p-2 transition-colors hover:bg-hover disabled:opacity-40',
                  action.color === 'error' ? 'text-danger' : 'text-brand-600'
                )}
              >
                {action.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================= Tabla ========================= */}
      <div
        className="relative overflow-auto"
        style={height !== 'auto' ? { maxHeight: height } : undefined}
      >
        {loading && (
          <div className="absolute inset-x-0 top-0 z-10 h-1 overflow-hidden bg-brand-500/15">
            <div className="h-full w-2/5 animate-indeterminate rounded-full bg-brand-gradient" />
          </div>
        )}

        <table className="w-full border-collapse text-left">
          <thead className={cn(stickyHeader && 'sticky top-0 z-[1]')}>
            <tr>
              {selectable && (
                <th scope="col" className={cn('table-head-cell w-12', cellPad)}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={handleSelectAll}
                    disabled={loading}
                    aria-label="Select all rows"
                    className="h-4 w-4 cursor-pointer accent-brand-600"
                  />
                </th>
              )}

              {columns.map((column) => (
                <th
                  key={column.field}
                  scope="col"
                  style={{ minWidth: column.minWidth, maxWidth: column.maxWidth }}
                  className={cn('table-head-cell', cellPad, column.align === 'right' && 'text-right', column.align === 'center' && 'text-center')}
                >
                  {column.sortable !== false ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.field)}
                      className="inline-flex items-center gap-1 uppercase transition-colors hover:text-brand-500"
                    >
                      {column.label}
                      {sortField === column.field ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      ) : null}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}

              {rowActions.length > 0 && (
                <th scope="col" className={cn('table-head-cell text-right', cellPad)}>
                  {t('common.actions')}
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={emptyColSpan} className="px-4 py-8 text-center text-sm text-ink-muted">
                  {t('common.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={emptyColSpan} className="px-4 py-12">
                  <div className="empty-state">
                    <Inbox className="h-8 w-8 text-ink-faint" aria-hidden="true" />
                    <p className="text-sm">{emptyMessage || t('common.noData')}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const visibleActions = rowActions.filter((a) => !a.show || a.show(row));
                const menuOpen = actionMenuRowId === row.id;

                return (
                  <tr
                    key={row.id || index}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn('table-row', onRowClick && 'cursor-pointer')}
                  >
                    {selectable && (
                      <td className={cn('table-cell', cellPad)} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.includes(row.id)}
                          onChange={() => handleSelectRow(row.id)}
                          disabled={loading}
                          aria-label={`Select row ${row.id}`}
                          className="h-4 w-4 cursor-pointer accent-brand-600"
                        />
                      </td>
                    )}

                    {columns.map((column) => (
                      <td
                        key={column.field}
                        style={{ maxWidth: column.maxWidth }}
                        className={cn('table-cell', cellPad, column.align === 'right' && 'text-right', column.align === 'center' && 'text-center')}
                      >
                        {renderCell(column, row)}
                      </td>
                    ))}

                    {rowActions.length > 0 && (
                      <td
                        className={cn('table-cell relative text-right', cellPad)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {visibleActions.length === 0 ? null : (
                          <>
                            <button
                              type="button"
                              onClick={() => setActionMenuRowId(menuOpen ? null : row.id)}
                              aria-label={t('common.actions')}
                              aria-haspopup="menu"
                              aria-expanded={menuOpen}
                              className="rounded p-1.5 text-ink-soft transition-colors hover:bg-hover"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {menuOpen && (
                              <RowActionMenu
                                actions={visibleActions}
                                row={row}
                                onClose={() => setActionMenuRowId(null)}
                              />
                            )}
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ====================== Paginación ====================== */}
      {(onPageChange || onPageSizeChange) && (
        <div className="flex flex-wrap items-center justify-end gap-4 border-t border-line px-4 py-2.5">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            {t('common.rowsPerPage')}
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange && onPageSizeChange(parseInt(e.target.value, 10))}
              className="field w-auto py-1 text-sm"
              aria-label={t('common.rowsPerPage')}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <span className="text-sm text-ink-soft">
            {from}-{to} {t('common.of')} {total}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange && onPageChange(page - 1)}
              disabled={page <= 0}
              aria-label="Previous page"
              className="rounded p-1.5 text-ink-soft transition-colors hover:bg-hover disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange && onPageChange(page + 1)}
              disabled={page + 1 >= totalPages}
              aria-label="Next page"
              className="rounded p-1.5 text-ink-soft transition-colors hover:bg-hover disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Menú contextual de acciones de fila (se monta dentro de una celda). */
function RowActionMenu({ actions, row, onClose }) {
  return (
    <div
      role="menu"
      className="absolute right-2 top-full z-modal min-w-[11rem] animate-scale-in overflow-hidden rounded-lg border border-line bg-surface py-1 text-left shadow-md"
    >
      {actions.map((action, index) => (
        <button
          key={action.label || index}
          type="button"
          role="menuitem"
          disabled={action.disabled ? action.disabled(row) : false}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            if (action.onClick) action.onClick(row);
          }}
          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-ink transition-colors hover:bg-hover disabled:opacity-40"
        >
          {action.icon && <span className="flex shrink-0 items-center">{action.icon}</span>}
          {action.label}
        </button>
      ))}
    </div>
  );
}

RowActionMenu.propTypes = {
  actions: PropTypes.array.isRequired,
  row: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      label: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
      type: PropTypes.oneOf([
        'string', 'number', 'date', 'datetime', 'status', 'currency', 'percentage', 'boolean', 'custom',
      ]),
      align: PropTypes.oneOf(['left', 'center', 'right']),
      sortable: PropTypes.bool,
      minWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      maxWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      render: PropTypes.func,
    })
  ).isRequired,
  data: PropTypes.array,
  loading: PropTypes.bool,
  total: PropTypes.number,
  page: PropTypes.number,
  pageSize: PropTypes.number,
  pageSizeOptions: PropTypes.array,
  onPageChange: PropTypes.func,
  onPageSizeChange: PropTypes.func,
  onSort: PropTypes.func,
  onSearch: PropTypes.func,
  onRefresh: PropTypes.func,
  onExport: PropTypes.func,
  onRowClick: PropTypes.func,
  onRowAction: PropTypes.func,
  actions: PropTypes.array,
  selectable: PropTypes.bool,
  selected: PropTypes.array,
  onSelectChange: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  showSearch: PropTypes.bool,
  showFilter: PropTypes.bool,
  showRefresh: PropTypes.bool,
  showExport: PropTypes.bool,
  filterFields: PropTypes.array,
  filterValues: PropTypes.object,
  onFilterChange: PropTypes.func,
  emptyMessage: PropTypes.string,
  dense: PropTypes.bool,
  stickyHeader: PropTypes.bool,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  rowActions: PropTypes.array,
};

export default DataTable;
