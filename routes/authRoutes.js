const express = require('express')
const router = express.Router()
const { register, login, updateProfile, updateRole } = require('../controllers/authController')
const authMiddleware = require('../middlewares/authMiddleware')

router.post('/register', register)
router.post('/login', login)
router.patch('/update-profile/:id',authMiddleware, updateProfile)
router.patch('/update-role/:id', authMiddleware, updateRole)

module.exports = router