import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { authRouter } from './routes/auth.js';
import { networksRouter } from './routes/networks.js';
import { analyticsRouter } from './routes/analytics.js';
import { playersRouter } from './routes/players.js';
import { campaignsRouter } from './routes/campaigns.js';
import { teamRouter } from './routes/team.js';
import { apiKeysRouter } from './routes/api-keys.js';
import { gamemodesRouter } from './routes/gamemodes.js';
import { auditRouter } from './routes/audit.js';
import { webhooksRouter } from './routes/webhooks.js';
import { alertsRouter } from './routes/alerts.js';
import { adminRouter } from './routes/admin.js';
import { logger } from './lib/logger.js';

const app: Express = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));

// Logging
app.use(pinoHttp({ logger }));

// Rate limiting
app.use(rateLimiter);

// Swagger documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MCTrack API Documentation',
}));
app.get('/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRouter);
app.use('/networks', networksRouter);
app.use('/networks/:networkId/analytics', analyticsRouter);
app.use('/networks/:networkId/players', playersRouter);
app.use('/networks/:networkId/campaigns', campaignsRouter);
app.use('/networks/:networkId/team', teamRouter);
app.use('/networks/:networkId/api-keys', apiKeysRouter);
app.use('/networks/:networkId/gamemodes', gamemodesRouter);
app.use('/networks/:networkId/webhooks', webhooksRouter);
app.use('/networks/:networkId/alerts', alertsRouter);
app.use('/networks/:networkId/audit-logs', auditRouter);
app.use('/admin', adminRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
  logger.info(`Swagger docs available at http://localhost:${PORT}/docs`);
});

export default app;
