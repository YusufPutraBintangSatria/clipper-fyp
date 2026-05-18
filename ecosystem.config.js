module.exports = {
  apps: [
    {
      name: "auto-clipper-worker",
      script: "npx",
      args: "tsx src/worker.ts",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/worker-error.log",
      out_file: "./logs/worker-out.log",
      merge_logs: true,
    }
  ]
};
