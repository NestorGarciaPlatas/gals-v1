const express = require('express');
const router = express.Router();
const path = require('path');
const { unlink } = require('fs-extra');
const uuid = require('uuid').v4;
const multer = require('multer');
const storageimage = multer.diskStorage({
    destination: path.join(__dirname, '../', 'public/img/uploads'),
    filename: (req, file, cb, filename) => {
        cb(null, uuid() + path.extname(file.originalname));
    }
});
const uploadimage = multer({ storage: storageimage });
//prueba de que el guardado funciona acabndo de comprobar cosas
//const Note = require('../models/Book');
const { isAuthenticated } = require('../helpers/auth');
const User = require('../models/User');
const Book = require('../models/Book');
const Old = require('../models/Oldusers');

router.get('/books/add', isAuthenticated, (req, res) => {
    if (req.user.role != 'admin') {
        console.log('no')
    } else {
        res.render('books/new-book');
    }
});

router.post('/books/new-book', uploadimage.single('image'), isAuthenticated, async (req, res) => {
    if (req.user.role != 'admin') {
        console.log('nooooo')
    }
    const { title, isbn, stock, course, demand, editorial, penalizacion } = req.body;
    const { filename, originalname, size, mimetype } = req.file;
    const errors = [];

    if (!title) {
        errors.push({ text: 'Por favor escriba un título' });
    }
    if (!isbn) {
        errors.push({ text: 'Por favor escriba un ISBN' });
    }
    if (!editorial) {
        errors.push({ text: 'Por favor escriba un Editorial' });
    }
    if (!stock) {
        errors.push({ text: 'Por favor escriba el Stock disponible' });
    }
    if (!penalizacion) {
        errors.push({ text: 'Por favor escribe la Penalización del libro' });
    }
    if (course == 'Select the course of the book:') {
        errors.push({ text: 'Por favor, seleccione el curso del libro.' });
    }
    if (!demand) {
        errors.push({ text: 'Por favor escriba la demanda en caso de no saber escriba 0' });
    }

    //console.log(req.file);
    if (errors.length > 0) {
        if (filename) {
            await unlink(path.resolve('./src/public/img/uploads/' + filename));
            errors.push({ text: 'Sube de nuevo la foto' });
        }
        res.render('books/new-book', {
            errors,
            title,
            isbn,
            stock,
            demand,
            editorial,
            penalizacion
        });
    } else {
        const path = '/img/uploads/' + filename;
        const newBook = new Book({ title, isbn, stock, course, demand, editorial, penalizacion, filename, path, originalname, size, mimetype });
        await newBook.save();
        req.flash('success_msg', 'Libro agregado con éxito');
        res.redirect('/books');
    }

});

//TODO ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
router.post('/searchinfo', isAuthenticated, async (req, res) => {
    const { campo1, campo2, course, campo3} = req.body;
    console.log(campo1, campo2, course, campo3)
    if (campo1 == 'Now' ) {
        if (campo2 == 'Penalizado') {
            if (campo3) {
                const users = await User.find({
                subscription: true,
                adminpermision: true,
                entregado: {
                  $elemMatch: { year: campo3 }
                },
                course:course
            }).lean();
            var cont = users.length;
            console.log(users, users.length)
            res.render('statistics/result-search', { users,course,cont });
            } else {
                const users = await User.find({
                    subscription: true,
                    adminpermision: true,
                    entregado: {
                      $exists: true,
                      $not: { $size: 0 }
                    },
                    course: course
                }).lean();
                var cont = users.length;
                console.log(users, users.length)
                res.render('statistics/result-search', { users,course,cont });
            }            
        } else if (campo2 == 'Sinpenalizar') {
            const users = await User.find({
                subscription: true,
                adminpermision: true,
                entregado: { $size: 0 },
                course:course
            }).lean()
            var cont = users.length;
            console.log(users ,users.length)
            res.render('statistics/result-search', { users,course,cont });
        } else {
            const users = await User.find({
                subscription: true,
                adminpermision: true,
                course:course
            }).lean()
            var cont = users.length;
            console.log(users, users.length)
            res.render('statistics/result-search', { users,course,cont });
        }
        
    } else {
        if (campo2 == 'Penalizado') {
            if (campo3) {
                const users = await Old.find({
                subscription: true,
                adminpermision: true,
                entregado: {
                  $elemMatch: { year: campo3 }
                },
                course:course
            }).lean();
            var cont = users.length;
            console.log(users, users.length)
            res.render('statistics/result-search', { users,course,cont });
            } else {
                const users = await Old.find({
                    subscription: true,
                    adminpermision: true,
                    entregado: {
                      $exists: true,
                      $not: { $size: 0 }
                    },
                    course: course
                }).lean();
                var cont = users.length;
                console.log(users, users.length)
                res.render('statistics/result-search', { users,course,cont });
            }            
        } else if (campo2 == 'Sinpenalizar') {
            const users = await Old.find({
                subscription: true,
                adminpermision: true,
                entregado: { $size: 0 },
                course:course
            }).lean()
            var cont = users.length;
            console.log(users ,users.length)
            res.render('statistics/result-search', { users,course,cont });
        } else {
            const users = await Old.find({
                subscription: true,
                adminpermision: true,
                course:course
            }).lean()
            var cont = users.length;
            console.log(users, users.length)
            res.render('statistics/result-search', { users,course,cont });
        }
    }
    //res.redirect('/statistics/userssearch')
})

