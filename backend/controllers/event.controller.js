import { Event } from '../shared/models/Event.js';
import { Report } from '../shared/models/Report.js';
import { Booking } from '../shared/models/booking.model.js';
import { Venue } from '../shared/models/Venue.js';
import { MenuItem } from '../shared/models/MenuItem.js';
import { Gift } from '../shared/models/Gift.js';
import { Floor } from '../shared/models/Floor.js';
import { cacheService } from '../services/cache.service.js';
import { getIO } from '../socket.js';
import { User } from '../shared/models/user.model.js';
import { Host } from '../shared/models/Host.js';
import { bookEventSchema } from '../validators/user.validator.js';

export const createEvent = async (req, res, next) => {
    try {
        console.log(`[createEvent] Creating new event for host: ${req.user.id}`);

        const { 
            title, description, date, startTime, endTime, coverImage, images, 
            houseRules, attendeeCount, floorCount, tickets, status,
            locationVisibility, revealTime, allowNonTicketView, locationData,
            bookingOpenDate
        } = req.body;

        const event = new Event({
            hostId: req.user.id,
            hostModel: req.user.role?.toUpperCase() === 'HOST' ? 'Host' : 'User',
            title,
            description,
            date: new Date(date),
            startTime,
            endTime,
            coverImage,
            images,
            houseRules,
            attendeeCount: attendeeCount || 0,
            floorCount: floorCount || 1,
            locationVisibility: locationVisibility || 'public',
            revealTime: locationVisibility === 'delayed' && revealTime ? new Date(revealTime) : undefined,
            isLocationRevealed: locationVisibility === 'public', // Auto-reveal if public
            allowNonTicketView: allowNonTicketView || false,
            locationData,
            tickets,
            status: status || 'DRAFT',
            bookingOpenDate: bookingOpenDate ? new Date(bookingOpenDate) : undefined
        });

        await event.save();
        console.log(`[createEvent] Event created successfully: ${event._id}`);

        // If directly published, notify
        if (status === 'LIVE') {
            const { sendNotification } = await import('../services/notification.service.js');
            await sendNotification(req.user.id, {
                title: 'Event Published! 🎉',
                message: `Your event "${title}" is now live and accepting bookings.`,
                type: 'SYSTEM'
            });
        }

        return res.status(201).json({
            success: true,
            eventId: event._id,
            message: "Experience Launched Successfully!"
        });
    } catch (error) {
        console.error(`[createEvent] Error:`, error);
        next(error);
    }
};

export const updateEvent = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const updated = await Event.findByIdAndUpdate(eventId, req.body, { new: true });
        return res.status(200).json({ success: true, eventId: updated._id });
    } catch (error) {
        next(error);
    }
};

export const getEventById = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const item = await Event.findById(eventId).lean();
        if (!item) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Privacy Masking (Synchronized with user controller)
        let canViewLocation = true;
        
        if (item.locationVisibility === 'hidden') {
            if (!item.isLocationRevealed) canViewLocation = false;
        } else if (item.locationVisibility === 'delayed') {
            const revealTime = item.revealTime ? new Date(item.revealTime) : null;
            const now = new Date();
            if (!item.isLocationRevealed && (!revealTime || now < revealTime)) {
                canViewLocation = false;
            }
        }

        if (!canViewLocation) {
            item.locationData = null;
            item.isLocationMasked = true;
        }

        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        return res.status(200).json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
};

export const updateEventStatus = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { status } = req.body;
        const updated = await Event.findByIdAndUpdate(eventId, { status }, { new: true });

        if (status === 'LIVE') {
            const { sendNotification } = await import('../services/notification.service.js');
            await sendNotification(req.user.id, {
                title: 'Event Published! 🎉',
                message: `Your event "${updated.title}" is now live and accepting bookings.`,
                type: 'SYSTEM'
            });
        }

        return res.status(200).json({ success: true, status: updated.status });
    } catch (error) {
        next(error);
    }
};

export const deleteEvent = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        await Event.findByIdAndDelete(eventId);

        return res.status(200).json({ success: true, message: "Event Cancelled" });
    } catch (error) {
        next(error);
    }
};

export const getEvents = async (req, res, next) => {
    try {
        const events = await Event.find({ hostId: req.user.id })
            .select('title date startTime coverImage status attendeeCount locationVisibility isLocationRevealed displayPrice')
            .sort({ date: -1 }) // Sort newest first
            .lean();
        return res.status(200).json({ success: true, events });
    } catch (error) {
        next(error);
    }
};

