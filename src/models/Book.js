const mongoose = require('mongoose');
const {Schema} = mongoose;

const BookSchema = new Schema({
   title:{ type: String, required: true},
   isbn: {type: String, required: true},
   stock:{type: Number, required: true},
   course:{type:String , required: true},
   demand:{type: Number, required: true},
   date:{ type: Date, default: Date.now} 
   
});

module.exports = mongoose.model('Book', BookSchema)