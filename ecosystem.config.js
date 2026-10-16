module.exports = {
    apps: [{
      name: "nodeEnvioMail",
      cwd: "C:/Produccion/nodeEnvioMail/backendEmailSenderAP", // ruta del proyecto
      script: "./index.js",   // <-- aquí el cambio
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3000",
        SERVER: process.env.SERVER,
        RESEND: process.env.RESEND,
        SQLSERVER_HOST: process.env.SQLSERVER_HOST,
        SQLSERVER_USER: process.env.SQLSERVER_USER,
        SQLSERVER_PASSWORD: process.env.SQLSERVER_PASSWORD,
        SQLSERVER_DATABASE: process.env.SQLSERVER_DATABASE,
        SQLSERVER_INSTANCE: process.env.SQLSERVER_INSTANCE,
        SQLSERVER_ENCRYPT: process.env.SQLSERVER_ENCRYPT,
        SQLSERVER_TRUST_CERT: process.env.SQLSERVER_TRUST_CERT
      },
      watch: false,
      max_memory_restart: "300M"
    }]
  };
