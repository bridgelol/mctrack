import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MCTrack API',
      version: '1.0.0',
      description: 'Analytics API for Minecraft server networks',
      contact: {
        name: 'MCTrack Support',
        url: 'https://mctrack.net',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
      {
        url: 'https://api.mctrack.net',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from Auth.js session',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for server-to-server calls',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        Network: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            timezone: { type: 'string' },
            creationTime: { type: 'string', format: 'date-time' },
            ownerId: { type: 'string', format: 'uuid' },
          },
        },
        Player: {
          type: 'object',
          properties: {
            playerUuid: { type: 'string' },
            playerName: { type: 'string' },
            platform: { type: 'string', enum: ['java', 'bedrock'] },
            bedrockDevice: { type: 'string', nullable: true },
            country: { type: 'string' },
            firstSeen: { type: 'string', format: 'date-time' },
            lastSeen: { type: 'string', format: 'date-time' },
          },
        },
        Campaign: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            domainFilter: { type: 'string', nullable: true },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            budgetType: { type: 'string', enum: ['daily', 'total'] },
            budgetAmount: { type: 'number' },
            currency: { type: 'string' },
          },
        },
        AnalyticsOverview: {
          type: 'object',
          properties: {
            uniquePlayers: { type: 'integer' },
            totalSessions: { type: 'integer' },
            avgSessionDuration: { type: 'number' },
            peakCcu: { type: 'integer' },
            revenue: { type: 'number' },
            arpu: { type: 'number' },
            arppu: { type: 'number' },
            payerConversion: { type: 'number' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
