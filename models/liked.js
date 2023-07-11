const mongoose = require('mongoose');

const likedSchema = new mongoose.Schema({
    image: String,
    username: String
})

module.exports = mongoose.model('like', likedSchema);