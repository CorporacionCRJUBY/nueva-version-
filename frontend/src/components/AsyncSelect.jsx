// FILE: frontend/src/components/AsyncSelect.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';

/**
 * AsyncSelect — selector que busca contra el servidor en vez de cargar el
 * catálogo entero en memoria.
 *
 * FIX (bitácora 2026-09-15, pendiente "pageSize=1000 en los selectores"):
 * los formularios (estudiantes, materias, asignaciones, periodos, sedes...)
 * pedían `pageSize: 1000` para llenar un <Select> nativo. Con los seeds
 * actuales no se nota, pero con un colegio real de miles de estudiantes eso
 * es traer la tabla entera al navegador en cada apertura del formulario —
 * lento, y cada vez más lento con el tiempo.
 *
 * Este componente reemplaza ese patrón: pide como máximo `pageSize` filas
 * (20 por defecto) filtradas por lo que la persona ya escribió, con un
 * debounce para no disparar una petición por cada tecla. El valor
 * seleccionado se resuelve aparte con `api.getById` para que, al editar un
 * registro existente, se vea el nombre aunque esa fila no esté entre las
 * primeras 20 del listado.
 *
 * No sustituye a los `getAll({ pageSize: 1000 })` que arman listas fijas y
 * cortas (roles, permisos): ahí no hay nada que buscar y el catálogo real
 * nunca va a crecer sin control. Está pensado para los catálogos que sí
 * crecen con el uso normal del colegio: estudiantes, materias, docentes,
 * asignaciones, periodos.
 *
 * Props:
 * - api: objeto con getAll({ search, pageSize }) y getById(id)
 * - value: id seleccionado (o null)
 * - onChange(id, option): se llama con el id y la fila completa
 * - getOptionLabel(row): arma el texto visible a partir de una fila
 * - searchParams: filtros fijos adicionales para getAll (p.ej. { branchId })
 * - pageSize: cuántas filas trae cada búsqueda (por defecto 20)
 */
const DEBOUNCE_MS = 300;

function extractRows(response) {
  // `api.get` ya desenvuelve `response.data` de axios, así que aquí
  // `response` es el sobre `{ success, data, total }` del backend.
  const rows = response?.data;
  return Array.isArray(rows) ? rows : [];
}

export default function AsyncSelect({
  api,
  value,
  onChange,
  getOptionLabel,
  label,
  placeholder,
  searchParams = {},
  pageSize = 20,
  required = false,
  disabled = false,
  error = false,
  helperText,
  fullWidth = true,
  size = 'medium',
}) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  // Al montar (o si cambia el id por fuera, p.ej. al cargar un registro
  // existente), se resuelve la fila completa por su id, sin depender de que
  // esté entre las primeras filas de una búsqueda vacía.
  useEffect(() => {
    let cancelled = false;

    if (!value) {
      setSelectedOption(null);
      return undefined;
    }

    if (selectedOption?.id === value) return undefined;

    api
      .getById(value)
      .then((response) => {
        if (cancelled) return;
        const record = response?.data || response;
        setSelectedOption(record);
        setOptions((prev) => (prev.some((o) => o.id === record.id) ? prev : [record, ...prev]));
      })
      .catch(() => {
        // Si el registro ya no existe (borrado, sede distinta...) se deja el
        // campo vacío en vez de romper el formulario.
        if (!cancelled) setSelectedOption(null);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const runSearch = (search) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    api
      .getAll({ ...searchParams, search: search || undefined, pageSize })
      .then((response) => {
        // Descarta la respuesta si el usuario ya volvió a escribir: evita
        // que una búsqueda vieja y lenta pise el resultado de la más nueva.
        if (requestId !== requestIdRef.current) return;
        setOptions(extractRows(response));
      })
      .catch(() => {
        if (requestId === requestIdRef.current) setOptions([]);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  };

  // Primera carga: muestra algo antes de que la persona escriba nada.
  useEffect(() => {
    runSearch('');
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(searchParams)]);

  const handleInputChange = (_event, newInputValue, reason) => {
    setInputValue(newInputValue);
    if (reason !== 'input') return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(newInputValue), DEBOUNCE_MS);
  };

  return (
    <Autocomplete
      fullWidth={fullWidth}
      size={size}
      disabled={disabled}
      options={options}
      value={selectedOption}
      inputValue={inputValue}
      loading={loading}
      filterOptions={(opts) => opts} // el filtrado ya lo hace el servidor
      isOptionEqualToValue={(option, val) => option.id === val.id}
      getOptionLabel={(option) => (option ? getOptionLabel(option) : '')}
      onChange={(_event, newValue) => {
        setSelectedOption(newValue);
        onChange(newValue?.id ?? null, newValue ?? null);
      }}
      onInputChange={handleInputChange}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error}
          helperText={helperText}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps?.input,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.slotProps?.input?.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      noOptionsText={loading ? 'Buscando…' : 'Sin resultados'}
    />
  );
}
