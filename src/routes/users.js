const express = require('express');
const { route } = require('.');
const router = express.Router();
const { isAuthenticated } = require('../helpers/auth');
const User = require('../models/User');
const Book = require('../models/Book');
const Old = require('../models/Oldusers');
const Oldbk = require('../models/Oldbooks');
const passport = require('passport');
const multer = require('multer');
const XLSX = require('xlsx');
const storagefile = multer.memoryStorage();
const upload = multer({ storage: storagefile });



router.get('/users/signin', (req, res) => {
    res.render('users/signin');
});

router.post('/users/signin', passport.authenticate('local', {
    successRedirect: '/books',
    failureRedirect: '/users/signin',
    failureFlash: true
}));

router.get('/users/signup', (req, res) => {
    res.render('users/signup');
});

router.post('/users/signup', async (req, res) => {
    const { name, email, course, password, confirm_password } = req.body;
    const errors = [];
    const success_mssg = [];
    if (name.length <= 0) {
        errors.push({ text: 'Please insert your name' });
    }
    if (course == 'Select the course:') {
        errors.push({ text: 'Please, Select the course.' });
    }
    if (password != confirm_password) {
        errors.push({ text: 'Password do not match' });
    }
    if (password.length < 4) {
        errors.push({ text: 'Password must be at least 4 characters' });
    }
    if (errors.length > 0) {
        res.render('users/signup', { errors, name, email, password, confirm_password });
    } else {
        const emailUser = await User.findOne({ email: email });
        //console.log(emailUser);
        if (emailUser) {
            errors.push({ text: 'The email is already in use' });
            //req.flash('error_msg', 'The email is already in use');
            //req.flash('success_msg', 'You are registered');
            //console.log('emailUser');
            res.render('users/signup', { errors });
        } else {
            role = 'customer';
            subscription = false;
            adminpermision = false;
            const newUser = new User({ name, email, course, password, role, subscription, adminpermision });
            newUser.password = await newUser.encryptPassword(password);
            await newUser.save();
            success_mssg.push({ text: 'You are registered' });
            //req.flash('success_msg', 'You are registered');
            res.render('users/signin', { success_mssg });
        }

    }

});

router.get('/users', isAuthenticated, async (req, res) => {

    if (req.user.role == 'admin') {
        const users = await User.find({ subscription: true }).sort({ date: 'desc' }).lean();
        res.render('users/all-users', { users });
    } else {
        const user = await User.findById(req.user.id);
        res.render('users/profile', { user });//UGLY tengo que eliminar esta ruta no puede ser que un usuaruio pueda cambiarse el nombre y curso
    }
});

router.get('/users/edit/:id', isAuthenticated, async (req, res) => {
    const user = await User.findById(req.params.id).lean();
    if (req.user.role == 'admin') {
        res.render('users/edit-user', { user });
    } else {
        res.render('users/edit-profile', { user });
    }
});

router.put('/users/edit-user/:id', isAuthenticated, async (req, res) => {
    const { name, email, role, course } = req.body;
    //const success_msg =[];
    await User.findByIdAndUpdate(req.params.id, { name, email, role, course });
    //success_msg.push({text:'User actualizada satisfactoriamente'});
    req.flash('success_msg', 'User actualizada satisfactoriamente');
    res.redirect('/users')
});

router.put('/users/edit-profile/:id', isAuthenticated, async (req, res) => {
    const { name, course } = req.body;
    await User.findByIdAndUpdate(req.params.id, { name, course });
    req.flash('success_msg', 'User actualizada satisfactoriamente');
    res.redirect('/users')
});

router.delete('/users/delete/:id', isAuthenticated, async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'User delited satisfactoriamente');
    res.redirect('/users');
});

router.get('/users/penalty/:id', isAuthenticated, async (req, res) => {
    const user = await User.findById(req.params.id).lean();
    const books = await Book.find({ course: user.course }).sort({ date: 'desc' }).lean();
    res.render('users/penalty', { user, books });
});

router.put('/users/penalty2/:id', isAuthenticated, async (req, res) => {
    const user = await User.findById(req.params.id).lean();
    const currentYear = new Date().getFullYear();
    const { idbook, estado } = req.body;
    console.log(user);
    console.log(idbook);
    console.log(estado);
    const book = await Book.findById(idbook).lean();
    const stock = book.stock - 1;
    const errors = [];
    const success_mssg = [];
    const entregado = [{
        isbn: book.isbn,
        estado: estado,
        price: book.penalizacion,
        course: book.course,
        year: currentYear
    }];
    var isbnEntregado = false;
    const books = await Book.find({ course: user.course }).sort({ date: 'desc' }).lean();
    const don = user.entregado;
    don.forEach(function (don) {
        if (book.isbn == don.isbn) {
            isbnEntregado = true;
        }
    });
    if (isbnEntregado) {
        errors.push({ text: 'No puedes penalizar el mismo libro 2 veces' });
        res.render('users/penalty', { errors, books, user });
    } else {
        const entregado2 = user.entregado;
        entregado.push.apply(entregado, entregado2);
        await Book.findByIdAndUpdate(idbook, { stock });
        await User.findByIdAndUpdate(user._id, { entregado });
        success_mssg.push({ text: 'Penalized successfully' });
        //req.flash('success_msg', 'Penalized successfully');
        res.render('users/penalty', { books, user, success_mssg });
        console.log(entregado);
    }
    //mirar este metodo es lo mismo put('/books/donation/:id'
});


router.get('/upload', isAuthenticated, async (req, res) => {

    if (req.user.role == 'admin') {
        res.render('users/upload');
    } else {

        res.render('users/profile');
    }
});

router.post('/uploadfile', upload.single('excelFile'), isAuthenticated, async (req, res) => {
    //const { name } = req.body;
    //const { fieldname, originalname, size, mimetype } = req.file;
    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    //busqueda de todos los usuarios que estan subcritos y miro los que estan en el excel y los que no los 
    const userss = await User.find({ subscription: true, adminpermision: true }).sort({ date: 'desc' }).lean();
    const currentYear = new Date().getFullYear();
    userss.forEach(async function (user) {
        var eliminar = true;
        data.forEach(alumno => {
            if (alumno.nombre != user.name && eliminar == true) {
                
                if (user.role == "admin") {
                    eliminar = false;
                    console.log("--admin: "+user.name+" mola")
                }
            } else {
                eliminar = false;
            }
        });
        if (eliminar == false) {
            console.log("se queda " + user.name + " --");
            
        } else {
            
            const newOldUser = new Old({name:user.name,
                email: user.email,
                password: user.password,
                role: user.role,
                course: user.course,
                penalty:user.penalty,
                subscription:user.subscription,
                adminpermision:user.adminpermision,
                car:user.car,
                //donation:[String],
                entregado: user.entregado,
                date: currentYear
            });
            await newOldUser.save();
            console.log("----el nombre es: " + user.name + " -----importar/eliminar-------");
            await User.findByIdAndDelete(user._id);
        }
    });
    const book = await Book.find().sort({ course: 'desc' }).lean();
    var snapchot = [];
    book.forEach( function (book) {
        snapchot.push({
            title: book.title,
            isbn: book.isbn,
            stock: book.stock,
            course: book.course,
            demand: book.demand,
            editorial: book.editorial,
            penalizacion: book.penalizacion,
        });
    });
    const newOldBooks = new Oldbk({
        snapchot: snapchot,
        year: currentYear
    });
    await newOldBooks.save();

    data.forEach(async alumno => {
        const users = await User.find({ name: alumno.nombre });
        if (users.length != 0) {
            console.log(users[0].course+users[0].name);


            if (users[0].course != alumno.curso && users[0].subscription == true) {
                var course = alumno.curso;
                const books = await Book.find({ course: course }).sort({ date: 'desc' }).lean();
                var car = [];
                books.forEach(async function (books) {
                    car.push(books.isbn);
                    var demand = books.demand + 1;
                    await Book.findByIdAndUpdate(books._id, { demand });
                });
                await User.findByIdAndUpdate(users[0].id, { car, course });
                console.log(users[0].name)
            } else {
                console.log(".....................");
                console.log(`Nombre: ${alumno.nombre}`);
                console.log(`Curso: ${alumno.curso}`);
            }
        } else {
            console.log("funciona")
        }
    });
    //console.log(fieldname + " " + originalname);
    res.redirect('/books');
});


router.get('/users/logout', function (req, res, next) {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

module.exports = router;