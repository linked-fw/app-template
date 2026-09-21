// Staging process definition.
//
// `server:staging` runs the same production entry as pm2.config.js
// (`linked serve-app`), with the `staging` env profile selected. It serves the
// compiled build — never Vite — so `npm run build` (linked build-app) must have
// run first, or serve-app exits with "Compiled app artifact is missing".
module.exports = {
  apps: [
    {
      name: 'app-staging',
      script: 'npm run server:staging',
      time: true,
      log_date_format: 'DD-MM-YYYY HH:mm Z',
      out_file: './data/out.log',
      error_file: './data/error.log',
    },
  ],
};
