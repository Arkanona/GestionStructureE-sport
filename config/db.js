const mongoose = require('mongoose')

const dbURI = process.env.MONGODB_URI

mongoose.connect(dbURI)
    .then(() => console.log('Connecter avec succès à MongoDB !'))
    .catch(err => console.error('Erreur de connexion à MongoDB :', err))

module.exports = mongoose.connection