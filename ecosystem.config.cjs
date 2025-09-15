module.exports = {
  apps: [{
    name: 'fbai-app',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/fbai-app-error.log',
    out_file: '/var/log/fbai-app-out.log',
    log_file: '/var/log/fbai-app-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
