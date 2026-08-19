const Tournament = require('../models/tournamentModel')
const User = require('../models/userModel')
const formatDate = require('../helpers/formatDate')


//US8
exports.createTournament = async (req, res) => {
    try{
        const { title, game, date, rules } = req.body

        if(!title){
            res.status(400).json({ error: 'You must provide title'})
        }
        const existingTitle = await Team.findOne({ title })
        if(existingTitle){
            return res.status(400).json({ message: 'Title already exist'})
        }

        if(!game){
            res.status(400).json({ error: 'You must provide game'})
        }

        if(!date){
            res.status(400).json({ error: 'You must provide date'})
        }

        if(!rules){
            res.status(400).json({ error: 'You must provide rules'})
        }

        const tournament = new Tournament({
            title,
            game,
            date,
            rules,
            organizer: req.user._id
        })

        const newTournament = await tournament.save()
        const objTournament = newTournament.toObject()
        objTournament.date = formatDate(newTournament.date)
        res.status(201).json(objTournament)

    } catch(err) {
        res.status(500).json({ message: err.message})
    }
}