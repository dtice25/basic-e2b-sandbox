import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { compute } from 'computesdk';

const app = express();
const PORT = 8081;

app.use(cors());
app.use(express.json());

app.post('/api/sandbox', async (_req, res) => {
  try {
    // ComputeSDK auto-detects provider credentials from .env file
    const sandbox = await compute.sandbox.create();

    // Create basic Vite React app
    await sandbox.runCommand('npm create vite@5 app -- --template react');

    // Custom vite.config.js to allow access to sandbox at port 5173
    const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: false,
    allowedHosts: ['.e2b.app', '.e2b.dev', 'localhost', '127.0.0.1', '.computesdk.com'],
  },
})
`;
    await sandbox.filesystem.writeFile('app/vite.config.js', viteConfig);

    // Install dependencies
    const installResult = await sandbox.runCommand('npm install', {
      cwd: 'app'
    });
    console.log('npm install exit code:', installResult.exitCode);
    console.log('npm install stdout:', installResult.stdout);
    if (installResult.stderr) console.log('npm install stderr:', installResult.stderr);

    // Start dev server
    sandbox.runCommand('npm run dev > vite.log 2>&1', {
      cwd: 'app',
      background: true,
    })
    console.log('Dev server started in background');

    // Get preview URL
    const url = await sandbox.getUrl({ port: 5173 });
    console.log('previewUrl:', url);

    res.json({
      sandboxId: sandbox.sandboxId,
      url,
    });
  } catch (error) {
    console.error('Error creating sandbox:', error);
    res.status(500).json({ error: 'Failed to create sandbox' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
