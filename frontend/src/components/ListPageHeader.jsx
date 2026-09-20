// FILE: frontend/src/components/ListPageHeader.jsx
import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Plus as AddIcon, Zap as QuickIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PermissionGate from './PermissionGate';
import QuickCreateDrawer from './QuickCreateDrawer';
import { sx } from '../ui/sx';

/**
 * ListPageHeader — encabezado unico de las paginas de listado.
 *
 * PROBLEMA QUE RESUELVE (usabilidad para funcionarios):
 *   Dar de alta cualquier registro obligaba a recorrer
 *   lista -> boton "Nuevo" -> pagina completa de formulario -> guardar ->
 *   volver a la lista. Eso es una navegacion y una perdida de contexto
 *   (filtros, busqueda, pagina) por cada alta, y en secretaria se hacen
 *   decenas al dia.
 *
 * SOLUCION:
 *   El encabezado ofrece, ademas del alta completa (para los casos con
 *   muchos campos), un boton "Alta rapida" que abre el formulario minimo en
 *   un panel lateral SOBRE la misma lista: al guardar, la lista se refresca
 *   en sitio y el funcionario sigue donde estaba.
 *
 * Es deliberadamente GENERICO: recibe la definicion de campos y la funcion
 * de envio, de modo que cada modulo obtiene el mismo flujo sin duplicar
 * logica ni tocar su tabla.
 *
 * Props:
 *   title          — titulo de la pagina.
 *   permission     — permiso de creacion (si falta, solo se pinta el titulo).
 *   quickCreate    — { fields, onSubmit, title, subtitle, submitLabel,
 *                      cancelLabel, enabled }. Si falta, no se pinta el boton.
 *   createPath     — ruta del formulario completo (boton "Nuevo").
 *   navigate       — funcion de navegacion (useNavigate del modulo).
 *   onSaved        — callback tras un alta rapida correcta (recargar lista).
 */
const ListPageHeader = ({
  title,
  permission,
  quickCreate,
  createPath,
  navigate,
  onSaved,
}) => {
  const [quickOpen, setQuickOpen] = useState(false);
  const t = (key, fallback) => fallback;

  const quickEnabled = Boolean(quickCreate && quickCreate.fields && quickCreate.onSubmit);

  const handleSubmit = async (payload) => {
    await quickCreate.onSubmit(payload);
    if (onSaved) onSaved();
  };

  return (
    <>
      <Box
        style={sx({
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        })}
      >
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>
          {title}
        </Typography>

        <PermissionGate permission={permission}>
          <div className="flex items-center gap-2">
            {quickEnabled && (
              <Button
                variant="outlined"
                startIcon={<QuickIcon />}
                onClick={async () => {
                  // Algunos modulos necesitan catalogos (anos academicos,
                  // estudiantes) para poblar un select: se cargan al abrir
                  // el panel, no al montar la lista, para no penalizar la
                  // carga inicial de la pagina.
                  if (quickCreate.onOpen) await quickCreate.onOpen();
                  setQuickOpen(true);
                }}
              >
                {quickCreate.quickLabel || t('common.quickAdd', 'Alta rapida')}
              </Button>
            )}
            {createPath && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate(createPath)}
              >
                {quickCreate?.createLabel || t('common.add', 'Nuevo')}
              </Button>
            )}
          </div>
        </PermissionGate>
      </Box>

      {quickEnabled && (
        <QuickCreateDrawer
          open={quickOpen}
          title={quickCreate.title || title}
          subtitle={quickCreate.subtitle}
          submitLabel={quickCreate.submitLabel}
          cancelLabel={quickCreate.cancelLabel}
          fields={quickCreate.fields}
          onClose={() => setQuickOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
};

export default ListPageHeader;
