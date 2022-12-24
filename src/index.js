const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');

const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const multer = require('multer');
//const uuid = require('uuid').v4;


//Initiliazations
const app = express();
require('./database');
require('./config/passport');

//Settings
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', exphbs.engine({
    defaultLayout: 'main',
    layoutDir: path.join(app.get('views'), 'layouts'),
    partialsDir: path.join(app.get('views'), 'partials'),
    extname: '.hbs'

}));

app.set('view engine','.hbs');

//Middlewares
app.use(express.urlencoded({extended: false}));
app.use(methodOverride('_method'));
app.use(session({
    secret: 'mysecretapp',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(express.json());
/*const storageimage = multer.diskStorage({
    destination: path.join(__dirname, 'public/img/uploads'),
    fieldname: (req, file, cb, fieldname)=>{
        cb(null, uuid() + path.extname(file.originalname));
    }
});
//app.use(multer({ storage: storageimage }).single('image'));
multer({ storage: storageimage }).single('image');*/
//crear otra  constante de storage para multer para guardar archivos
/*const storage2 = multer.diskStorage({
    destination: path.join(__dirname, 'public/file/uploads'),
    filename: (req, file, cb, filename)=>{
        cb(null, file.originalname);
    }
});

//const upload = multer({ storage: storage2 }).single('excelFile');
app.use(multer({ storage: storage2 }).single('excelFile'));*/

//Global Variables
app.use((req, res, next) =>{
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;    

    next();
});

//Routes
app.use(require('./routes/index'));
app.use(require('./routes/notes'));
app.use(require('./routes/users'));
app.use(require('./routes/books'));

//Statics Files
app.use(express.static(path.join(__dirname, 'public')));

//Server is listening
app.listen(app.get('port'),()=>{
    console.log('Server on port', app.get('port'));
});