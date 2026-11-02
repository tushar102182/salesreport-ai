// PM2 process file for VPS deployments:  pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'salesreport-ai',
      cwd: './apps/server',
      script: 'dist/index.js',
      instances: 1, // SQLite: keep 1. With PostgreSQL you may use 'max' (cluster mode).
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '512M',
      time: true,
    },
  ],
};
