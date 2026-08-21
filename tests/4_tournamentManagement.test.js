const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
require('dotenv').config()

const User = require('../models/userModel')
const Tournament = require('../models/tournamentModel')
const { createTournament, updateTournament, deleteTournament, openTournament } = require('../controllers/tournamentController')

const createMockRes = () => ({
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
})

describe('Organisation des Tournois - US8, US9, US10, US12', () => {
    let userA, userB, userAdmin, tournament

    before(async () => {
        if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI)
        await User.deleteMany({ email: { $in: ['test_us_a@example.com', 'test_us_b@example.com', 'test_us_admin@example.com'] } })
        
        userA = await User.create({ name: 'Alice Organizer', email: 'test_us_a@example.com', password: 'Password123!', role: ['user', 'organizer'] })
        userB = await User.create({ name: 'Bob Normal', email: 'test_us_b@example.com', password: 'Password123!', role: ['user'] })
        userAdmin = await User.create({ name: 'Admin Tester', email: 'test_us_admin@example.com', password: 'Password123!', role: ['user', 'admin'] })
    })

    after(async () => {
        if (tournament?._id) await Tournament.findByIdAndDelete(tournament._id)
        await User.deleteMany({ email: { $in: ['test_us_a@example.com', 'test_us_b@example.com', 'test_us_admin@example.com'] } })
        await mongoose.disconnect()
    })

    describe('US8 : Création de tournoi', () => {
        test('Create tournament as organizer (status open)', async () => {
            const req = {
                body: { title: 'Test Tournament Alpha', game: 'Valorant', date: '2026-09-15', rules: 'Best of 3, single elimination', status: 'open' },
                user: { _id: userA._id }
            }
            const res = createMockRes()
            await createTournament(req, res)

            assert.strictEqual(res.statusCode, 201)
            assert.strictEqual(res.body.title, 'Test Tournament Alpha')
            assert.strictEqual(res.body.status, true)
            assert.strictEqual(res.body.organizer.toString(), userA._id.toString())
            assert.strictEqual(res.body.date, new Date('2026-09-15').toLocaleDateString('fr-FR'))

            tournament = res.body
        })

        test('Create tournament with status close', async () => {
            const req = {
                body: { title: 'Test Tournament Closed', game: 'Valorant', date: '2026-10-01', rules: 'Round robin', status: 'close' },
                user: { _id: userA._id }
            }
            const res = createMockRes()
            await createTournament(req, res)

            assert.strictEqual(res.statusCode, 201)
            assert.strictEqual(res.body.status, false)

            await Tournament.findByIdAndDelete(res.body._id)
        })

        test('Create tournament rejects missing title', async () => {
            const req = { body: { game: 'Valorant', date: '2026-09-15', rules: 'Best of 3', status: 'open' }, user: { _id: userA._id } }
            const res = createMockRes()
            await createTournament(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Create tournament rejects missing game', async () => {
            const req = { body: { title: 'No Game', date: '2026-09-15', rules: 'Best of 3', status: 'open' }, user: { _id: userA._id } }
            const res = createMockRes()
            await createTournament(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Create tournament rejects missing date', async () => {
            const req = { body: { title: 'No Date', game: 'Valorant', rules: 'Best of 3', status: 'open' }, user: { _id: userA._id } }
            const res = createMockRes()
            await createTournament(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Create tournament rejects missing rules', async () => {
            const req = { body: { title: 'No Rules', game: 'Valorant', date: '2026-09-15', status: 'open' }, user: { _id: userA._id } }
            const res = createMockRes()
            await createTournament(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Create tournament rejects missing status', async () => {
            const req = { body: { title: 'No Status', game: 'Valorant', date: '2026-09-15', rules: 'Best of 3' }, user: { _id: userA._id } }
            const res = createMockRes()
            await createTournament(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Create tournament rejects invalid status value', async () => {
            const req = { body: { title: 'Bad Status', game: 'Valorant', date: '2026-09-15', rules: 'Best of 3', status: 'maybe' }, user: { _id: userA._id } }
            const res = createMockRes()
            await createTournament(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
    })

    describe('US12 : Consultation des tournois ouverts', () => {
        test('List open tournaments includes our tournament', async () => {
            const req = {}
            const res = createMockRes()
            await openTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(Array.isArray(res.body))
            assert.ok(res.body.some(t => t._id.toString() === tournament._id.toString()))
            assert.ok(res.body.every(t => t.status === true))
        })

        test('List open tournaments excludes closed tournaments', async () => {
            const closedTournament = await Tournament.create({
                title: 'Disposable Closed Tournament', game: 'Valorant', date: new Date('2026-12-01'), rules: 'Round robin', status: false, organizer: userA._id
            })

            const req = {}
            const res = createMockRes()
            await openTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(!res.body.some(t => t._id.toString() === closedTournament._id.toString()))

            await Tournament.findByIdAndDelete(closedTournament._id)
        })
    })

    describe('US9 : Modification de tournoi', () => {
        test('Update tournament as organizer (partial update)', async () => {
            const req = {
                params: { id: tournament._id },
                body: { newTitle: 'Test Tournament Alpha Updated' },
                user: { _id: userA._id }
            }
            const res = createMockRes()
            await updateTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            const updated = await Tournament.findById(tournament._id)
            assert.strictEqual(updated.title, 'Test Tournament Alpha Updated')
            assert.strictEqual(updated.game, 'Valorant')
            assert.strictEqual(updated.status, true)
        })

        test('Update tournament status only', async () => {
            const req = { params: { id: tournament._id }, body: { newStatus: 'close' }, user: { _id: userA._id } }
            const res = createMockRes()
            await updateTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            const updated = await Tournament.findById(tournament._id)
            assert.strictEqual(updated.status, false)

            updated.status = true
            await updated.save()
        })

        test('Update tournament rejects invalid status value', async () => {
            const req = { params: { id: tournament._id }, body: { newStatus: 'maybe' }, user: { _id: userA._id } }
            const res = createMockRes()
            await updateTournament(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Update tournament rejects if not organizer', async () => {
            const req = { params: { id: tournament._id }, body: { newTitle: 'Hacked Title' }, user: { _id: userB._id } }
            const res = createMockRes()
            await updateTournament(req, res)
            assert.strictEqual(res.statusCode, 403)

            const unchanged = await Tournament.findById(tournament._id)
            assert.strictEqual(unchanged.title, 'Test Tournament Alpha Updated')
        })

        test('Update tournament rejects unknown tournament id', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = { params: { id: fakeId }, body: { newTitle: 'Ghost' }, user: { _id: userA._id } }
            const res = createMockRes()
            await updateTournament(req, res)
            assert.strictEqual(res.statusCode, 404)
        })
    })

    describe('US10 : Suppression de tournoi', () => {
        test('Delete tournament as organizer', async () => {
            const disposable = await Tournament.create({ title: 'Disposable A', game: 'Valorant', date: new Date(), rules: 'Single elim', status: true, organizer: userA._id })
            const req = { params: { id: disposable._id }, user: { _id: userA._id } }
            const res = createMockRes()
            await deleteTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            const deleted = await Tournament.findById(disposable._id)
            assert.strictEqual(deleted, null)
        })

        test('Delete tournament as admin', async () => {
            const disposable = await Tournament.create({ title: 'Disposable B', game: 'Valorant', date: new Date(), rules: 'Round robin', status: true, organizer: userA._id })
            const req = { params: { id: disposable._id }, user: { _id: userAdmin._id } }
            const res = createMockRes()
            await deleteTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            const deleted = await Tournament.findById(disposable._id)
            assert.strictEqual(deleted, null)
        })

        test('Delete tournament rejects if not organizer nor admin', async () => {
            const disposable = await Tournament.create({ title: 'Disposable C', game: 'Valorant', date: new Date(), rules: 'Round robin', status: true, organizer: userA._id })
            const req = { params: { id: disposable._id }, user: { _id: userB._id } }
            const res = createMockRes()
            await deleteTournament(req, res)
            assert.strictEqual(res.statusCode, 403)

            const stillThere = await Tournament.findById(disposable._id)
            assert.ok(stillThere)
            await Tournament.findByIdAndDelete(disposable._id)
        })

        test('Delete tournament rejects unknown tournament id', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = { params: { id: fakeId }, user: { _id: userA._id } }
            const res = createMockRes()
            await deleteTournament(req, res)
            assert.strictEqual(res.statusCode, 404)
        })
    })
})