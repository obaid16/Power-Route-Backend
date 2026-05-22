/**
 * swagger.js — PowerRoute API Documentation Configuration
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PowerRoute API',
      version: '2.0.0',
      description: 'Production-level EV Charging Platform API with real-time systems, payments, and safety features.',
      contact: { name: 'PowerRoute Team' },
    },
    servers: [
      { url: '/api', description: 'API Base' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };
