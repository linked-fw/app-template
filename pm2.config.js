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
