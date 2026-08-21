const express = require('express')
const router = express.Router()
const { createTournament, updateTournament, deleteTournament, openTournament, getTeamTournament, numberTeamRegistered, checkTournament } = require('../controllers/tournamentController')
const authMiddleware = require('../middlewares/authMiddleware')

router.post('/new', authMiddleware, createTournament)
router.patch('/update-tournament/:id', authMiddleware, updateTournament)
router.delete('/delete/:id', authMiddleware, deleteTournament)
router.get('/', authMiddleware, openTournament)
router.get('/:idTournament', authMiddleware, getTeamTournament)
router.get('/team-registered/:idTournament', authMiddleware, numberTeamRegistered)
router.get('/check/:idTeam', authMiddleware, checkTournament)

module.exports = router