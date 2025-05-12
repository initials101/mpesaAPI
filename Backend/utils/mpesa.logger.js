import winston from 'winston';
import config from '../config/index.js';

// Custom format for handling objects and arrays
const safeStringify = (obj) => {
if (typeof obj === 'string') return obj;

try {
return JSON.stringify(obj);
} catch (error) {
return '[Circular or Non-Serializable Object]';
}
};

// Define log format
const logFormat = winston.format.combine(
winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
winston.format.errors({ stack: true }),
winston.format.splat(),
winston.format((info) => {
// Handle non-string messages
if (typeof info.message !== 'string') {
info.message = safeStringify(info.message);
}

// Handle circular references in metadata
Object.keys(info).forEach(key => {
if (key !== 'level' && key !== 'message' && key !== 'timestamp') {
if (typeof info[key] !== 'string' && typeof info[key] !== 'number' && info[key] !== null) {
info[key] = safeStringify(info[key]);
}
}
});

return info;
})(),
winston.format.json()
);

// Create the logger instance
const logger = winston.createLogger({
level: config.logging.level,
format: logFormat,
defaultMeta: { service: 'mpesa-api' },
transports: [
// Write all logs with level 'error' and below to error.log
new winston.transports.File({ 
filename: 'logs/error.log', 
level: 'error',
maxsize: 5242880, // 5MB
maxFiles: 5,
}),
// Write all logs to combined.log
new winston.transports.File({ 
filename: 'logs/combined.log',
maxsize: 5242880, // 5MB
maxFiles: 5,
}),
],
});

// If we're not in production, also log to the console
if (config.env !== 'production') {
logger.add(new winston.transports.Console({
format: winston.format.combine(
winston.format.colorize(),
winston.format.simple()
),
}));
}

// Create a stream object for Morgan middleware
logger.stream = {
write: (message) => {
logger.info(message.trim());
},
};

export default logger;