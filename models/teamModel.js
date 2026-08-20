const mongoose = require('mongoose')

const teamSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        unique: true
    },
    captain: {
        type: mongoose.Schema.ObjectId, 
        ref: 'User',
        required: true
    },
    teammate: {
        type: Array,
        default: []
    },
    tournament: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: [true, 'Tournament is required']
    }
})

module.exports = mongoose.model('Team', teamSchema)