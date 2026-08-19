const express = require('express')
const router = express.Router()
const { createTournament } = require('../controllers/tournamentController')
const authMiddleware = require('../middlewares/authMiddleware')

router.post('/new', authMiddleware, createTournament)
module.exports = router