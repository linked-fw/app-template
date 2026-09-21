// Production process definition.
//
// `server:prod` runs `linked serve-app`: the production entry that validates the
// compiled artefacts (lib/App.js, lib/routes.js, lib/backend.js and the Vite
// manifest) and serves them without starting Vite or a file watcher.
// `npm run build` (linked build-app) must have run first, or serve-app exits
// with "Compiled app artifact is missing".
module.exports = {
  apps: [
    {
      name: 'app',
      script: 'npm run server:prod',
      time: true,
      log_date_format: 'DD-MM-YYYY HH:mm Z',
      out_file: "./data/out.log",
      error_file: "./data/error.log",
    }
  ],
};
