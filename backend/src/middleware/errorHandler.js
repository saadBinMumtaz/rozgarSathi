import logger from '../utils/logger.js';
import env from '../config/env.js';

export const errorHandler = (err, req, res, _next) => {
  logger.error(`Error handling request ${req.method} ${req.originalUrl}: ${err.message}`, err.stack);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  return res.status(statusCode).json({
    code: statusCode,
    message: err.message || 'Internal Server Error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
