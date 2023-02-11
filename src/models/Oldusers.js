const mongoose = require('mongoose');
const { Schema } = mongoose;
const currentYear = new Date().getFullYear();

const OldusersSchema = new Schema({
   name:{ type: String, required: true},
   email: {type: String, required: true},
   password:{ type: String, required: true},
   role:{type:String , required: true},
   course:{type:String , required: true},
   penalty:{type: Number },
   subscription:{type:Boolean, required: true},
   adminpermision:{type:Boolean, required: true},
   car:[String],
   //donation:[String],
   entregado:[{
        isbn:{type:String},
        estado:{type:String},
        price:{type: Number},
        course: { tipe: String },//curso y año
        year:{type:Number}
   }],
   date:{ type: Number, default: currentYear} 
});

module.exports = mongoose.model('Oldusers', OldusersSchema)