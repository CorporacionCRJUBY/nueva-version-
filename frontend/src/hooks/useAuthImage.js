// FILE: frontend/src/hooks/useAuthImage.js
import { useState, useEffect, useRef } from 'react';
import { api } from '../api/axiosClient';

/**
 * Carga una imagen protegida (p. ej. la foto de un estudiante, servida
 * detrás de auth en GET /students/:id/photo) y expone un object URL listo
 * para <img src> / <Avatar src>. Un <img> normal no puede usarse ahí porque
 * la ruta no es pública y requiere la cookie httpOnly de sesión, que el
 * navegador no adjunta en peticiones de imagen cross-origin salvo que se
 * pida explícitamente (ver axiosClient, que usa withCredentials).
 *
 * Uso:
 *   const { blobUrl, loading } = useAuthImage(hasPhoto ? `/students/${id}/photo` : null);
 *   <Avatar src={blobUrl || undefined} />
 *
 * Pasar `null`/`undefined` como url omite la carga (ej.: cuando el registro
 * todavía no tiene foto).
 */
const useAuthImage = (url) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    // Limpia el object URL anterior antes de pedir uno nuevo (o si `url`
    // pasa a ser null) para no acumular blobs sin liberar en memoria.
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setBlobUrl(null);
    setError(null);

    if (!url) {
      return undefined;
    }

    setLoading(true);
    api
      .getBlobUrl(url)
      .then((newBlobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(newBlobUrl);
          return;
        }
        objectUrlRef.current = newBlobUrl;
        setBlobUrl(newBlobUrl);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  // Revoca el último object URL creado cuando el componente se desmonta.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  return { blobUrl, loading, error };
};

export default useAuthImage;
