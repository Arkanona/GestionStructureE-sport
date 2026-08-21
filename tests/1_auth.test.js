//US1 & 2
const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
require('dotenv').config()

const User = require('../models/userModel')
const { register, login } = require('../controllers/authController')

const createMockRes = () => ({
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
})

describe('Authentification - US1 & US2', () => {

    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI)
        }
        await User.deleteMany({ email: { $in: ['test_auth@example.com', 'weakpass@example.com'] } })
    })

    after(async () => {
        await User.deleteMany({ email: { $in: ['test_auth@example.com', 'weakpass@example.com'] } })
        await mongoose.disconnect()
    })

    describe('US1 : Inscription utilisateur (Register)', () => {
        test('Register : Inscription réussie d\'un utilisateur valide', async () => {
            const req = {
                body: { name: 'Alice Tester', email: 'test_auth@example.com', password: 'Password123!' }
            }
            const res = createMockRes()
            await register(req, res)

            assert.strictEqual(res.statusCode, 201)
            assert.ok(res.body.token)
            assert.strictEqual(res.body.user.email, 'test_auth@example.com')
        })

        test('Register : Rejet si l\'email est déjà utilisé', async () => {
            const req = {
                body: { name: 'Alice Dup', email: 'test_auth@example.com', password: 'Password123!' }
            }
            const res = createMockRes()
            await register(req, res)

            assert.strictEqual(res.statusCode, 400)
        })

        test('Register : Rejet en cas de mot de passe trop faible', async () => {
            const req = {
                body: { name: 'Weak Pass', email: 'weakpass@example.com', password: '123' }
            }
            const res = createMockRes()
            await register(req, res)

            assert.strictEqual(res.statusCode, 400)
        })
    })

    describe('US2 : Connexion utilisateur (Login)', () => {
        test('Login : Connexion réussie avec identifiants valides', async () => {
            const req = {
                body: { email: 'test_auth@example.com', password: 'Password123!' }
            }
            const res = createMockRes()
            await login(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(res.body.token)
        })

        test('Login : Rejet en cas de mauvais mot de passe', async () => {
            const req = {
                body: { email: 'test_auth@example.com', password: 'WrongPassword!' }
            }
            const res = createMockRes()
            await login(req, res)

            assert.strictEqual(res.statusCode, 401)
        })
    })
})