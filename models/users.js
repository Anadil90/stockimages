const mongoose = require('mongoose'),
      passport = require('passport'),
 localStrategy = require('passport-local'),
passportLocalMongoose = require('passport-local-mongoose');


const userSchema = new mongoose.Schema({
    firstName: {type: String, required: true},
    lastName: String,
    username: {type: String, required: true},
    password: {type: String, required: true, min: 8},
    email: {type: String, unique: true, required: true},
    isAdmin: {type: Boolean, default: false}
})



userSchema.plugin(passportLocalMongoose)
module.exports = mongoose.model('user', userSchema);
