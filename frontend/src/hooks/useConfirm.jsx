// FILE: frontend/src/hooks/useConfirm.jsx
import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

/**
 * Hook para mostrar un diálogo de confirmación y esperar la respuesta del usuario
 * como una Promise<boolean>.
 *
 * Uso:
 *   const [confirm, ConfirmDialog] = useConfirm();
 *   ...
 *   if (await confirm('¿Está seguro de que desea eliminar este elemento?')) {
 *     // el usuario confirmó
 *   }
 *   ...
 *   return (
 *     <>
 *       ...
 *       {ConfirmDialog}
 *     </>
 *   );
 *
 * También admite un segundo parámetro de opciones:
 *   confirm('¿Eliminar?', { title: 'Eliminar registro', confirmText: 'Eliminar', confirmColor: 'error' })
 */
const useConfirm = () => {
  const { t } = useTranslation();
  const [state, setState] = useState({
    open: false,
    message: '',
    title: '',
    confirmText: '',
    cancelText: '',
    confirmColor: 'primary',
  });
  const resolverRef = useRef(null);

  const confirm = useCallback(
    (message, options = {}) => {
      setState({
        open: true,
        message,
        title: options.title || t('common.confirm', { defaultValue: 'Confirmar' }),
        confirmText: options.confirmText || t('common.confirm', { defaultValue: 'Confirmar' }),
        cancelText: options.cancelText || t('common.cancel', { defaultValue: 'Cancelar' }),
        confirmColor: options.confirmColor || 'primary',
      });
      return new Promise((resolve) => {
        resolverRef.current = resolve;
      });
    },
    [t]
  );

  const handleClose = useCallback((result) => {
    setState((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const ConfirmDialog = (
    <Dialog
      open={state.open}
      onClose={() => handleClose(false)}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">{state.title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {state.message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleClose(false)} color="inherit">
          {state.cancelText}
        </Button>
        <Button
          onClick={() => handleClose(true)}
          color={state.confirmColor}
          variant="contained"
          autoFocus
        >
          {state.confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return [confirm, ConfirmDialog];
};

export default useConfirm;
