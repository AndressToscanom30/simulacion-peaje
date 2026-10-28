import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // El motor es JS puro y debe correr en Node: el entorno `node` hace que
    // cualquier dependencia del DOM que se le cuele falle en las pruebas
    // (DEC-012). Solo las pruebas de componentes piden jsdom, y lo piden
    // archivo por archivo con `@vitest-environment jsdom` (DEC-034).
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
  },
});
