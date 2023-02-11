const mongoose = require('mongoose');
const {Schema} = mongoose;

const OldbooksSchema = new Schema({
    snapchot: [{
        title:{ type: String},
        isbn: {type: String},
        stock:{type: Number},
        course:{type:String },
        demand:{type: Number},
        editorial:{type: String},
        penalizacion:{type: Number}
    }],
    year:{type:Number}   
});

module.exports = mongoose.model('Oldbooks', OldbooksSchema)