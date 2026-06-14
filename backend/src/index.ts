import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { productsRouter } from './routes/products';
import { brandsRouter } from './routes/brands';
import { compareRouter } from './routes/compare';
import { healthRouter } from './routes/health';
import { importRouter } from './routes/import';
import { metricsRouter } from './routes/metrics';
import { intelligenceRouter } from './routes/intelligence';
import { errorHandler } from './middleware/errorHandler';
import { swaggerSpec } from './swagger';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Swagger ────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Routes ─────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/products', productsRouter);
app.use('/api/brands', brandsRouter);
app.use('/api/compare', compareRouter);
app.use('/api/import', importRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/intelligence', intelligenceRouter);

// ── Global error handler (must be after all routes) ────────────────
app.use(errorHandler);

// Only start the server if this file is run directly (not imported in tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PetFoodCompare API running on port ${PORT}`);
  });
}

export default app;