export const reportEvent = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { reason, details } = req.body;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const existingReport = await Report.findOne({ reportedBy: req.user.id, eventId });
        if (existingReport) {
            return res.status(400).json({ success: false, message: 'You have already reported this event' });
        }

        const report = await Report.create({
            reportedBy: req.user.id,
            eventId,
            reason,
            details
        });

        // Increment event report count and auto-flag/pause if needed
        event.reportCount += 1;
        
        // Auto-pause if more than 5 reports
        if (event.reportCount >= 5 && event.status === 'LIVE') {
            event.status = 'PAUSED';
            // Alert Admin could be added here
        }

        await event.save();
        res.status(201).json({ success: true, message: 'Report submitted successfully' });

    } catch (error) {
        next(error);
    }
};

// [NEW ENDPOINT] Manual Location Reveal Trigger for Host
export const revealEventLocation = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findOne({ _id: eventId, hostId: req.user.id });
        
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
        }

        if (event.isLocationRevealed) {
            return res.status(400).json({ success: false, message: 'Location is already revealed' });
        }

        event.isLocationRevealed = true;
        await event.save();

        // Broadcast to clients via Socket.io
        import('../socket.js').then(({ getIO }) => {
            const io = getIO();
            if (io) {
                // Anyone viewing the event details page gets real-time override
                io.emit('location_revealed', { eventId: event._id });
            }
        });

        // Trigger push notifications internally via service
        import('../services/notification.service.js').then(async ({ sendNotification }) => {
            // Find all confirmed bookings
            const { Booking } = await import('../shared/models/booking.model.js');
            const bookings = await Booking.find({ 
                eventId: event._id, 
                status: { $in: ['approved', 'active', 'confirmed', 'checked_in'] }
            }).select('userId').lean();
            
            for (const booking of bookings) {
                await sendNotification(
                    booking.userId,
                    'Location Revealed 📍',
                    `The secret location for "${event.title}" is now available. Tap to view.`,
                    'SYSTEM',
                    { type: 'location_reveal', eventId: event._id.toString() }
                );
            }
        });

        res.status(200).json({ success: true, message: 'Location revealed successfully and notifications dispatched' });

    } catch (error) {
        next(error);
    }
};

// --- GUEST DISCOVERY & BOOKING ACTIONS ---

export const getAllEvents = async (req, res, next) => {
    try {
        const cacheKey = 'events_all_guest_v13_ultra';
        const events = await cacheService.wrap(cacheKey, 600, async () => { // 10min cache
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // ⚡ ULTRA OPTIMIZED: Only return minimal fields for list view
            const rawEvents = await Event.find({ 
                status: 'LIVE',
                date: { $gte: startOfToday } 
            })
                .select('title date startTime coverImage hostId hostModel attendeeCount tickets')
                .sort({ date: 1 })
                .lean();
            
            const filteredEvents = rawEvents.filter(e => {
                const eventDate = new Date(e.date);
                if (eventDate.toDateString() === now.toDateString()) {
                    return true; 
                }
                return eventDate >= startOfToday;
            });

            // ⚡ Batch fetch hosts
            const hostGroups = filteredEvents.reduce((acc, e) => {
                if (!e.hostId) return acc;
                const model = e.hostModel || 'Host';
                if (!acc[model]) acc[model] = new Set();
                acc[model].add(e.hostId.toString());
                return acc;
            }, {});

            const hostDataMap = {};
            await Promise.all(Object.keys(hostGroups).map(async (model) => {
                const ids = Array.from(hostGroups[model]);
                const Model = model === 'Host' ? Host : User;
                try {
                    const hosts = await Model.find({ _id: { $in: ids } })
                        .select('firstName lastName name profileImage')
                        .lean();
                    hosts.forEach(h => { hostDataMap[`${model}_${h._id}`] = h; });
                } catch (e) {
                    console.error(`[Host Resolve Fail] ${model}:`, e.message);
                }
            }));

            return filteredEvents.map((e) => {
                const model = e.hostModel || 'Host';
                const hIdStr = e.hostId ? e.hostId.toString() : null;
                let host = hIdStr ? hostDataMap[`${model}_${hIdStr}`] : null;
                
                if (!host && hIdStr) {
                    const altModel = model === 'Host' ? 'User' : 'Host';
                    host = hostDataMap[`${altModel}_${hIdStr}`]; 
                }

                const finalName = host 
                    ? (host.name || `${host.firstName || ''} ${host.lastName || ''}`.trim())
                    : 'Collective Underground';

                // ⚡ Calculate min price from tickets
                const allPrices = (e.tickets || []).map(t => t.price).filter(p => typeof p === 'number' && p > 0);
                const displayPrice = allPrices.length > 0 ? Math.min(...allPrices) : 2500;

                const totalCapacity = (e.tickets || []).reduce((acc, t) => acc + (t.capacity || 0), 0) || e.attendeeCount || 100;
                const totalSold = (e.tickets || []).reduce((acc, t) => acc + (t.sold || 0), 0) || 0;
                const occupancy = Math.min(Math.round((totalSold / totalCapacity) * 100), 100) || (20 + (Math.floor(Math.random() * 60)));

                // ⚡ Return only essential fields
                return {
                    _id: e._id,
                    title: e.title,
                    date: e.date,
                    startTime: e.startTime,
                    coverImage: e.coverImage,
                    displayPrice,
                    occupancy: `${occupancy}%`,
                    hostId: { 
                        _id: host?._id,
                        name: finalName, 
                        profileImage: host?.profileImage || null 
                    }
                };
            });
        });
        
        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=120');
        res.status(200).json({ success: true, data: events });
    } catch (err) { next(err); }
};

