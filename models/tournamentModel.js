const mongoose = require('mongoose')

const tournamentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    game: {
        type: String,
        required: [true, 'Game is required'],
        trim: true
    },
    date: {
        type: Date,
        required: [true, 'Date is required']
    },
    rules: {
        type: String,
        required: true
    },
    organizer: {
        type: mongoose.Schema.ObjectId, 
        ref: 'User',
        required: true
    },
    team: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team',
            required: [true, 'Team is required']
        }],
    status: {
        type: Boolean,
        required: [true, 'The status open / close is required'],
        default: false
    }
})

module.exports = mongoose.model('Tournament', tournamentSchema)