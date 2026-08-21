const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
require('dotenv').config()

const User = require('../models/userModel')
const Team = require('../models/teamModel')
const Tournament = require('../models/tournamentModel')
const { register, login, updateProfile, updateRole } = require('../controllers/authController')


// Helpers
const createMockRes = () => {
    const res = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code
            return this
        },
        json(data) {
            this.body = data
            return this
        }
    }
    return res
}

const createMockNext = () => {
    const next = () => { next.called = true }
    next.called = false
    return next
}

describe('Tests de recette de l\'API', () => {
    let userA, userB, tokenA, tokenB, team, tournament, userAdminId

    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI)
        }
        await User.deleteMany({ email: { $in: ['test_us_a@example.com', 'test_us_b@example.com', 'test_us_admin@example.com'] } })
        await Team.deleteMany({ title: { $in: ['Test Team Alpha', 'Test Team Duplicate'] } })
    })

    after(async () => {
        if (tournament?._id) {
            await Tournament.findByIdAndDelete(tournament._id)
        }
        if (team?._id) {
            await Team.findByIdAndDelete(team._id)
        }
        await User.deleteMany({ email: { $in: ['test_us_a@example.com', 'test_us_b@example.com', 'test_us_admin@example.com'] } })
        await mongoose.disconnect()
    })

        describe('US8 : Création de tournoi', () => {
            test('Create tournament as organizer (status open)', async () => {
                const req = {
                    body: {
                        title: 'Test Tournament Alpha',
                        game: 'Valorant',
                        date: '2026-09-15',
                        rules: 'Best of 3, single elimination',
                        status: 'open'
                    },
                    user: { _id: userA.id }
                }
                const res = createMockRes()
                await createTournament(req, res)
    
                assert.strictEqual(res.statusCode, 201)
                assert.strictEqual(res.body.title, 'Test Tournament Alpha')
                assert.strictEqual(res.body.status, true)
                assert.strictEqual(res.body.organizer.toString(), userA.id.toString())
                assert.strictEqual(res.body.date, new Date('2026-09-15').toLocaleDateString('fr-FR'))
    
                tournament = res.body
            })
    
            test('Create tournament with status close', async () => {
                const req = {
                    body: {
                        title: 'Test Tournament Closed',
                        game: 'Valorant',
                        date: '2026-10-01',
                        rules: 'Round robin',
                        status: 'close'
                    },
                    user: { _id: userA.id }
                }
                const res = createMockRes()
                await createTournament(req, res)
    
                assert.strictEqual(res.statusCode, 201)
                assert.strictEqual(res.body.status, false)
    
                await Tournament.findByIdAndDelete(res.body._id)
            })
    
            test('Create tournament rejects missing title', async () => {
                const req = {
                    body: { game: 'Valorant', date: '2026-09-15', rules: 'Best of 3', status: 'open' },
                    user: { _id: userA.id }
                }
                const res = createMockRes()
                await createTournament(req, res)
                assert.strictEqual(res.statusCode, 400)
            })
    
            test('Create tournament rejects missing game', async () => {
                const req = {
                    body: { title: 'No Game', date: '2026-09-15', rules: 'Best of 3', status: 'open' },
                    user: { _id: userA.id }
                }
                const res = createMockRes()
                await createTournament(req, res)
                assert.strictEqual(res.statusCode, 400)
            })
    
            test('Create tournament rejects missing date', async () => {
                const req = {
                    body: { title: 'No Date', game: 'Valorant', rules: 'Best of 3', status: 'open' },
                    user: { _id: userA.id }
                }
                const res = createMockRes()
                await createTournament(req, res)
                assert.strictEqual(res.statusCode, 400)
            })
    
            test('Create tournament rejects missing rules', async () => {
                const req = {
                    body: { title: 'No Rules', game: 'Valorant', date: '2026-09-15', status: 'open' },
                    user: { _id: userA.id }
                }
                const res = createMockRes()
                await createTournament(req, res)
                assert.strictEqual(res.statusCode, 400)
            })
    
            test('Create tournament rejects missing status', async () => {
                const req = {
                    body: { title: 'No Status', game: 'Valorant', date: '2026-09-15', rules: 'Best of 3' },
                    user: { _id: userA.id }
                }
                const res = createMockRes()
                await createTournament(req, res)
                assert.strictEqual(res.statusCode, 400)
            })
    
            test('Create tournament rejects invalid status value', async () => {
                const req = {
                    body: { title: 'Bad Status', game: 'Valorant', date: '2026-09-15', rules: 'Best of 3', status: 'maybe' },
                    user: { _id: userA.id }
                }
                const res = createMockRes()
                await createTournament(req, res)
                assert.strictEqual(res.statusCode, 400)
            })
        })
})