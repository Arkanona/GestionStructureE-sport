const express = require('express')
const router = express.Router()
const { createTeam, joinTeam, inviteTeammate, removeTeammate, inscriptionTournament, inscriptionTeamTournament } = require('../controllers/teamController')
const authMiddleware = require('../middlewares/authMiddleware')

router.post('/new', authMiddleware, createTeam)
router.patch('/join/:idTeam', authMiddleware, joinTeam)
router.patch('/invite/:idTeam', authMiddleware, inviteTeammate)
router.patch('/remove/:idTeam', authMiddleware, removeTeammate)
router.patch('/add-team/:idTeam/:idTournament', authMiddleware, inscriptionTournament, inscriptionTeamTournament)

module.exports = router