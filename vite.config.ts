import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// docx/pdf templates are imported with `?url` and fetched at runtime,
// so Vite needs to treat them as static assets rather than trying to parse them.
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.docx', '**/*.pdf'],
});
