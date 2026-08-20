const express = require('express')
const router = express.Router()
const { createTournament, updateTournament, deleteTournament, openTournament, inscriptionTeamTournament, numberTeamRegistered } = require('../controllers/tournamentController')
const authMiddleware = require('../middlewares/authMiddleware')

router.post('/new', authMiddleware, createTournament)
router.patch('/update-tournament/:id', authMiddleware, updateTournament)
router.delete('/delete/:id', authMiddleware, deleteTournament)
router.get('/', authMiddleware, openTournament)
router.get('/:idTournament', authMiddleware, inscriptionTeamTournament)
router.get('/team-registered/:idTournament', authMiddleware, numberTeamRegistered)

module.exports = router