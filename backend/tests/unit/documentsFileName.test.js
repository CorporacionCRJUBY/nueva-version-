const { displayFileName } = require('../../src/services/documents.service');

const f = (originalname) => ({ originalname, filename: '1789_abc.pdf' });

describe('displayFileName (nombre visible del documento)', () => {
  it('conserva el nombre original y recupera el UTF-8 que multer entrega como Latin-1', () => {
    const latin1 = Buffer.from('Acta de calificación.pdf', 'utf8').toString('latin1');
    expect(displayFileName(f(latin1))).toBe('Acta de calificación.pdf');
    expect(displayFileName(f('boletin.pdf'))).toBe('boletin.pdf');
  });

  it('no corrompe un nombre ya decodificado con caracteres fuera de Latin-1', () => {
    expect(displayFileName(f('Acta — calificación.pdf'))).toBe('Acta — calificación.pdf');
    expect(displayFileName(f('Álbum ñandú.pdf'))).toBe('Álbum ñandú.pdf');
  });

  it('elimina separadores de ruta y caracteres de control', () => {
    expect(displayFileName(f('../../etc/passwd.pdf'))).not.toMatch(/[\\/]/);
    expect(displayFileName(f('a\nb.pdf'))).toBe('a_b.pdf');
  });

  it('limita a 100 caracteres conservando la extensión (columna varchar(100))', () => {
    const name = displayFileName(f('x'.repeat(300) + '.pdf'));
    expect(name.length).toBeLessThanOrEqual(100);
    expect(name.endsWith('.pdf')).toBe(true);
  });

  it('cae al nombre interno si no hay nombre original utilizable', () => {
    expect(displayFileName(f(''))).toBe('1789_abc.pdf');
    expect(displayFileName(f('..'))).toBe('1789_abc.pdf');
  });
});