router.get('/estadisticas', isAuthenticated, async (req, res) => {
    if (req.user.role == 'admin') {
        const stats = {};

        // Total de libros
        const totalBooks = await Book.countDocuments();
        stats.totalBooks = totalBooks;

        // Total de libros por curso
        const booksByCourse = await Book.aggregate([
            {
                $group: {
                    _id: '$course',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    _id: 1 // Ordenar por el campo _id (curso) en orden ascendente
                }
            }
        ]);
        stats.booksByCourse = booksByCourse;

        // Total de alumnos
        const totalStudents = await User.countDocuments({
            adminpermision: true,
            subscription: true,
            role: 'customer'
        });
        stats.totalStudents = totalStudents;

        // Total de alumnos por curso
        const studentsByCourse = await User.aggregate([
            {
                $match: {
                    subscription: true,
                    adminpermision: true
                }
            },
            {
                $group: {
                    _id: '$course',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    _id: 1 // Ordenar por el campo _id (curso) en orden ascendente
                }
            }
        ]);
        stats.studentsByCourse = studentsByCourse;
        

        // Dinero recaudado por año
        const revenueByYear = await User.aggregate([
            {
                $unwind: '$entregado'
            },
            {
                $group: {
                    _id: '$entregado.year',
                    revenue: { $sum: '$entregado.price' }
                }
            },
            {
                $sort: {
                    _id: 1 // Ordenar por el campo _id (año) en orden ascendente
                }
            }
        ]);
        stats.revenueByYear = revenueByYear;
        // Cantidad de penalizaciones por curso
        const penalizationsByCourse = await User.aggregate([
            {
                $unwind: "$entregado"
            },
            {
                $match: {
                    "entregado.estado": { $in: ["MalEstado", "NoRecibido"] }
                }
            },
            {
                $group: {
                    _id: "$entregado.course",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    _id: 1 // Ordenar por el campo _id (año) en orden ascendente
                }
            }
        ]);
        stats.penalizationsByCourse = penalizationsByCourse;
        console.log(stats);
        // Aquí iría el código para obtener las estadísticas
        res.render('statistics/general-stats', { stats });
    } else {
        console.log('noo')
    }
  });
  
//TODO ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


router.get('/books', isAuthenticated, async (req, res) => {
    if (req.user.role == 'admin') {
        const books = await Book.find().sort({ course: 'desc' }).lean();
        res.render('books/all-books', { books });
    } else {
        const books = await Book.find({ course: req.user.course }).sort({ date: 'desc' }).lean();
        if (req.user.subscription == true) {
            res.render('books/subscribe', { books });
        } else {
            sub = req.user.adminpermision;
            res.render('books/subscribe', { sub });
        }
    }
});

router.get('/books/penalizaciones', isAuthenticated, async (req, res) => {
    const user = await User.findById(req.user.id);
    const users = await User.find({ email: user.email }).lean();
    //console.log(users);

    const entregado = users.entregado;
    //console.log(pena);
    res.render('books/penalizaciones', { users });

});

router.get('/petitions', isAuthenticated, async (req, res) => {
    if (req.user.role == 'admin') {
        const users = await User.find({ subscription: false, adminpermision: true }).sort({ date: 'desc' }).lean();
        res.render('users/petitions', { users });
    } else {
        console.log('no');
    }
});

router.get('/registerusers', isAuthenticated, async (req, res) => {
    if (req.user.role == 'admin') {
        //const users = await User.find({ adminpermision: false }).sort({ date: 'desc' }).lean();
        const users = await User.find({ 
            adminpermision: false, 
            role: 'customer' 
        }).sort({ date: 'desc' }).lean();
        
        res.render('users/registerusers', { users });
    } else {
        console.log('no');
    }
});

