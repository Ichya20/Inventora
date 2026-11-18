import express from 'express';
import path from 'node:path';

export function attachProductionFrontend(app: express.Express, distPath: string): void {
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y', immutable: true, index: false, dotfiles: 'deny',
  }));
  app.get(['/index.html', '/icon.svg', '/manifest.webmanifest', '/sw.js'], (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distPath, req.path));
  });
  app.get('*', (req, res) => {
    // Only extensionless client routes receive the SPA document.
    if (path.extname(req.path) || req.path === '/api' || req.path.startsWith('/api/') || req.path.startsWith('/assets/')) {
      res.status(404).end();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
