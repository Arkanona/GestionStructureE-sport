const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
require('dotenv').config()

const User = require('../models/userModel')
const Team = require('../models/teamModel')
const Tournament = require('../models/tournamentModel')
const { inscriptionTournament, inscriptionTeamTournament } = require('../controllers/teamController')
const { getTeamTournament, checkTournament } = require('../controllers/tournamentController')

const createMockRes = () => ({
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
})

const createMockNext = () => {
    const next = () => { next.called = true }
    next.called = false
    return next
}

describe('Inscriptions & Suivi - US11, US13, US18', () => {
    let userA, userB, userAdmin, team, tournament

    before(async () => {
        if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI)
        await User.deleteMany({ email: { $in: ['test_us_a@example.com', 'test_us_b@example.com', 'test_us_admin@example.com'] } })

        userA = await User.create({ name: 'Captain Alice', email: 'test_us_a@example.com', password: 'Password123!', role: ['user', 'captain'] })
        userB = await User.create({ name: 'Player Bob', email: 'test_us_b@example.com', password: 'Password123!', role: ['user', 'player'] })
        userAdmin = await User.create({ name: 'Admin', email: 'test_us_admin@example.com', password: 'Password123!', role: ['user', 'admin'] })

        team = await Team.create({ title: 'Test Team Alpha', captain: userA._id, teammate: [userB._id] })
        tournament = await Tournament.create({ title: 'Test Tournament Alpha Updated', game: 'Valorant', date: new Date(), rules: 'BO3', status: true, organizer: userA._id })
    })

    after(async () => {
        if (team?._id) await Team.findByIdAndDelete(team._id)
        if (tournament?._id) await Tournament.findByIdAndDelete(tournament._id)
        await User.deleteMany({ email: { $in: ['test_us_a@example.com', 'test_us_b@example.com', 'test_us_admin@example.com'] } })
        await mongoose.disconnect()
    })

    describe('US11 : Inscription d\'une équipe à un tournoi', () => {
        test('Register team to tournament as captain', async () => {
            const req = { params: { idTeam: team._id, idTournament: tournament._id }, user: { _id: userA._id } }
            const res = createMockRes()
            const next = createMockNext()

            await inscriptionTournament(req, res, next)
            assert.strictEqual(next.called, true)
            assert.strictEqual(res.body, null)

            const updatedTeam = await Team.findById(team._id)
            assert.ok(updatedTeam.tournament.some(id => id.toString() === tournament._id.toString()))

            await inscriptionTeamTournament(req, res)
            assert.strictEqual(res.statusCode, 200)
            assert.ok(res.body.team.some(t => t._id.toString() === team._id.toString()))

            const updatedTournament = await Tournament.findById(tournament._id)
            assert.ok(updatedTournament.team.some(id => id.toString() === team._id.toString()))
        })

        test('Register rejects duplicate registration', async () => {
            const req = { params: { idTeam: team._id, idTournament: tournament._id }, user: { _id: userA._id } }
            const res = createMockRes()
            const next = createMockNext()

            await inscriptionTournament(req, res, next)
            assert.strictEqual(next.called, false)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Register rejects if user is not a team member', async () => {
            const req = { params: { idTeam: team._id, idTournament: tournament._id }, user: { _id: userAdmin._id } }
            const res = createMockRes()
            const next = createMockNext()

            await inscriptionTournament(req, res, next)
            assert.strictEqual(next.called, false)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Register rejects unknown team', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = { params: { idTeam: fakeId, idTournament: tournament._id }, user: { _id: userA._id } }
            const res = createMockRes()
            const next = createMockNext()

            await inscriptionTournament(req, res, next)
            assert.strictEqual(next.called, false)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Register rejects unknown tournament', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = { params: { idTeam: team._id, idTournament: fakeId }, user: { _id: userA._id } }
            const res = createMockRes()
            const next = createMockNext()

            await inscriptionTournament(req, res, next)
            assert.strictEqual(next.called, false)
            assert.strictEqual(res.statusCode, 404)
        })
    })

    describe('US13 : Consultation des équipes inscrites (Organisateur)', () => {
        test('Organizer sees registered teams', async () => {
            const req = { params: { idTournament: tournament._id }, user: { _id: userA._id } }
            const res = createMockRes()
            await getTeamTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(Array.isArray(res.body))
            assert.ok(res.body.some(t => t._id.toString() === team._id.toString()))
            assert.strictEqual(res.body.find(t => t._id.toString() === team._id.toString()).title, 'Test Team Alpha')
        })

        test('Rejects if not organizer', async () => {
            const req = { params: { idTournament: tournament._id }, user: { _id: userB._id } }
            const res = createMockRes()
            await getTeamTournament(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Rejects unknown tournament', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = { params: { idTournament: fakeId }, user: { _id: userA._id } }
            const res = createMockRes()
            await getTeamTournament(req, res)
            assert.strictEqual(res.statusCode, 404)
        })
    })

    describe('US18 : Consultation des tournois d\'une équipe', () => {
        test('Captain sees team\'s registered tournaments', async () => {
            const req = { params: { idTeam: team._id }, user: { _id: userA._id } }
            const res = createMockRes()
            await checkTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(Array.isArray(res.body))
            assert.ok(res.body.some(t => t._id.toString() === tournament._id.toString()))
            assert.strictEqual(res.body.find(t => t._id.toString() === tournament._id.toString()).title, 'Test Tournament Alpha Updated')
        })

        test('Teammate sees team\'s registered tournaments', async () => {
            const req = { params: { idTeam: team._id }, user: { _id: userB._id } }
            const res = createMockRes()
            await checkTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(res.body.some(t => t._id.toString() === tournament._id.toString()))
        })

        test('Rejects if user is not a member of the team', async () => {
            const req = { params: { idTeam: team._id }, user: { _id: userAdmin._id } }
            const res = createMockRes()
            await checkTournament(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Rejects unknown team id', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = { params: { idTeam: fakeId }, user: { _id: userA._id } }
            const res = createMockRes()
            await checkTournament(req, res)
            assert.strictEqual(res.statusCode, 404)
        })

        test('Rejects missing team id', async () => {
            const req = { params: {}, user: { _id: userA._id } }
            const res = createMockRes()
            await checkTournament(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
    })
})