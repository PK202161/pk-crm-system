module.exports = {
  apps: [
    {
      name: 'pk-crm-pdf',
      script: './systems/pdf-system/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        PORT: 3003,
        NODE_ENV: 'production',
        SYSTEM_TYPE: 'PDF_LEGACY'
      },
      error_file: './logs/pdf-error.log',
      out_file: './logs/pdf-out.log',
      log_file: './logs/pdf-combined.log'
    },
    {
      name: 'pk-crm-csv',
      script: './systems/csv-system/server.js', 
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        PORT: 3004,
        NODE_ENV: 'production',
        SYSTEM_TYPE: 'CSV_NEW'
      },
      error_file: './logs/csv-error.log',
      out_file: './logs/csv-out.log',
      log_file: './logs/csv-combined.log'
    }
  ]
};
