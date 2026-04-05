import { updateVenueProfile } from "../controllers/venue.controller.js";
import { verifyJWT, requireHostRole } from '../shared/middlewares/auth.js';
import { updateVenueSchema } from '../validators/venue.validator.js';

export default async function venueRoutes(fastify, options) {
    fastify.addHook('onRequest', verifyJWT);
    fastify.addHook('onRequest', requireHostRole);

    fastify.put('/venue', {
        schema: { body: updateVenueSchema }
    }, updateVenueProfile);
}
