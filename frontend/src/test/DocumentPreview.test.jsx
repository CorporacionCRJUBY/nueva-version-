/**
 * Previsualización de documentos: PDF en iframe, imagen en <img>, MIME
 * genérico resuelto por extensión y tipos no soportados sin petición al
 * servidor. También comprueba que getBlobUrl conserva el tipo MIME (antes
 * `new Blob([blob])` lo perdía y el visor de PDF no abría el archivo).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

const previewMock = vi.hoisted(() => vi.fn());
vi.mock('../features/documents/api', () => ({
  default: { getPreviewBlobUrl: previewMock, download: vi.fn() },
  documentsApi: { getPreviewBlobUrl: previewMock, download: vi.fn() },
}));

import DocumentPreviewDialog, { resolveMimeType } from '../features/documents/components/DocumentPreviewDialog';

const renderDialog = (props) =>
  render(
    <I18nextProvider i18n={i18n}>
      <DocumentPreviewDialog open onClose={() => {}} documentId={7} title="Doc" {...props} />
    </I18nextProvider>
  );

beforeEach(() => {
  previewMock.mockReset();
  previewMock.mockResolvedValue('blob:http://localhost/abc');
});

describe('resolveMimeType', () => {
  it('deduce por extensión si el MIME es genérico o falta, y normaliza image/jpg', () => {
    expect(resolveMimeType('application/octet-stream', 'acta.PDF')).toBe('application/pdf');
    expect(resolveMimeType(null, 'foto.jpeg')).toBe('image/jpeg');
    expect(resolveMimeType('image/jpg', 'x')).toBe('image/jpeg');
    expect(resolveMimeType('application/pdf', 'x.bin')).toBe('application/pdf');
  });
});

describe('DocumentPreviewDialog', () => {
  it('muestra un PDF en un iframe con el blob', async () => {
    renderDialog({ mimeType: 'application/pdf', fileName: 'acta.pdf' });
    const frame = await screen.findByTitle('acta.pdf');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', 'blob:http://localhost/abc');
    expect(previewMock).toHaveBeenCalledWith(7, 'application/pdf');
  });

  it('muestra una imagen en <img>', async () => {
    renderDialog({ mimeType: 'image/png', fileName: 'foto.png' });
    const img = await screen.findByAltText('foto.png');
    expect(img).toHaveAttribute('src', 'blob:http://localhost/abc');
  });

  it('un PDF registrado con MIME genérico igualmente se previsualiza', async () => {
    renderDialog({ mimeType: 'application/octet-stream', fileName: 'boletin.pdf' });
    expect(await screen.findByTitle('boletin.pdf')).toBeInTheDocument();
    expect(previewMock).toHaveBeenCalledWith(7, 'application/pdf');
  });

  it('un docx no se pide al servidor y ofrece la descarga', async () => {
    renderDialog({
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileName: 'carta.docx',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /download|descargar/i })).toBeEnabled());
    expect(previewMock).not.toHaveBeenCalled();
    expect(screen.queryByTitle('carta.docx')).toBeNull();
  });
});
