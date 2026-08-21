const Tournament = require('../models/tournamentModel')
const User = require('../models/userModel')
const Team = require('../models/teamModel')
const { formatDate } = require('../helpers/formatDate')
const { isTeamTeammate } = require('../helpers/teamHelpers')


//US8 & US12 for the status of the tournament
exports.createTournament = async (req, res) => {
    try{
        const { title, game, date, rules, status } = req.body

        if(!title){
            return res.status(400).json({ error: 'You must provide title'})
        }

        if(!game){
            return res.status(400).json({ error: 'You must provide game'})
        }

        if(!date){
            return res.status(400).json({ error: 'You must provide date'})
        }

        if(!rules){
            return res.status(400).json({ error: 'You must provide rules'})
        }

        if(!status){
            return res.status(400).json({ error: 'You need to provide status on "open" or "close"'})
        }
        
        const tournament = new Tournament({
            title,
            game,
            date,
            rules,
            status,
            organizer: req.user._id
        })
        
        if (status === 'open' || status === 'close') {
            tournament.status = (status === 'open') 

        } else {
            return res.status(400).json({ message: 'You need to provide status on "open" or "close"' })
        }

        const newTournament = await tournament.save()
        const objTournament = newTournament.toObject()
        objTournament.date = formatDate(newTournament.date)
        res.status(201).json(objTournament)

    } catch(err) {
        res.status(500).json({ message: err.message})
    }
}

//US9
exports.updateTournament = async (req, res) => {
    try{
        const tournamentId = req.params.id || req.params.tournamentId
        const { newTitle, newGame, newDate, newRules, newStatus } = req.body

        const tournament = await Tournament.findById(tournamentId)
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" })
        }
        if(tournament.organizer.toString() !== req.user._id.toString()){
            return res.status(403).json({ message: 'Only organizer can update'})
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
       
        if (newStatus !== undefined) {
            if (newStatus === 'open' || newStatus === 'close') {
                tournament.status = (newStatus === 'open')
            } else {
                return res.status(400).json({ message: 'You need to provide status on "open" or "close"' })
            }
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
        const isAdmin = user && user.role.includes('admin')

        if (!isOrganizer && !isAdmin) {
            return res.status(403).json({ message: 'Only organizer or admin can remove a tournament' })
        }

        await Tournament.findByIdAndDelete(idTournament)

        return res.status(200).json({ message: "Tournament successfully deleted !" })

    } catch (err) {
        return res.status(500).json({ message: err.message })
    }
}

//US12
exports.openTournament = async (req, res) => {
    try{
        const isOpenTournament = await Tournament.find({
            $or: [
                { status: true }
            ]
        })

        res.status(200).json(isOpenTournament || [])
    }catch(err){
        return res.status(500).json({ message: err.message })
    }
}

//US13
exports.getTeamTournament = async (req, res) => {
    try {
        const idTournament = req.params.id || req.params.idTournament

        const tournament = await Tournament.findById(idTournament).populate('team')
        
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' })
        }

        const isOrganizer = tournament.organizer.toString() === req.user._id.toString()

        if (!isOrganizer) {
            return res.status(403).json({ message: 'Only the organizer can see the registered teams.' })
        }

        res.status(200).json(tournament.team || [])

    } catch (err) {
        return res.status(500).json({ message: err.message })
    }
}

//US15
exports.numberTeamRegistered = async (req, res) => {
    try{
        const idTournament = req.params.idTournament

        if(!idTournament){
            return res.status(400).json({ message: 'Tournament ID is required'})
        }

        const tournament = await Tournament.findById(idTournament)
        if(!tournament){
            return res.status(404).json({ message: 'Tournament not found'})
        }

        const user = await User.findById(req.user._id)
        const isAdmin = user && user.role.includes('admin')

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can see the registered team' })
        }

        res.status(200).json({
            tournament: tournament.title,
            teamRegistered: tournament.team.length
        })
    }catch(err){
        return res.status(500).json({ message: err.message })
    }
}

//US18
exports.checkTournament = async (req, res) => {
    try{
        const idTeam = req.params.idTeam
        if(!idTeam){
            return res.status(400).json({ message: 'Team ID is required'})
        }

        const team = await Team.findById(idTeam).populate('tournament', 'title game date status')
        if(!team){
            return res.status(404).json({ message: 'Team not found' })
        }

        if(!isTeamTeammate(team, req.user._id)){
            return res.status(403).json({ message: 'Only members of this team can see its registered tournaments' })
        }

        res.status(200).json(team.tournament)
    }catch(err){
        return res.status(500).json({ message: err.message })
    }
}