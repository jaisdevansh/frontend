import * as BookingController from "../controllers/booking.controller.js";
import { verifyJWT, requireHostRole } from '../shared/middlewares/auth.js';
import { scanQRSchema } from '../validators/booking.validator.js';

export default async function bookingRoutes(fastify, options) {
    fastify.addHook('onRequest', verifyJWT);
    fastify.addHook('onRequest', requireHostRole);

    fastify.get('/', BookingController.getBookings);

    fastify.post('/check-in', {
        schema: { body: scanQRSchema }
    }, async (req, res) => await BookingController.checkInQR(req, res));
}
