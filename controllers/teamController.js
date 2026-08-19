const User = require('../models/userModel')
const Team = require('../models/teamModel')

const isTeamTeammate = (team, userId) => {
    if(!team || !userId) return false
    const userIdStr = userId.toString()
    const isCaptain = team.captain && team.captain.toString() === userIdStr
    //const isTeammate = team.teammate && team.teammate.some(id => id.toString() === userIdStr)
    return isCaptain //|| isTeammate
}

//US5
exports.createTeam = async (req, res) => {
    try{
        const { title } = req.body

        if(!title){
            res.status(400).json({ error: 'You must provide title'})
        }
        const existingTitle = await Team.findOne({ title })
        if(existingTitle){
            return res.status(400).json({ message: 'Title already exist'})
        }

        const team = new Team({
            title,
            captain: req.user._id
        })

        const newTeam = await team.save()
        res.status(201).json(newTeam)

    } catch(err) {
        res.status(500).json({ message: err.message})
    }
}

//US6
exports.joinTeam = async (req, res) => {
    try{
        const { title, teammate } = req.body
        const email = req.body.email
        const idTeam = req.params.idTeam

        if(!email){
            return res.status(400).json({ message: 'Invalid email'})
        }

        if(email == null){
            return res.status(400).json({ message: 'You need provide a good email'})
        }
        
        if(!idTeam){
            return res.status(404).json({ message: 'Invalid team'})
        }

        const team = await Team.findOne({title})
        if(!team){
            return res.status(404).json({ message: 'Team not exists'})
        }

        const teammateInfos = await User.findOne({email})
        if(!teammateInfos){
            return res.status(404).json({ message: 'User not found' })
        }

        const idTeammate = teammateInfos._id
        const isTeammateExists = team.teammate.includes(idTeammate)
        if(isTeammateExists){
            return res.status(400).json({ message: 'You are already on this team'})
        }

        team.teammate.push(idTeammate)

        const updateTeam = await team.save()
        res.status(200).json(updateTeam)
    }catch(err){
        res.status(500).json({ message: err.message })
    }
}

// US7 Invite T8
exports.inviteTeammate = async (req, res) => {
    try{
        const idTeam = req.params.idTeam || req.params.teamId
        const email = req.body.email

        if(!email){
            return res.status(400).json({ message: 'Invalid email'})
        }

        if(!idTeam){
            return res.status(400).json({ message: 'Team ID is required'})
        }

        const team = await Team.findById(idTeam)
        if(!team){
            return res.status(404).json({ message: 'Team not found'})
        }

        if(team.captain.toString() !== req.user._id.toString()){
            return res.status(403).json({ message: 'Only captain can send invite'})
        }

        const teammateInfos = await User.findOne({email})
        if(!teammateInfos){
            return res.status(404).json({ message: 'User not found' })
        }

        const idTeammate = teammateInfos._id
        const isTeammateExists = team.teammate.includes(idTeammate)
        if(isTeammateExists){
            return res.status(400).json({ message: 'User already on team'})
        }

        team.teammate.push(idTeammate)

        const updateTeam = await team.save()
        res.status(200).json(updateTeam)

    }catch(err){
        res.status(500).json({ message: err.message })
    }
}

// US7 Remove T8
exports.removeTeammate = async (req, res) => {
    try{
        const idTeam = req.params.idTeam || req.params.teamId
        const email = req.body.email

        if(!email){
            return res.status(400).json({ message: 'Invalid email'})
        }

        if(!idTeam){
            return res.status(400).json({ message: 'Team ID is required'})
        }

        const team = await Team.findById(idTeam)
        if(!team){
            return res.status(404).json({ message: 'Team not found'})
        }

        if(team.captain.toString() !== req.user._id.toString()){
            return res.status(403).json({ message: 'Only captain can send invite'})
        }

        const teammateInfos = await User.findOne({email})
        if(!teammateInfos){
            return res.status(404).json({ message: 'User not found' })
        }
        
        const idTeammate = teammateInfos._id
        team.teammate.pop(idTeammate)

        const updateTeam = await team.save()
        res.status(200).json(updateTeam)

    }catch(err){
        res.status(500).json({ message: err.message })
    }
}