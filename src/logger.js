import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

const logger = pino({
  level: logLevel,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        formatters: {
          level: (label) => ({ level: label }),
        },
      }),
});

export default logger;
