import '@testing-library/jest-dom';

// jsdom no implementa URL.createObjectURL ni matchMedia (usados por
// useAuthImage / componentes MUI).
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = () => 'blob:mock';
}
if (!window.URL.revokeObjectURL) {
  window.URL.revokeObjectURL = () => {};
}
if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}