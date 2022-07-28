const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/gals-v1')
.then(db => console.log('DB is connected'))
.catch(err => console.error(err));