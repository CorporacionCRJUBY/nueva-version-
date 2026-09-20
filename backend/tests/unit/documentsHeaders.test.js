const http = require('http');
const { contentDisposition, effectiveMime } = require('../../src/controllers/documents.controller');

describe('cabeceras de previsualización de documentos', () => {
  it('genera un Content-Disposition válido con acentos, ñ y comillas', (done) => {
    const header = contentDisposition('inline', 'Certificado de calificación — “ñ” 📄.pdf');
    expect(header).toMatch(/^inline; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
    expect(header).toContain('Certificado%20de%20calificaci%C3%B3n');
    // Node lanza ERR_INVALID_CHAR si la cabecera trae caracteres no ASCII.
    const server = http
      .createServer((req, res) => {
        res.setHeader('Content-Disposition', header);
        res.end('ok');
      })
      .listen(0, () => {
        http.get({ port: server.address().port }, (res) => {
          expect(res.statusCode).toBe(200);
          res.resume();
          server.close(done);
        });
      });
  });

  it('deduce el MIME por extensión cuando el registro es genérico o falta', () => {
    expect(effectiveMime('application/octet-stream', 'acta.PDF')).toBe('application/pdf');
    expect(effectiveMime(null, 'foto.jpg')).toBe('image/jpeg');
    expect(effectiveMime('image/jpg', 'x')).toBe('image/jpeg');
    expect(effectiveMime('application/pdf', 'x.bin')).toBe('application/pdf');
  });
});
