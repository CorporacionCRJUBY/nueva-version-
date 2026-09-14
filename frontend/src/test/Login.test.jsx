import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

// useAuth se mockea: el test solo verifica el render y las traducciones.
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue({ success: true }),
    verifyTwoFactor: vi.fn().mockResolvedValue({ success: true }),
  }),
}));

const theme = createTheme({ palette: { mode: 'dark' } });

const renderLogin = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>
    </I18nextProvider>
  );

// Import después de definir los mocks.
import LoginPage from '../pages/Login';

describe('LoginPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es');
  });

  it('renderiza el formulario con traducciones en español', () => {
    renderLogin();
    expect(screen.getByText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeInTheDocument();
  });

  it('no muestra claves crudas de i18n', () => {
    renderLogin();
    const rawKey = screen.queryByText(/^auth\./);
    expect(rawKey).toBeNull();
  });
});