const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
require('dotenv').config()

const User = require('../models/userModel')
const Team = require('../models/teamModel')
const Tournament = require('../models/tournamentModel')
const { register, login, updateProfile, updateRole } = require('../controllers/authController')
const { createTeam, joinTeam, inviteTeammate, removeTeammate, inscriptionTournament, inscriptionTeamTournament, deleteTeam, checkTeam } = require('../controllers/teamController')
const { createTournament, updateTournament, deleteTournament, openTournament, getTeamTournament, numberTeamRegistered, checkTournament } = require('../controllers/tournamentController')

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

    describe('US1 : Inscription utilisateur', () => {
        test('Register user with email, name, strong password', async () => {
            const reqA = {
                body: {
                    name: 'Alice Tester',
                    email: 'test_us_a@example.com',
                    password: 'Password123!'
                }
            }
            const resA = createMockRes()
            await register(reqA, resA)
            assert.strictEqual(resA.statusCode, 201)
            assert.ok(resA.body.token)
            assert.strictEqual(resA.body.user.email, 'test_us_a@example.com')
            assert.deepStrictEqual(resA.body.user.role, ['user'])
            userA = resA.body.user
            tokenA = resA.body.token

            const reqB = {
                body: {
                    name: 'Bob Collaborator',
                    email: 'test_us_b@example.com',
                    password: 'Password123!'
                }
            }
            const resB = createMockRes()
            await register(reqB, resB)
            assert.strictEqual(resB.statusCode, 201)
            userB = resB.body.user
            tokenB = resB.body.token

            const resDup = createMockRes()
            await register(reqA, resDup)
            assert.strictEqual(resDup.statusCode, 400)
        })

        test('Register rejects missing fields', async () => {
            const req = { body: { email: 'incomplete@example.com' } }
            const res = createMockRes()
            await register(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Register rejects weak password', async () => {
            const req = {
                body: {
                    name: 'Weak Pass',
                    email: 'weakpass@example.com',
                    password: 'weak'
                }
            }
            const res = createMockRes()
            await register(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Register rejects invalid email format', async () => {
            const req = {
                body: {
                    name: 'Bad Email',
                    email: 'not-an-email',
                    password: 'Password123!'
                }
            }
            const res = createMockRes()
            await register(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
    })

    describe('US2 : Connexion utilisateur', () => {
        test('Login with correct credentials', async () => {
            const req = {
                body: {
                    email: 'test_us_a@example.com',
                    password: 'Password123!'
                }
            }
            const res = createMockRes()
            await login(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(res.body.token)
            assert.strictEqual(res.body.user.email, 'test_us_a@example.com')
            assert.deepStrictEqual(res.body.user.role, ['user'])

            tokenA = res.body.token
        })

        test('Login rejects wrong password', async () => {
            const req = {
                body: {
                    email: 'test_us_a@example.com',
                    password: 'WrongPassword1!'
                }
            }
            const res = createMockRes()
            await login(req, res)
            assert.strictEqual(res.statusCode, 401)
        })

        test('Login rejects unknown email', async () => {
            const req = {
                body: {
                    email: 'doesnotexist@example.com',
                    password: 'Password123!'
                }
            }
            const res = createMockRes()
            await login(req, res)
            assert.strictEqual(res.statusCode, 401)
        })

        test('Login rejects missing fields', async () => {
            const req = { body: { email: 'test_us_a@example.com' } }
            const res = createMockRes()
            await login(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
    })

    describe('US4 : Mise à jour du profil', () => {
        test('Update profile - name', async () => {
            const req = {
                params: { id: userA.id },
                body: { newName: 'Alice Updated' }
            }
            const res = createMockRes()
            await updateProfile(req, res)

            assert.strictEqual(res.statusCode, 200)
            const updatedUser = await User.findById(userA.id)
            assert.strictEqual(updatedUser.name, 'Alice Updated')
        })

        test('Update profile - email', async () => {
            const req = {
                params: { id: userA.id },
                body: { newEmail: 'test_us_a_updated@example.com' }
            }
            const res = createMockRes()
            await updateProfile(req, res)

            assert.strictEqual(res.statusCode, 200)
            const updatedUser = await User.findById(userA.id)
            assert.strictEqual(updatedUser.email, 'test_us_a_updated@example.com')

            updatedUser.email = 'test_us_a@example.com'
            await updatedUser.save()
        })

        test('Update profile - password', async () => {
            const req = {
                params: { id: userA.id },
                body: { newPassword: 'NewPassword123!' }
            }
            const res = createMockRes()
            await updateProfile(req, res)

            assert.strictEqual(res.statusCode, 200)

            const loginReq = {
                body: {
                    email: 'test_us_a@example.com',
                    password: 'NewPassword123!'
                }
            }
            const loginRes = createMockRes()
            await login(loginReq, loginRes)
            assert.strictEqual(loginRes.statusCode, 200)
            assert.ok(loginRes.body.token)

            tokenA = loginRes.body.token
        })

        test('Update profile returns 404 for unknown user', async () => {
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

    describe('US5 : Création d\'équipe', () => {
        test('Create team as captain', async () => {
            const req = {
                body: { title: 'Test Team Alpha' },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await createTeam(req, res)

            assert.strictEqual(res.statusCode, 201)
            assert.strictEqual(res.body.title, 'Test Team Alpha')
            assert.strictEqual(res.body.captain.toString(), userA.id.toString())
            assert.deepStrictEqual(res.body.teammate, [])

            const updatedUserA = await User.findById(userA.id)
            assert.ok(updatedUserA.role.includes('captain'))
            assert.ok(updatedUserA.role.includes('user'))

            team = res.body
        })

        test('Create team rejects duplicate title', async () => {
            const req = {
                body: { title: 'Test Team Alpha' },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await createTeam(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Create team rejects missing title', async () => {
            const req = {
                body: {},
                user: { _id: userA.id }
            }
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
            assert.ok(res.body.teammate.some(id => id.toString() === userB.id.toString()))

            const updatedUserB = await User.findById(userB.id)
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
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await removeTeammate(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(!res.body.teammate.some(id => id.toString() === userB.id.toString()))

            const updatedUserB = await User.findById(userB.id)
            assert.ok(!updatedUserB.role.includes('player'))
            assert.ok(updatedUserB.role.includes('user'))
        })

        test('Remove teammate rejects if not captain', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'test_us_a@example.com' },
                user: { _id: userB.id }
            }
            const res = createMockRes()
            await removeTeammate(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Remove teammate rejects unknown user email', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'ghost@example.com' },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await removeTeammate(req, res)
            assert.strictEqual(res.statusCode, 404)
        })

        test('Invite teammate as captain', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'test_us_b@example.com' },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await inviteTeammate(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(res.body.teammate.some(id => id.toString() === userB.id.toString()))

            const updatedUserB = await User.findById(userB.id)
            assert.ok(updatedUserB.role.includes('player'))
        })

        test('Invite teammate rejects duplicate membership', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'test_us_b@example.com' },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await inviteTeammate(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Invite teammate rejects if not captain', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'test_us_a@example.com' },
                user: { _id: userB.id }
            }
            const res = createMockRes()
            await inviteTeammate(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Invite teammate rejects unknown user email', async () => {
            const req = {
                params: { idTeam: team._id },
                body: { email: 'ghost@example.com' },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await inviteTeammate(req, res)
            assert.strictEqual(res.statusCode, 404)
        })

        test('Invite teammate rejects missing team id', async () => {
            const req = {
                params: {},
                body: { email: 'test_us_b@example.com' },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await inviteTeammate(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
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

    describe('US9 : Modification de tournoi', () => {
        test('Update tournament as organizer (partial update)', async () => {
            const req = {
                params: { id: tournament._id },
                body: { newTitle: 'Test Tournament Alpha Updated' },
                user: { _id: userA.id }
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
            const req = {
                params: { id: tournament._id },
                body: { newStatus: 'close' },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await updateTournament(req, res)

            assert.strictEqual(res.statusCode, 200)

            const updated = await Tournament.findById(tournament._id)
            assert.strictEqual(updated.status, false)

            updated.status = true
            await updated.save()
        })

        test('Update tournament rejects invalid status value', async () => {
            const req = {
                params: { id: tournament._id },
                body: { newStatus: 'maybe' },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await updateTournament(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Update tournament rejects if not organizer', async () => {
            const req = {
                params: { id: tournament._id },
                body: { newTitle: 'Hacked Title' },
                user: { _id: userB.id }
            }
            const res = createMockRes()
            await updateTournament(req, res)
            assert.strictEqual(res.statusCode, 403)

            const unchanged = await Tournament.findById(tournament._id)
            assert.strictEqual(unchanged.title, 'Test Tournament Alpha Updated')
        })

        test('Update tournament rejects unknown tournament id', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = {
                params: { id: fakeId },
                body: { newTitle: 'Ghost' },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await updateTournament(req, res)
            assert.strictEqual(res.statusCode, 404)
        })
    })

    describe('US10 : Suppression de tournoi', () => {
        test('Delete tournament as organizer', async () => {
            const disposable = await Tournament.create({
                title: 'Disposable Tournament A',
                game: 'Valorant',
                date: new Date('2026-11-01'),
                rules: 'Single elim',
                status: true,
                organizer: userA.id
            })

            const req = {
                params: { id: disposable._id },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await deleteTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            const deleted = await Tournament.findById(disposable._id)
            assert.strictEqual(deleted, null)
        })

        test('Delete tournament as admin', async () => {
            const adminUser = await User.create({
                name: 'Admin Tester',
                email: 'test_us_admin@example.com',
                password: 'Password123!',
                role: ['user', 'admin']
            })
            userAdminId = adminUser._id

            const disposable = await Tournament.create({
                title: 'Disposable Tournament B',
                game: 'Valorant',
                date: new Date('2026-11-02'),
                rules: 'Round robin',
                status: true,
                organizer: userA.id
            })

            const req = {
                params: { id: disposable._id },
                user: { _id: userAdminId }
            }
            const res = createMockRes()
            await deleteTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            const deleted = await Tournament.findById(disposable._id)
            assert.strictEqual(deleted, null)
        })

        test('Delete tournament rejects if not organizer nor admin', async () => {
            const disposable = await Tournament.create({
                title: 'Disposable Tournament C',
                game: 'Valorant',
                date: new Date('2026-11-03'),
                rules: 'Round robin',
                status: true,
                organizer: userA.id
            })

            const req = {
                params: { id: disposable._id },
                user: { _id: userB.id }
            }
            const res = createMockRes()
            await deleteTournament(req, res)
            assert.strictEqual(res.statusCode, 403)

            const stillThere = await Tournament.findById(disposable._id)
            assert.ok(stillThere)

            await Tournament.findByIdAndDelete(disposable._id)
        })

        test('Delete tournament rejects unknown tournament id', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = {
                params: { id: fakeId },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await deleteTournament(req, res)
            assert.strictEqual(res.statusCode, 404)
        })
    })

    describe('US11 : Inscription d\'une équipe à un tournoi', () => {
        test('Register team to tournament as captain', async () => {
            const req = {
                params: { idTeam: team._id, idTournament: tournament._id },
                user: { _id: userA.id }
            }
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
            const req = {
                params: { idTeam: team._id, idTournament: tournament._id },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            const next = createMockNext()

            await inscriptionTournament(req, res, next)
            assert.strictEqual(next.called, false)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Register rejects if user is not a team member', async () => {
            const req = {
                params: { idTeam: team._id, idTournament: tournament._id },
                user: { _id: userAdminId }
            }
            const res = createMockRes()
            const next = createMockNext()

            await inscriptionTournament(req, res, next)
            assert.strictEqual(next.called, false)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Register rejects unknown team', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = {
                params: { idTeam: fakeId, idTournament: tournament._id },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            const next = createMockNext()

            await inscriptionTournament(req, res, next)
            assert.strictEqual(next.called, false)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Register rejects unknown tournament', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = {
                params: { idTeam: team._id, idTournament: fakeId },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            const next = createMockNext()

            await inscriptionTournament(req, res, next)
            assert.strictEqual(next.called, false)
            assert.strictEqual(res.statusCode, 404)
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
                title: 'Disposable Closed Tournament',
                game: 'Valorant',
                date: new Date('2026-12-01'),
                rules: 'Round robin',
                status: false,
                organizer: userA.id
            })

            const req = {}
            const res = createMockRes()
            await openTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(!res.body.some(t => t._id.toString() === closedTournament._id.toString()))

            await Tournament.findByIdAndDelete(closedTournament._id)
        })
    })

    describe('US13 : Consultation des équipes inscrites (Organisateur)', () => {
        test('Organizer sees registered teams', async () => {
            const req = {
                params: { idTournament: tournament._id },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await getTeamTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(Array.isArray(res.body))
            assert.ok(res.body.some(t => t._id.toString() === team._id.toString()))
            assert.strictEqual(res.body.find(t => t._id.toString() === team._id.toString()).title, 'Test Team Alpha')
        })

        test('Rejects if not organizer', async () => {
            const req = {
                params: { idTournament: tournament._id },
                user: { _id: userB.id }
            }
            const res = createMockRes()
            await getTeamTournament(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Rejects unknown tournament', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = {
                params: { idTournament: fakeId },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await getTeamTournament(req, res)
            assert.strictEqual(res.statusCode, 404)
        })
    })

    describe('US14 : Suppression d\'équipe (Admin)', () => {
        test('Delete team as admin', async () => {
            const disposableTeam = await Team.create({
                title: 'Disposable Team For Deletion',
                captain: userA.id
            })

            const req = {
                params: { idTeam: disposableTeam._id },
                user: { _id: userAdminId }
            }
            const res = createMockRes()
            await deleteTeam(req, res)

            assert.strictEqual(res.statusCode, 200)
            const deleted = await Team.findById(disposableTeam._id)
            assert.strictEqual(deleted, null)
        })

        test('Delete team rejects if not admin', async () => {
            const disposableTeam = await Team.create({
                title: 'Disposable Team Not Deleted',
                captain: userA.id
            })

            const req = {
                params: { idTeam: disposableTeam._id },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await deleteTeam(req, res)
            assert.strictEqual(res.statusCode, 403)

            const stillThere = await Team.findById(disposableTeam._id)
            assert.ok(stillThere)

            await Team.findByIdAndDelete(disposableTeam._id)
        })

        test('Delete team rejects unknown team id', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = {
                params: { idTeam: fakeId },
                user: { _id: userAdminId }
            }
            const res = createMockRes()
            await deleteTeam(req, res)
            assert.strictEqual(res.statusCode, 404)
        })
    })

    describe('US15 : Statistiques d\'inscription (Admin)', () => {
        test('Admin sees number of teams registered to a tournament', async () => {
            const req = {
                params: { idTournament: tournament._id },
                user: { _id: userAdminId }
            }
            const res = createMockRes()
            await numberTeamRegistered(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.strictEqual(res.body.teamRegistered, 1)
            assert.strictEqual(res.body.tournament, 'Test Tournament Alpha Updated')
        })

        test('Rejects if not admin', async () => {
            const req = {
                params: { idTournament: tournament._id },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await numberTeamRegistered(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Rejects unknown tournament', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = {
                params: { idTournament: fakeId },
                user: { _id: userAdminId }
            }
            const res = createMockRes()
            await numberTeamRegistered(req, res)
            assert.strictEqual(res.statusCode, 404)
        })

        test('Rejects missing tournament id', async () => {
            const req = {
                params: {},
                user: { _id: userAdminId }
            }
            const res = createMockRes()
            await numberTeamRegistered(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
    })

    describe('US16 : Gestion des rôles utilisateurs (Admin)', () => {
        test('Admin updates a user role', async () => {
            const adminDoc = await User.findById(userAdminId)

            const req = {
                params: { id: userB.id },
                body: { newRole: 'organizer' },
                user: adminDoc
            }
            const res = createMockRes()
            await updateRole(req, res)

            assert.strictEqual(res.statusCode, 200)

            const updatedUserB = await User.findById(userB.id)
            assert.ok(updatedUserB.role.includes('organizer'))
            assert.ok(updatedUserB.role.includes('user'))
            assert.ok(updatedUserB.role.includes('player'))
        })

        test('Rejects if not admin', async () => {
            const userADoc = await User.findById(userA.id)

            const req = {
                params: { id: userB.id },
                body: { newRole: 'organizer' },
                user: userADoc
            }
            const res = createMockRes()
            await updateRole(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Rejects invalid role value', async () => {
            const adminDoc = await User.findById(userAdminId)

            const req = {
                params: { id: userB.id },
                body: { newRole: 'superhero' },
                user: adminDoc
            }
            const res = createMockRes()
            await updateRole(req, res)
            assert.strictEqual(res.statusCode, 400)
        })

        test('Rejects unknown user id', async () => {
            const adminDoc = await User.findById(userAdminId)
            const fakeId = new mongoose.Types.ObjectId()

            const req = {
                params: { id: fakeId },
                body: { newRole: 'player' },
                user: adminDoc
            }
            const res = createMockRes()
            await updateRole(req, res)
            assert.strictEqual(res.statusCode, 404)
        })
    })

    describe('US17 : Consultation des détails d\'une équipe', () => {
        test('Captain views team details', async () => {
            const req = {
                params: { idTeam: team._id },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await checkTeam(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.strictEqual(res.body._id.toString(), team._id.toString())
            assert.strictEqual(res.body.title, 'Test Team Alpha')
        })

        test('Player views team details', async () => {
            const req = {
                params: { idTeam: team._id },
                user: { _id: userB.id }
            }
            const res = createMockRes()
            await checkTeam(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.strictEqual(res.body._id.toString(), team._id.toString())
        })

        test('Rejects if user has neither player nor captain role', async () => {
            const adminDoc = await User.findById(userAdminId)

            const req = {
                params: { idTeam: team._id },
                user: { _id: adminDoc._id }
            }
            const res = createMockRes()
            await checkTeam(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Rejects unknown team id', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = {
                params: { idTeam: fakeId },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await checkTeam(req, res)
            assert.strictEqual(res.statusCode, 404)
        })

        test('Rejects missing team id', async () => {
            const req = {
                params: {},
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await checkTeam(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
    })

    describe('US18 : Consultation des tournois d\'une équipe', () => {
        test('Captain sees team\'s registered tournaments', async () => {
            const req = {
                params: { idTeam: team._id },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await checkTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(Array.isArray(res.body))
            assert.ok(res.body.some(t => t._id.toString() === tournament._id.toString()))
            assert.strictEqual(res.body.find(t => t._id.toString() === tournament._id.toString()).title, 'Test Tournament Alpha Updated')
        })

        test('Teammate sees team\'s registered tournaments', async () => {
            const req = {
                params: { idTeam: team._id },
                user: { _id: userB.id }
            }
            const res = createMockRes()
            await checkTournament(req, res)

            assert.strictEqual(res.statusCode, 200)
            assert.ok(res.body.some(t => t._id.toString() === tournament._id.toString()))
        })

        test('Rejects if user is not a member of the team', async () => {
            const req = {
                params: { idTeam: team._id },
                user: { _id: userAdminId }
            }
            const res = createMockRes()
            await checkTournament(req, res)
            assert.strictEqual(res.statusCode, 403)
        })

        test('Rejects unknown team id', async () => {
            const fakeId = new mongoose.Types.ObjectId()
            const req = {
                params: { idTeam: fakeId },
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await checkTournament(req, res)
            assert.strictEqual(res.statusCode, 404)
        })

        test('Rejects missing team id', async () => {
            const req = {
                params: {},
                user: { _id: userA.id }
            }
            const res = createMockRes()
            await checkTournament(req, res)
            assert.strictEqual(res.statusCode, 400)
        })
    })
})