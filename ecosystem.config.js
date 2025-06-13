// ecosystem.config.js - Updated for CSV-first architecture
module.exports = {
  apps: [
    {
      name: 'pk-crm-main',
      script: 'server.js',
      cwd: '/home/pakeen/pk-crm',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        DB_HOST: 'localhost',
        DB_PORT: 5434,
        DB_NAME: 'pk_crm_db',
        DB_USER: 'pkt_upload',
        DB_PASSWORD: 'upload123',
        N8N_WEBHOOK_URL: 'https://n8npkapp.pktechnic.com/webhook-test/uploadCsv'
      },
      error_file: './logs/pk-crm-main-error.log',
      out_file: './logs/pk-crm-main-out.log',
      log_file: './logs/pk-crm-main.log',
      time: true,
      autorestart: true,
      max_restarts: 5,
      restart_delay: 5000,
      watch: false,
      ignore_watch: [
        'uploads',
        'logs',
        'node_modules'
      ]
    },
    {
      name: 'liff-app',
      script: 'liff-server.js',
      cwd: '/home/pakeen/liff-delivery',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/liff-error.log',
      out_file: './logs/liff-out.log',
      log_file: './logs/liff.log',
      time: true,
      autorestart: true,
      max_restarts: 3,
      restart_delay: 3000
    }
  ]
};