export const getEventBasic = async (req, res, next) => {
    try {
        const { id } = req.params;
        // ⚡ OPTIMIZED: Only return essential fields for initial render (no tickets/floors)
        const item = await Event.findById(id)
            .select('title date startTime endTime coverImage images status hostId hostModel locationVisibility isLocationRevealed locationData floorCount attendeeCount')
            .lean();
        if (!item) return res.status(404).json({ success: false, message: 'Event not found' });

        console.log(`[getEventBasic] Event ${id} - coverImage: ${!!item.coverImage}, images: ${item.images?.length || 0}`);

        // Manual Host Resolution
        let host = await Host.findById(item.hostId).select('firstName lastName name profileImage').lean();
        if (!host) {
            host = await User.findById(item.hostId).select('name profileImage').lean();
        }
        
        if (host) {
            item.hostId = {
                ...host,
                name: host.name || `${host.firstName || ''} ${host.lastName || ''}`.trim() || 'Collective Underground'
            };
        } else {
            item.hostId = { name: 'Collective Underground' };
        }

        // Privacy masking
        let canViewLocation = (item.locationVisibility === 'public' || item.isLocationRevealed);
        if (!canViewLocation) {
            item.locationData = null;
            item.isLocationMasked = true;
        }

        res.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=60');
        res.status(200).json({ success: true, data: item });
    } catch (err) { next(err); }
};

export const getEventDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        // ⚡ OPTIMIZED: Only return additional details not in basic (exclude heavy arrays)
        const event = await Event.findById(id)
            .select('description images houseRules freeRefreshmentsCount allowNonTicketView bookingOpenDate isFeatured isTrending views')
            .lean();
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        // Note: Host already resolved in basic endpoint, no need to duplicate
        res.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=60');
        return res.status(200).json({ success: true, data: event });
    } catch (err) { next(err); }
};

export const getEventTickets = async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await Event.findById(id).select('tickets floors bookingOpenDate').lean();
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        const data = {
            tickets: event.tickets || [],
            floors: event.floors || []
        };
        res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
};

export const getFloorPlan = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { Floor } = await import('../shared/models/Floor.js');
        const { Event } = await import('../shared/models/Event.js');

        // 1. Fetch data from both sources
        const [dedicatedFloors, eventDoc] = await Promise.all([
            Floor.find({ eventId: id }).lean(),
            Event.findById(id).select('floors tickets').lean()
        ]);

        // 2. Resolve the primary source of 'zones'
        let rawZones = [];
        if (dedicatedFloors && dedicatedFloors.length > 0) {
            rawZones = dedicatedFloors;
        } else if (eventDoc?.floors && eventDoc.floors.length > 0) {
            rawZones = eventDoc.floors;
        } else if (eventDoc?.tickets && eventDoc.tickets.length > 0) {
            rawZones = eventDoc.tickets.map(t => ({
                ...t.toObject ? t.toObject() : t,
                name: t.name || t.type
            }));
        }

        // 3. Transform and add virtual seats for UX orchestration
        const zones = rawZones.map(f => {
            const seats = [];
            // Generate seats based on capacity (default to 24 if missing)
            const count = Math.min(f.capacity || 24, 100); 
            for (let i = 1; i <= count; i++) {
                seats.push({
                    id: `${f._id || f.type}_s${i}`,
                    number: `${i}`,
                    status: (i % 8 === 0) ? 'booked' : 'available',
                    price: f.price
                });
            }
            return {
                ...f,
                name: f.name || f.type,
                seats
            };
        });

        res.status(200).json({ success: true, data: { zones } });
    } catch (err) { next(err); }
};

export const lockSeats = async (req, res, next) => {
    try {
        // Mock Seat Management Orchestration
        const { eventId, seatIds } = req.body;
        res.status(200).json({ success: true, lockId: `LD_${Date.now()}` });
    } catch (err) { next(err); }
};

