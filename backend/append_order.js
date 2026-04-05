import fs from 'fs';
const path = 'c:/Users/devan/Downloads/stitch_curated_discovery/codebase/backend/controllers/user.controller.js';
const content = `

export const getMyFoodOrders = async (req, res, next) => {
    try {
        const { FoodOrder } = await import('../models/FoodOrder.js');
        const orders = await FoodOrder.find({ 
            userId: req.user.id,
            status: { $ne: 'payment_pending' } 
        }).sort({ createdAt: -1 }).limit(10).lean();
        
        res.status(200).json({ success: true, data: orders });
    } catch (err) {
        next(err);
    }
};`;

fs.appendFileSync(path, content);
console.log('Appended getMyFoodOrders');
