import * as EventController from "../controllers/event.controller.js";
import { verifyJWT, requireHostRole, verifyOwnership } from '../shared/middlewares/auth.js';
import { Event } from '../shared/models/Event.js';
import { createEventSchema, updateEventStatusSchema } from '../validators/event.validator.js';

export default async function eventRoutes(fastify, options) {
    fastify.addHook('onRequest', verifyJWT);
    fastify.addHook('onRequest', requireHostRole);

    fastify.get('/', EventController.getEvents);

    fastify.post('/', {
        schema: { body: createEventSchema },
    }, async (req, res) => await EventController.createEvent(req, res));

    fastify.put('/:eventId', {
        preHandler: verifyOwnership(Event)
    }, async (req, res) => await EventController.updateEvent(req, res));

    fastify.patch('/:eventId/status', {
        preHandler: verifyOwnership(Event),
        schema: { body: updateEventStatusSchema }
    }, async (req, res) => await EventController.updateEventStatus(req, res));

    fastify.delete('/:eventId', {
        preHandler: verifyOwnership(Event)
    }, async (req, res) => await EventController.deleteEvent(req, res));
}
