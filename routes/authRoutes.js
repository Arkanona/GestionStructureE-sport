const express = require('express')
const router = express.Router()
const { register, login, updateProfile } = require('../controllers/authController')
const authMiddleware = require('../middlewares/authMiddleware')

router.post('/register', register)
router.post('/login', login)
router.patch('/update-profile/:id',authMiddleware, updateProfile)

module.exports = router