import { getDashboardSummary } from "../controllers/dashboard.controller.js";
import { verifyJWT, requireHostRole } from '../shared/middlewares/auth.js';

export default async function dashboardRoutes(fastify, options) {
    fastify.addHook('onRequest', verifyJWT);
    fastify.addHook('onRequest', requireHostRole);

    fastify.get('/summary', getDashboardSummary);
}
