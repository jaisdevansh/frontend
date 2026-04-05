import fs from 'fs';

const path = 'c:/Users/devan/Downloads/stitch_curated_discovery/codebase/backend/controllers/user.controller.js';
let content = fs.readFileSync(path, 'utf8');

// The function is from line 733 to 770 in my view (1-indexed).
// Let's use a regex to find and replace the whole function.
const searchPattern = /export const getMenuItems = async \(req, res, next\) => \{[\s\S]*?next\(err\);\s*\}\s*\};/;
const replacement = `export const getMenuItems = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId).lean();
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const [specificItems, venue] = await Promise.all([
            MenuItem.find({ eventId }).lean(),
            Venue.findOne({ hostId: event.hostId }).lean()
        ]);
        
        const venueMenu = venue?.menu || [];

        const merged = [
            ...specificItems.map(i => ({
                _id: i._id,
                name: i.name,
                type: 'Drink',
                description: i.desc || '',
                price: i.price || 1500,
                image: '',
            })),
            ...venueMenu.map(v => ({
                _id: v._id,
                name: v.name,
                type: v.type || 'Cocktail',
                description: v.description || '',
                price: v.price || 1500,
                image: v.image || '',
            }))
        ];

        res.status(200).json({ success: true, message: 'Menu fetched', data: merged });
    } catch (err) {
        next(err);
    }
};`;

if (content.match(searchPattern)) {
    content = content.replace(searchPattern, replacement);
    fs.writeFileSync(path, content);
    console.log('Successfully updated getMenuItems');
} else {
    console.error('Could not find getMenuItems with regex');
    // Try a simpler regex
    const simplePattern = /export const getMenuItems = async \(req, res, next\) => \{[\s\S]*?res\.status\(200\)\.json\(\{ success: true, message: 'Menu fetched', data: merged \}\);[\s\S]*?catch \(err\) \{[\s\S]*?next\(err\);[\s\S]*?\}[\s\S]*?\};/;
    if (content.match(simplePattern)) {
        content = content.replace(simplePattern, replacement);
        fs.writeFileSync(path, content);
        console.log('Successfully updated getMenuItems with simple regex');
    } else {
        console.error('Could not find getMenuItems even with simple regex');
    }
}
