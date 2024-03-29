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
    if (req.user.role == 'admin') {
        res.render('users/signup');
    } else {
        console.log('no')
    }
});

router.post('/users/signup', async (req, res) => {
    const { name, email, course, password, confirm_password } = req.body;
    const errors = [];
    const success_mssg = [];
    if (name.length <= 0) {
        errors.push({ text: 'Por favor inserte su nombre' });
    }
    if (course == 'Select the course:') {
        errors.push({ text: 'Por favor, seleccione el curso.' });
    }
    if (password != confirm_password) {
        errors.push({ text: 'La contraseña no coincide' });
    }
    if (password.length < 4) {
        errors.push({ text: 'La contraseña debe tener al menos 4 caracteres' });
    }
    if (errors.length > 0) {
        res.render('users/signup', { errors, name, email, password, confirm_password });
    } else {
        const emailUser = await User.findOne({ email: email });
        //console.log(emailUser);
        if (emailUser) {
            errors.push({ text: 'El correo electrónico ya está en uso.' });
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
            success_mssg.push({ text: 'Estas registrado' });
            //req.flash('success_msg', 'You are registered');
            res.render('users/signin', { success_mssg });
        }

    }

});

router.get('/users', isAuthenticated, async (req, res) => {

    if (req.user.role == 'admin') {
        const users = await User.aggregate([
            {
              $match: { subscription: true }
            },
            {
              $addFields: {
                roleWeight: {
                  $switch: {
                    branches: [
                      { case: { $eq: ['$role', 'admin'] }, then: 1 },
                      { case: { $eq: ['$role', 'customer'] }, then: 2 }
                    ],
                    default: 3
                  }
                }
              }
            },
            {
              $sort: { roleWeight: 1, course: -1 }
            }
          ]).exec();          

        res.render('users/all-users', { users });
    } else {
        console.log('no')
    }
});

router.get('/users/edit/:id', isAuthenticated, async (req, res) => {
    const user = await User.findById(req.params.id).lean();
    if (req.user.role == 'admin') {
        res.render('users/edit-user', { user });
    } else {
        /*
        res.render('users/edit-profile', { user });*/
        console.log("no")
    }
});

router.put('/users/edit-user/:id', isAuthenticated, async (req, res) => {
    const { name, email, role, course } = req.body;
    //const success_msg =[];
    await User.findByIdAndUpdate(req.params.id, { name, email, role, course });
    //success_msg.push({text:'User actualizada satisfactoriamente'});
    req.flash('success_msg', 'Usuario actualizado satisfactoriamente');
    res.redirect('/users')
});


router.put('/users/edit-suscripcion/:id', isAuthenticated, async (req, res) => {
    console.log(req.user.role)
    if (req.user.role == 'admin') {
        // Actualiza el documento con los nuevos valores y establece adminpermision en false
        await User.findByIdAndUpdate(req.params.id, { adminpermision: false });
        
        req.flash('success_msg', 'Usuario actualizado satisfactoriamente');
        res.redirect('/petitions');
    } else {
        console.log('no')
    }
});


router.delete('/users/delete/:id', isAuthenticated, async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Usuario eliminado satisfactoriamente');
    res.redirect('/users');
});

router.get('/users/penalty/:id', isAuthenticated, async (req, res) => {
    if (req.user.role == 'admin') {
        const user = await User.findById(req.params.id).lean();
        const books = await Book.find({ course: user.course }).sort({ date: 'desc' }).lean();
        res.render('users/penalty', { user, books });
    } else {
        console.log('no')
    }
});



router.put('/users/penalty2/:id', isAuthenticated, async (req, res) => {
    const user = await User.findById(req.params.id).lean();
    const currentYear = new Date().getFullYear();
    const { idbook, estado } = req.body;
    const book = await Book.findById(idbook).lean();
    const errors = [];
    const success_mssg = [];
    const books = await Book.find({ course: user.course }).sort({ date: 'desc' }).lean();

    if (estado === 'Nopenalizado') {
        // Encontrar el índice del libro con el mismo ISBN en el array entregado
        const bookIndex = user.entregado.findIndex(don => don.isbn === book.isbn);

        if (bookIndex !== -1) {
            // Eliminar el libro de la lista entregado y actualizar el stock del libro
            user.entregado.splice(bookIndex, 1);
            await Book.findByIdAndUpdate(idbook, { $inc: { stock: 1 } });
            await User.findByIdAndUpdate(user._id, { entregado: user.entregado });
            success_mssg.push({ text: 'Libro eliminado correctamente de la lista de penalizados' });
        } else {
            errors.push({ text: 'No se encontró el libro en la lista de penalizados' });
        }
    } else {
        // Código existente para penalizar el libro
        const stock = book.stock - 1;
        const entregado = [{
            isbn: book.isbn,
            estado: estado,
            price: book.penalizacion,
            course: book.course,
            year: currentYear
        }];
        var isbnEntregado = false;
        const don = user.entregado;
        don.forEach(function (don) {
            if (book.isbn == don.isbn) {
                isbnEntregado = true;
            }
        });
        if (isbnEntregado) {
            errors.push({ text: 'No puedes penalizar el mismo libro 2 veces' });
            //res.render('users/penalty', { errors, books, user });
        } else {
            const entregado2 = user.entregado;
            entregado.push.apply(entregado, entregado2);
            await Book.findByIdAndUpdate(idbook, { stock });
            await User.findByIdAndUpdate(user._id, { entregado });
            success_mssg.push({ text: 'Penalizado correctamente' });
            console.log(entregado);
        }
    }
    res.render('users/penalty', { books, user, errors, success_mssg });
});



router.get('/upload', isAuthenticated, async (req, res) => {

    if (req.user.role == 'admin') {
        res.render('users/upload');
    } else {
        console.log('no')
        /*res.render('users/profile');*/
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