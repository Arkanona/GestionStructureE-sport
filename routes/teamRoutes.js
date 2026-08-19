const express = require('express')
const router = express.Router()
const { createTeam, joinTeam } = require('../controllers/teamController')
const authMiddleware = require('../middlewares/authMiddleware')

router.post('/new', authMiddleware, createTeam)
router.patch('/join/:idTeam', authMiddleware, joinTeam)

module.exports = router