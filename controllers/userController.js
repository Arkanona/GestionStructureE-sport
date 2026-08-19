const User = require('../models/userModel')

const profile = async (req, res) => {
    try {
        res.status(200).json({ user: req.user })
    } catch(err) {
        return res.status(500).json({ message: 'Server error fetching user profile', error: err.message})
    }
}


module.exports = {
    profile
}