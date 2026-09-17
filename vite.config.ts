import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The AML PDF template is imported with `?url` and fetched at runtime, so
// Vite needs to treat it as a static asset rather than trying to parse it.
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.pdf'],
});
