import { Event } from '../shared/models/Event.js';
import { Booking } from '../shared/models/booking.model.js';

export const getDashboardSummary = async (req, res, next) => {
    const hostId = req.user.id;

    try {
        // [SCALABLE] Query DB explicitly for what's needed, preventing memory overflow
        const [totalBookings, eventsStats, upcomingEvents] = await Promise.all([
            Booking.countDocuments({ hostId }),
            
            // Calculate capacity across events without loading full documents
            Event.aggregate([
                { $match: { hostId: hostId, status: { $ne: 'cancelled' } } },
                { $unwind: "$tickets" },
                { $group: {
                    _id: null,
                    totalCapacity: { $sum: "$tickets.capacity" },
                    totalSold: { $sum: "$tickets.sold" }
                }}
            ]),

            Event.find({ hostId, date: { $gte: new Date() } })
                 .sort({ date: 1 }) // Closest upcoming first
                 .limit(5)
                 .select('title date status coverImage attendeeCount')
                 .lean()
        ]);

        const capacityData = eventsStats[0] || { totalCapacity: 0, totalSold: 0 };
        const capacityUsage = capacityData.totalCapacity > 0
            ? Math.round((capacityData.totalSold / capacityData.totalCapacity) * 100) + '%'
            : '0%';

        res.status(200).json({
            success: true,
            stats: {
                totalBookings,
                upcomingEventsCount: upcomingEvents.length,
                capacityUsage
            },
            upcomingEvents
        });
    } catch (error) {
        next(error);
    }
};
