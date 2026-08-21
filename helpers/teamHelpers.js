exports.isTeamTeammate = (team, userId) => {
    if(!team || !userId) return false
    const userIdStr = userId.toString()
    const isCaptain = team.captain && team.captain.toString() === userIdStr
    const isTeammate = team.teammate && team.teammate.some(id => id.toString() === userIdStr)
    return isCaptain || isTeammate
}