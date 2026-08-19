const mongoose = require('mongoose')

const tournamentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        unique: true
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
    }
})

module.exports = mongoose.model('Tournament', tournamentSchema)