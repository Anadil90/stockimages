const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
    name: {type: String, unique: true, required: true},
    email: {type: String, unique: true, required: true},
    message: {type: String, required: true, min: 50}
})

module.exports = mongoose.model("message", contactSchema);