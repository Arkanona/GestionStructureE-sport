const Tournament = require('../models/tournamentModel')
const User = require('../models/userModel')
const {formatDate} = require('../helpers/formatDate')


//US8
exports.createTournament = async (req, res) => {
    try{
        const { title, game, date, rules } = req.body

        if(!title){
            res.status(400).json({ error: 'You must provide title'})
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

//US9 A COMPLÉTER
exports.updateTournament = async (req, res) => {
    try{
        const tournamentId = req.params.id || req.params.tournamentId
        const { newTitle, newGame, newDate, newRules } = req.body

        const tournament = await Tournament.findById(tournamentId)
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" })
        }

        if (newTitle) {
            tournament.title = newTitle
        }

        if (newGame) {
            tournament.game = newGame
        }

        if (newDate) {
            tournament.date = newDate
        }

        if (newRules) {
            tournament.rules = newRules
        }

        // if (!newTitle) {
        //     return res.status(404).json({ message: "Use 'newTitle' for update" })
        // }

        // if (!newGame) {
        //     return res.status(404).json({ message: "Use 'newGame' for update" })
        // }

        // if (!newDate) {
        //     return res.status(404).json({ message: "Use 'newDate' for update" })
        // }

        // if (!newRules) {
        //     return res.status(404).json({ message: "Use 'newRules' for update" })
        // }

        if(tournament.organizer.toString() !== req.user._id.toString()){
            return res.status(403).json({ message: 'Only organizer can update'})
        }

        await tournament.save()

        res.status(200).json({ message: "Tournament update !" })
    } catch(err){
        res.status(500).json({ message: err.message})
    }
}

//US10
exports.deleteTournament = async (req, res) => {
    try {
        const idTournament = req.params.id || req.params.idTournament

        if (!idTournament) {
            return res.status(400).json({ message: 'Tournament ID is required' })
        }

        const tournament = await Tournament.findById(idTournament)

        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found or already deleted" })
        }

        const user = await User.findById(req.user._id)
        
        const isOrganizer = tournament.organizer.toString() === req.user._id.toString()
        const isAdmin = user && user.admin === true 

        if (!isOrganizer && !isAdmin) {
            return res.status(403).json({ message: 'Only organizer or admin can remove a tournament' })
        }

        await Tournament.findByIdAndDelete(idTournament)

        return res.status(200).json({ message: "Tournament successfully deleted !" })

    } catch (err) {
        return res.status(500).json({ message: err.message })
    }
}
