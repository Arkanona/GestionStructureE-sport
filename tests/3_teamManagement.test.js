const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
require('dotenv').config()

const User = require('../models/userModel')
const Team = require('../models/teamModel')
const { createTeam, joinTeam, inviteTeammate, removeTeammate, checkTeam } = require('../controllers/teamController')

const createMockRes = () => ({
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
})

describe('Gestion des Équipes & Membres - US5, US6, US7, US17', () => {
    let userA, userB, userAdmin, team

    before(async () => {
        if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI)
        await User.deleteMany({ email: { $in: ['test_us_a@example.com', 'test_us_b@example.com', 'test_us_admin@example.com'] } })
        await Team.deleteMany({ title: 'Test Team Alpha' })

        userA = await User.create({ name: 'Alice Tester', email: 'test_us_a@example.com', password: 'Password123!', role: ['user'] })
        userB = await User.create({ name: 'Bob Collaborator', email: 'test_us_b@example.com', password: 'Password123!', role: ['user'] })
        userAdmin = await User.create({ name: 'Admin Tester', email: 'test_us_admin@example.com', password: 'Password123!', role: ['user', 'admin'] })
    })

    after(async () => {
        if (team?._id) await Team.findByIdAndDelete(team._id)
        await User.deleteMany({ email: { $in: ['test_us_a@example.com', 'test_us_b@example.com', 'test_us_admin@example.com'] } })
        await mongoose.disconnect()
    })

    describe('US5 : Création d\'équipe', () => {
        test('Create team as captain', async () => {
            const req = { body: { title: 'Test Team Alpha' }, user: { _id: userA._id } }
            const res = createMockRes()
            await createTeam(req, res)

            assert.strictEqual(res.statusCode, 201)
            assert.strictEqual(res.body.title, 'Test Team Alpha')
            assert.strictEqual(res.body.captain.toString(), userA._id.toString())
            assert.deepStrictEqual(res.body.teammate, [])

            const updatedUserA = await User.findById(userA._id)
            assert.ok(updatedUserA.role.includes('captain'))
            assert.ok(updatedUserA.role.includes('user'))

            team = res.body
        })

        test('Create team rejects duplicate title', async () => {
            const req = { body: { title: 'Test Team Alpha' }, user: { _id: userA._id } }
            const res = createMockRes()
            await createTeam(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Create team rejects missing title', async () => {
            const req = { body: {}, user: { _id: userA._id } }
            const res = createMockRes()
            await createTeam(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
    })

    describe('US6 : Rejoindre une équipe', () => {
        test('Join team adds teammate and grants player role', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { title: 'Test Team Alpha', email: 'test_us_b@example.com' }
            }
            const res = createMockRes()
            await joinTeam(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(res.body.teammate.some(id => id.toString() === userB._id.toString()))

            const updatedUserB = await User.findById(userB._id)
            assert.ok(updatedUserB.role.includes('player'))
            assert.ok(updatedUserB.role.includes('user'))
        })

        test('Join team rejects duplicate membership', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { title: 'Test Team Alpha', email: 'test_us_b@example.com' }
            }
            const res = createMockRes()
            await joinTeam(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Join team rejects unknown team title', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { title: 'Nonexistent Team', email: 'test_us_b@example.com' }
            }
            const res = createMockRes()
            await joinTeam(req, res)
            assert.strictEqual(res.statusCode, 404)
        })

        test('Join team rejects unknown user email', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { title: 'Test Team Alpha', email: 'ghost@example.com' }
            }
            const res = createMockRes()
            await joinTeam(req, res)
            assert.strictEqual(res.statusCode, 404)
        })

        test('Join team rejects missing email', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { title: 'Test Team Alpha' }
            }
            const res = createMockRes()
            await joinTeam(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
    })

    describe('US7 : Gestion des coéquipiers (invitation et suppression)', () => {
        test('Remove teammate as captain', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'test_us_b@example.com' },
                user: { _id: userA._id }
            }
            const res = createMockRes()
            await removeTeammate(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(!res.body.teammate.some(id => id.toString() === userB._id.toString()))

            const updatedUserB = await User.findById(userB._id)
            assert.ok(!updatedUserB.role.includes('player'))
            assert.ok(updatedUserB.role.includes('user'))
        })

        test('Remove teammate rejects if not captain', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'test_us_a@example.com' },
                user: { _id: userB._id }
            }
            const res = createMockRes()
            await removeTeammate(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Remove teammate rejects unknown user email', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'ghost@example.com' },
                user: { _id: userA._id }
            }
            const res = createMockRes()
            await removeTeammate(req, res)
            assert.strictEqual(res.statusCode, 404)
        })

        test('Invite teammate as captain', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'test_us_b@example.com' },
                user: { _id: userA._id }
            }
            const res = createMockRes()
            await inviteTeammate(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(res.body.teammate.some(id => id.toString() === userB._id.toString()))

            const updatedUserB = await User.findById(userB._id)
            assert.ok(updatedUserB.role.includes('player'))
        })

        test('Invite teammate rejects duplicate membership', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'test_us_b@example.com' },
                user: { _id: userA._id }
            }
            const res = createMockRes()
            await inviteTeammate(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Invite teammate rejects if not captain', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'test_us_a@example.com' },
                user: { _id: userB._id }
            }
            const res = createMockRes()
            await inviteTeammate(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Invite teammate rejects unknown user email', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'ghost@example.com' },
                user: { _id: userA._id }
            }
            const res = createMockRes()
            await inviteTeammate(req, res)
            assert.strictEqual(res.statusCode, 404)
        })

        test('Invite teammate rejects missing team id', async () => {
            const req = {
                params: {},
                body: { email: 'test_us_b@example.com' },
                user: { _id: userA._id }
            }
            const res = createMockRes()
            await inviteTeammate(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
    })

    describe('US17 : Consultation des détails d\'une équipe', () => {
        test('Captain views team details', async () => {
            const req = { params: { idTeam: team._id }, user: { _id: userA._id } }
            const res = createMockRes()
            await checkTeam(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.strictEqual(res.body._id.toString(), team._id.toString())
            assert.strictEqual(res.body.title, 'Test Team Alpha')
        })

        test('Player views team details', async () => {
            const req = { params: { idTeam: team._id }, user: { _id: userB._id } }
            const res = createMockRes()
            await checkTeam(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.strictEqual(res.body._id.toString(), team._id.toString())
        })

        test('Rejects if user has neither player nor captain role', async () => {
            const req = { params: { idTeam: team._id }, user: { _id: userAdmin._id } }
            const res = createMockRes()
            await checkTeam(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Rejects unknown team id', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = { params: { idTeam: fakeId }, user: { _id: userA._id } }
            const res = createMockRes()
            await checkTeam(req, res)
            assert.strictEqual(res.statusCode, 404)
        })

        test('Rejects missing team id', async () => {
            const req = { params: {}, user: { _id: userA._id } }
            const res = createMockRes()
            await checkTeam(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
    })
})