router.put('/books/petitions/:id', isAuthenticated, async (req, res) => {
    const user = await User.findById(req.params.id).lean();
    const success_mssg = [];
    const books = await Book.find({ course: user.course }).sort({ date: 'desc' }).lean();

    subscription = true;
    var car = [];
    books.forEach(async function (books) {
        car.push(books.isbn);
        var demand = books.demand + 1;
        await Book.findByIdAndUpdate(books._id, { demand });
    });

    await User.findByIdAndUpdate(req.params.id, { car, subscription });
    const users = await User.find({ subscription: false, adminpermision: true }).sort({ date: 'desc' }).lean();
    success_mssg.push({ text: 'Proceso de petición con éxito' });
    //req.flash('success_msg', 'Petition process successfully');
    res.render('users/petitions', { users, success_mssg });
});


router.post('/books/allpetitions', isAuthenticated, async (req, res) => {
    const success_mssg = [];
    const userss = await User.find({ subscription: false, adminpermision: true }).sort({ date: 'desc' }).lean();
    userss.forEach(async function (users) {
        const books = await Book.find({ course: users.course }).sort({ date: 'desc' }).lean();
        subscription = true;
        var car = [];
        books.forEach(async function (books) {
            car.push(books.isbn);
            var demand = books.demand + 1;
            await Book.findByIdAndUpdate(books._id, { demand });
        });

        await User.findByIdAndUpdate(users._id, { car, subscription });
    });
    success_mssg.push({ text: 'Proceso de petición con éxito' });
    //req.flash('success_msg', 'Petition process successfully');
    res.render('users/petitions', { success_mssg });
});

router.post('/books/demanda', isAuthenticated, async (req, res) => {
    const success_mssg = [];


    const courses = User.aggregate([
        { $match: { subscription: true, adminpermision: true } },
        { $group: { _id: "$course", count: { $count: {} } } }
    ]
    ).cursor();
    
    dict = {};
    for await (const item of courses) {
        console.log(item._id + " " + item.count + "-----");
        dict[item._id] = item.count;  
    }
    
    const books = await Book.find().sort({ course: 'desc' }).lean();
    var promises = books.map(function (book) {
        // Código del for each
        console.log("entra");
        console.log(book.course);
        console.log(dict[book.course]);
        return Book.findByIdAndUpdate(book._id, {"demand": dict[book.course] });
        
    });

    Promise.all(promises).then(() => {
        req.flash('success_msg', 'Se ha actualizado la demanda');
        res.redirect('/books');
    });
    
});

router.get('/statistics', isAuthenticated, async (req, res) => {
    if (req.user.role == 'admin') {
        const books = await Book.find().sort({ course: 'desc' }).lean();
        res.render('statistics/op-statistics', { books });
    } else {
        console.log('no');
    }
});

router.get('/statistics/stock', isAuthenticated, async (req, res) => {
    if (req.user.role == 'admin') {
        const books = await Book.find().sort({ course: 'desc' }).lean();
        var result = 0;
        var cont = 0;
        const statics = [{
            title: '',
            isbn: '',
            editorial: '',
            course: '',
            resu: '',
        }];
        books.forEach(function (books) {
            result = books.demand - books.stock;
            if (result > 0) {
                cont = cont + result;
                var statics2 = [{
                    title: books.title,
                    isbn: books.isbn,
                    editorial: books.editorial,
                    course: books.course,
                    resu: result,
                }];
                statics.push.apply(statics, statics2);
            }
        });
        res.render('statistics/stock-statistics', { statics, cont });
    } else {
        console.log('no');
    }
});

