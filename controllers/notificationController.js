const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20); 

        const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

        res.status(200).json({ success: true, count: unreadCount, data: notifications });
    } catch (error) { res.status(500).json({ success: false, message: 'Server Error' }); }
};

exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

        if (!notification.isRead) {
            notification.isRead = true;
            await notification.save();
        }
        res.status(200).json({ success: true, data: notification });
    } catch (error) { res.status(500).json({ success: false, message: 'Server Error' }); }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } });
        res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) { res.status(500).json({ success: false, message: 'Server Error' }); }
};