export const bookEvent = async (req, res, next) => {
    try {
        const { eventId, ticketType, tableId, seatIds, guests, pricePaid } = req.body;
        
        const event = await Event.findById(eventId).select('hostId title').lean();
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const booking = await Booking.create({
            userId: req.user.id,
            hostId: event.hostId,
            eventId,
            ticketType,
            tableId,
            seatIds,
            guests,
            pricePaid,
            paymentStatus: 'paid',
            status: 'active'
        });

        // Async Non-blocking Side-Effect: Notify Host
        (async () => {
            const io = getIO();
            if (io) {
                io.to(event.hostId.toString()).emit('new_booking', { event: event.title, bookingId: booking._id });
            }
        })().catch(e => console.error('[Event Sync Fail]', e.message));

        res.status(201).json({ success: true, message: 'Experience Booked!', data: booking });
    } catch (err) { next(err); }
};

export const getBookedTables = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const booked = await Booking.find({ eventId, status: { $ne: 'cancelled' } }).select('tableId').lean();
        res.status(200).json({ success: true, data: booked.map(b => b.tableId) });
    } catch (err) { next(err); }
};

export const getMenuItems = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const cacheKey = cacheService.formatKey('event_menu', eventId);
        const cached = await cacheService.get(cacheKey);
        if (cached) return res.status(200).json({ success: true, data: cached });

        const event = await Event.findById(eventId).select('hostId venueId').lean();
        if (!event) return res.status(200).json({ success: true, data: [], message: 'Event not found' });

        // ⚡ Single $or query — replaces 3 sequential DB calls (3x faster)
        const orConditions = [{ hostId: event.hostId }, { eventId }];
        if (event.venueId) orConditions.push({ venueId: event.venueId });

        const dbItems = await MenuItem.find({ $or: orConditions, inStock: true })
            .select('name price category image desc inStock')
            .lean();

        const items = dbItems.map(item => ({ ...item, type: item.category, description: item.desc || '' }));
        await cacheService.set(cacheKey, items, 600);
        res.status(200).json({ success: true, data: items });
    } catch (err) { next(err); }
};

export const getEventBooking = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const booking = await Booking.findOne({ 
            userId: req.user.id, 
            eventId,
            status: { $in: ['active', 'checked_in', 'confirmed'] } 
        }).populate('venueId', 'name address').lean();

        if (!booking) return res.status(200).json({ success: true, data: null, message: 'No active booking' });
        
        res.status(200).json({ success: true, data: booking });
    } catch (err) { next(err); }
};

export const getActiveEvent = async (req, res, next) => {
    try {
        const booking = await Booking.findOne({ 
            userId: req.user.id, 
            status: { $in: ['approved', 'active', 'checked_in'] }   // ✅ 'approved' = paid booking
        }).populate({
            path: 'eventId',
            select: 'title coverImage startTime venueId'
        }).lean();
        
        res.status(200).json({ success: true, data: booking });
    } catch (err) { next(err); }
};

// ── PUBLIC: Get host's menu items by hostId (post-booking) ─────────────────
export const getHostMenu = async (req, res, next) => {
    try {
        const { hostId } = req.params;
        const cacheKey = cacheService.formatKey('host_menu', hostId);
        const cached = await cacheService.get(cacheKey);
        if (cached) return res.status(200).json({ success: true, data: typeof cached === 'string' ? JSON.parse(cached) : cached });

        const SELECT = 'name price category image desc inStock';

        // ⚡ Single query — covers all items for this host (inStock or not)
        let items = await MenuItem.find({ hostId })
            .select(SELECT)
            .sort({ category: 1 })
            .lean();

        // Fallback: check venue (parallel venue lookup + query)
        if (items.length === 0) {
            const venue = await Venue.findOne({ hostId }).select('_id').lean();
            if (venue) {
                items = await MenuItem.find({ venueId: venue._id }).select(SELECT).sort({ category: 1 }).lean();
            }
        }

        // Map fields so frontend gets consistent shape
        const data = items.map(i => ({ ...i, type: i.category, description: i.desc || '' }));
        await cacheService.set(cacheKey, data, 600); // 10 min cache
        res.status(200).json({ success: true, data, count: data.length });
    } catch (err) { next(err); }
};

// ── PUBLIC: Get host's gifts by hostId (used post-booking) ───────────────────
export const getHostGifts = async (req, res, next) => {
    try {
        const { hostId } = req.params;
        if (!hostId) return res.status(200).json({ success: true, data: [] });

        const cacheKey = cacheService.formatKey('host_gifts', hostId);
        const cached = await cacheService.get(cacheKey);
        if (cached) return res.status(200).json({ success: true, data: typeof cached === 'string' ? JSON.parse(cached) : cached });

        const gifts = await Gift.find({ hostId, inStock: true, isDeleted: false })
            .select('name description price category image inStock')
            .sort({ category: 1 })
            .lean();

        await cacheService.set(cacheKey, gifts, 600); // 10 min cache
        res.status(200).json({ success: true, data: gifts });
    } catch (err) { next(err); }
};
