const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
require('dotenv').config()

const User = require('../models/userModel')
const Team = require('../models/teamModel')
const Tournament = require('../models/tournamentModel')
const { updateRole } = require('../controllers/authController')
const { deleteTeam } = require('../controllers/teamController')
const { numberTeamRegistered } = require('../controllers/tournamentController')

const createMockRes = () => ({
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
})

describe('Administration Système - US14, US15, US16', () => {
    let userA, userB, adminUser, team, tournament

    before(async () => {
        if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI)
        await User.deleteMany({ email: { $in: ['test_us_a@example.com', 'test_us_b@example.com', 'test_us_admin@example.com'] } })

        userA = await User.create({ name: 'Alice', email: 'test_us_a@example.com', password: 'Password123!', role: ['user'] })
        userB = await User.create({ name: 'Bob', email: 'test_us_b@example.com', password: 'Password123!', role: ['user', 'player'] })
        adminUser = await User.create({ name: 'Admin Tester', email: 'test_us_admin@example.com', password: 'Password123!', role: ['user', 'admin'] })

        team = await Team.create({ title: 'Test Team Alpha', captain: userA._id })
        tournament = await Tournament.create({ title: 'Test Tournament Alpha Updated', game: 'Valorant', date: new Date(), rules: 'BO1', status: true, organizer: adminUser._id, team: [team._id] })
    })

    after(async () => {
        if (tournament?._id) await Tournament.findByIdAndDelete(tournament._id)
        if (team?._id) await Team.findByIdAndDelete(team._id)
        await User.deleteMany({ email: { $in: ['test_us_a@example.com', 'test_us_b@example.com', 'test_us_admin@example.com'] } })
        await mongoose.disconnect()
    })

    describe('US14 : Suppression d\'équipe (Admin)', () => {
        test('Delete team as admin', async () => {
            const disposableTeam = await Team.create({ title: 'Disposable Team For Deletion', captain: userA._id })
            const req = { params: { idTeam: disposableTeam._id }, user: { _id: adminUser._id } }
            const res = createMockRes()
            await deleteTeam(req, res)

            assert.strictEqual(res.statusCode, 200)
            const deleted = await Team.findById(disposableTeam._id)
            assert.strictEqual(deleted, null)
        })

        test('Delete team rejects if not admin', async () => {
            const disposableTeam = await Team.create({ title: 'Disposable Team Not Deleted', captain: userA._id })
            const req = { params: { idTeam: disposableTeam._id }, user: { _id: userA._id } }
            const res = createMockRes()
            await deleteTeam(req, res)
            assert.strictEqual(res.statusCode, 403)

            const stillThere = await Team.findById(disposableTeam._id)
            assert.ok(stillThere)
            await Team.findByIdAndDelete(disposableTeam._id)
        })

        test('Delete team rejects unknown team id', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = { params: { idTeam: fakeId }, user: { _id: adminUser._id } }
            const res = createMockRes()
            await deleteTeam(req, res)
            assert.strictEqual(res.statusCode, 404)
        })
    })

    describe('US15 : Statistiques d\'inscription (Admin)', () => {
        test('Admin sees number of teams registered to a tournament', async () => {
            const req = { params: { idTournament: tournament._id }, user: { _id: adminUser._id } }
            const res = createMockRes()
            await numberTeamRegistered(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.strictEqual(res.body.teamRegistered, 1)
            assert.strictEqual(res.body.tournament, 'Test Tournament Alpha Updated')
        })

        test('Rejects if not admin', async () => {
            const req = { params: { idTournament: tournament._id }, user: { _id: userA._id } }
            const res = createMockRes()
            await numberTeamRegistered(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Rejects unknown tournament', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = { params: { idTournament: fakeId }, user: { _id: adminUser._id } }
            const res = createMockRes()
            await numberTeamRegistered(req, res)
            assert.strictEqual(res.statusCode, 404)
        })

        test('Rejects missing tournament id', async () => {
            const req = { params: {}, user: { _id: adminUser._id } }
            const res = createMockRes()
            await numberTeamRegistered(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
    })

    describe('US16 : Gestion des rôles utilisateurs (Admin)', () => {
        test('Admin updates a user role', async () => {
            const adminDoc = await User.findById(adminUser._id)
            const req = { params: { id: userB._id }, body: { newRole: 'organizer' }, user: adminDoc }
            const res = createMockRes()
            await updateRole(req, res)

            assert.strictEqual(res.statusCode, 200)
            const updatedUserB = await User.findById(userB._id)
            assert.ok(updatedUserB.role.includes('organizer'))
            assert.ok(updatedUserB.role.includes('user'))
            assert.ok(updatedUserB.role.includes('player'))
        })

        test('Rejects if not admin', async () => {
            const userADoc = await User.findById(userA._id)
            const req = { params: { id: userB._id }, body: { newRole: 'organizer' }, user: userADoc }
            const res = createMockRes()
            await updateRole(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Rejects invalid role value', async () => {
            const adminDoc = await User.findById(adminUser._id)
            const req = { params: { id: userB._id }, body: { newRole: 'superhero' }, user: adminDoc }
            const res = createMockRes()
            await updateRole(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Rejects unknown user id', async () => {
            const adminDoc = await User.findById(adminUser._id)
            const fakeId = new mongoose.Types.ObjectId()
            const req = { params: { id: fakeId }, body: { newRole: 'player' }, user: adminDoc }
            const res = createMockRes()
            await updateRole(req, res)
            assert.strictEqual(res.statusCode, 404)
        })
    })
})