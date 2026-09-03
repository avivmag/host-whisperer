import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: { entry: 'src/runtime/index.ts', formats: ['es'], fileName: () => 'host-whisperer.js' },
    outDir: 'dist/runtime',
    rollupOptions: { output: { assetFileNames: 'host-whisperer.[ext]' } },
  },
});
