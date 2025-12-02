import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { sessionRouter } from './routes/session.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { logger } from './lib/logger.js';
import { startBufferFlush, stopBufferFlush } from './buffer/index.js';

const app: Express = express();
const PORT = process.env.PORT || 4001;

// Security middleware
app.use(helmet());
app.use(cors());

// Request parsing
app.use(express.json({ limit: '1mb' }));

// Logging (minimal for high-throughput)
app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
}));

// Rate limiting
app.use(rateLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/session', sessionRouter);

// Error handling
app.use(errorHandler);

// Start server and buffer flush
const server = app.listen(PORT, () => {
  logger.info(`Ingestion server running on port ${PORT}`);
  startBufferFlush();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await stopBufferFlush();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
