import swaggerJsDoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UHAMKA Digital Campus Assistant API',
      version: '1.0.0',
      description: 'REST API for UHAMKA Bot — health, admin, and monitoring endpoints.',
      contact: { name: 'Owner', url: 'https://t.me/ravzxz' },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://yourdomain.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/docs/routes/*.ts'],
};

const swaggerSpec = swaggerJsDoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'UHAMKA Bot API Docs',
  }));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
};
