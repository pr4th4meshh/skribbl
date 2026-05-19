import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './shared/config/env';
import { globalLimiter } from './shared/middleware/rateLimit';
import { errorHandler } from './shared/middleware/error.middleware';
import routes from './routes';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(globalLimiter);

app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use('/api/v1', routes);
app.use(errorHandler);

export default app;