router.get('/statistics/students', isAuthenticated, async (req, res) => {
    if (req.user.role == 'admin') {
        const users = await User.find({ 
            adminpermision: true,
            subscription: true,
            role: 'customer' 
        }).sort({ course: 'desc' }).lean();
        
        var cont4 = 0, cont3 = 0, cont2 = 0, cont1 = 0, total = 0, per1 = 0, per2 = 0, per3 = 0, per4;
        users.forEach(function (users) {

            if (users.course == '4ESO') {
                cont4 = cont4 + 1;
            }
            if (users.course == '3ESO') {
                cont3++;
            }
            if (users.course == '2ESO') {
                cont2++;
            }
            if (users.course == '1ESO') {
                cont1++;
            }
        });
        total = cont1 + cont2 + cont3 + cont4;
        per4 = (cont4 / total) * 100;
        per3 = (cont3 / total) * 100;
        per2 = (cont2 / total) * 100;
        per1 = (cont1 / total) * 100;
        res.render('statistics/students-statistics', { users, cont4, cont3, cont2, cont1, total, per4, per3, per2, per1 });
    } else {

        console.log('no');
    }
});
//TODO +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
router.get('/statistics/studentspenalizados', isAuthenticated, async (req, res) => {
    if (req.user.role == 'admin') {
        var cont4 = 0, cont3 = 0, cont2 = 0, cont1 = 0, total = 0, per1 = 0, per2 = 0, per3 = 0, per4;
        const fecha = new Date(); // crea un objeto Date con la fecha y hora actuales
        const anioActual = fecha.getFullYear();
        
        const users = await User.aggregate([
            // Filtrar los documentos por el año actual en entregado
            { $match: {
                subscription: true,
                adminpermision: true,
                "entregado.year": anioActual
              }
            },
            // Desagregar los documentos por entregado
            { $unwind: "$entregado" },
            // Filtrar los elementos de entregado que no coincidan con el año actual
            { $match: {
                "entregado.year": anioActual
              }
            },
            // Volver a agrupar los documentos
            { $group: {
                _id: "$_id",
                name: { $first: "$name" },
                email: { $first: "$email" },
                course: { $first: "$course" },
                car: { $first: "$car" },
                subscription: { $first: "$subscription" },
                adminpermision: { $first: "$adminpermision" },
                entregado: { $push: "$entregado" }
              }
            },
            // Ordenar los documentos por course en orden descendente
            { $sort: { course: -1 } }
          ]);
          
          
        //console.log(usuarios);
        users.forEach(function (users) {

            if (users.course == '4ESO') {
                cont4 = cont4 + 1;
            }
            if (users.course == '3ESO') {
                cont3++;
            }
            if (users.course == '2ESO') {
                cont2++;
            }
            if (users.course == '1ESO') {
                cont1++;
            }
        });
        total = cont1 + cont2 + cont3 + cont4;
        per4 = (cont4 / total) * 100;
        per3 = (cont3 / total) * 100;
        per2 = (cont2 / total) * 100;
        per1 = (cont1 / total) * 100;
        const theyear = new Date().getFullYear();
        console.log(theyear)
        res.render('statistics/students-statisticspenalizados', { users,theyear, cont4, cont3, cont2, cont1, total, per4, per3, per2, per1 });
    } else {

        console.log('no');
    }
});


router.post('/books/subscribe', isAuthenticated, async (req, res) => {
    const books = await Book.find({ course: req.user.course }).sort({ date: 'desc' }).lean();
    if (req.user.adminpermision == true && req.user.subscription == true) {
        req.flash('success_msg', 'Ahora estás suscrito');
        res.render('books/subscribe', { books });
    } else if (req.user.adminpermision == true && req.user.subscription == false) {
        sub = req.user.adminpermision;
        res.render('books/subscribe', { sub });
    } else {
        adminpermision = true;
        sub = adminpermision;
        await User.findByIdAndUpdate(req.user.id, { adminpermision });
        req.flash('success_msg', 'Ahora estás suscrito');
        res.render('books/subscribe', { sub });
    }
});

router.get('/books/edit/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    res.render('books/edit-book', { book });
});

router.put('/books/edit-book/:id', isAuthenticated, async (req, res) => {
    const { title, isbn, stock, course, demand, editorial, penalizacion } = req.body;
    await Book.findByIdAndUpdate(req.params.id, { title, isbn, stock, course, demand, editorial, penalizacion });
    req.flash('success_msg', 'Libro actualizado correctamente');
    res.redirect('/books')
});

router.put('/books/actualizarlibro/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    console.log(book);
    await User.updateMany(
        { course: book.course },
        { $push: { car: book.isbn } }
    );
    req.flash('success_msg', 'Libro actualizado en todos los usuarios');
    res.redirect('/books');
});

router.get('/statistics/userssearch', isAuthenticated, async (req, res) => {
    if (req.user.role == 'admin') {
        res.render('statistics/estudiantes-serach');
    } else {
        console.log('no');
    }
});

router.delete('/books/delete/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id);
    await User.updateMany(
        { course: book.course },
        { $pull: { car: book.isbn } }
    );
    const image = await Book.findByIdAndDelete(req.params.id);
    await unlink(path.resolve('./src/public' + image.path));
    req.flash('success_msg', 'Libro eliminado satisfactoriamente');
    res.redirect('/books');
});

module.exports = router;