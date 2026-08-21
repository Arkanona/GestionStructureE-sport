const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
require('dotenv').config()

const User = require('../models/userModel')
const { updateProfile, login } = require('../controllers/authController')

const createMockRes = () => ({
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
})

describe('Gestion du Profil Utilisateur - US4', () => {
    let user

    before(async () => {
        if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI)
        await User.deleteMany({ email: { $in: ['test_profile@example.com', 'test_profile_updated@example.com'] } })
        user = await User.create({
            name: 'Original Name',
            email: 'test_profile@example.com',
            password: 'Password123!',
            role: ['user']
        })
    })

    after(async () => {
        await User.deleteMany({ email: { $in: ['test_profile@example.com', 'test_profile_updated@example.com'] } })
        await mongoose.disconnect()
    })

    describe('US4 : Mise à jour du profil', () => {
        test('Update Profile : Modification du nom', async () => {
            const req = {
                params: { id: user._id },
                body: { newName: 'Updated Name' }
            }
            const res = createMockRes()
            await updateProfile(req, res)

            assert.strictEqual(res.statusCode, 200)
            const updatedUser = await User.findById(user._id)
            assert.strictEqual(updatedUser.name, 'Updated Name')
        })

        test('Update Profile : Modification de l\'adresse email', async () => {
            const req = {
                params: { id: user._id },
                body: { newEmail: 'test_profile_updated@example.com' }
            }
            const res = createMockRes()
            await updateProfile(req, res)

            assert.strictEqual(res.statusCode, 200)
            const updatedUser = await User.findById(user._id)
            assert.strictEqual(updatedUser.email, 'test_profile_updated@example.com')
        })

        test('Update Profile : Modification du mot de passe et vérification au login', async () => {
            const req = {
                params: { id: user._id },
                body: { newPassword: 'NewPassword123!' }
            }
            const res = createMockRes()
            await updateProfile(req, res)

            assert.strictEqual(res.statusCode, 200)

            const loginReq = {
                body: { email: 'test_profile_updated@example.com', password: 'NewPassword123!' }
            }
            const loginRes = createMockRes()
            await login(loginReq, loginRes)

            assert.strictEqual(loginRes.statusCode, 200)
        })

        test('Update Profile : Erreur 404 sur un identifiant utilisateur inexistant', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = {
                params: { id: fakeId },
                body: { newName: 'Ghost' }
            }
            const res = createMockRes()
            await updateProfile(req, res)

            assert.strictEqual(res.statusCode, 404)
        })
    })
})