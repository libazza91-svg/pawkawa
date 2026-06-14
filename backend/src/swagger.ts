import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pet Food Compare API',
      version: '0.2.0',
      description: '澳新宠物食品对比平台 — Products API & Brands API',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            total: { type: 'integer' },
          },
        },
      },
    },
    paths: {
      '/api/products': {
        get: {
          tags: ['Products'],
          summary: 'Product Query',
          description: 'Query products with pagination and filters',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'species', in: 'query', schema: { type: 'string', enum: ['CAT', 'DOG'] } },
            { name: 'lifeStage', in: 'query', schema: { type: 'string', enum: ['KITTEN', 'ADULT', 'SENIOR', 'PUPPY', 'ALL_LIFE_STAGES'] } },
            { name: 'brand', in: 'query', schema: { type: 'string' }, description: 'Brand name ILIKE search' },
          ],
          responses: {
            '200': { description: 'Product list with pagination' },
            '400': { description: 'Invalid parameter' },
          },
        },
      },
      '/api/products/search': {
        get: {
          tags: ['Products'],
          summary: 'Product Search',
          description: 'Search products by name or brand name (ILIKE)',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          ],
          responses: {
            '200': { description: 'Search results with pagination' },
          },
        },
      },
      '/api/products/{id}': {
        get: {
          tags: ['Products'],
          summary: 'Product Detail',
          description: 'Full product detail with brand, nutrition, ingredients, prices, and sources',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          ],
          responses: {
            '200': { description: 'Product detail' },
            '404': { description: 'Product not found' },
          },
        },
      },
      '/api/brands': {
        get: {
          tags: ['Brands'],
          summary: 'Brands List',
          description: 'List brands with pagination and optional country filter',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'country', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Brand list with pagination' },
          },
        },
      },
      '/api/brands/{id}': {
        get: {
          tags: ['Brands'],
          summary: 'Brand Detail',
          description: 'Brand info plus its products',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          ],
          responses: {
            '200': { description: 'Brand detail with products' },
            '404': { description: 'Brand not found' },
          },
        },
      },
      '/api/health/db': {
        get: {
          tags: ['Health'],
          summary: 'Database Health Check',
          responses: {
            '200': { description: 'Database connected' },
            '500': { description: 'Database disconnected' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
