import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // La escena 3D va en su propio trozo, cargado en diferido (DEC-037): three
    // pesa, pero solo lo descarga quien abre la vista 3D. El aviso de tamaño se
    // sube para que no tape los avisos que sí importan.
    chunkSizeWarningLimit: 900,
  },
  test: {
    // El motor es JS puro y debe correr en Node: el entorno `node` hace que
    // cualquier dependencia del DOM que se le cuele falle en las pruebas
    // (DEC-012). Solo las pruebas de componentes piden jsdom, y lo piden
    // archivo por archivo con `@vitest-environment jsdom` (DEC-034).
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
  },
});
