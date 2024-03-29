const mongoose = require('mongoose');
const {Schema} = mongoose;
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
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
        price: { type: Number },
        course: { type: String },//curso y año
        year:{type:Number}
   }],
   date:{ type: Date, default: Date.now} 
});

UserSchema.methods.encryptPassword = async (password) =>{
    const salt = await bcrypt.genSalt(10);
    const hash= bcrypt.hash(password,salt);
    return hash;
};

UserSchema.methods.matchPassword = async function (password){
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema)