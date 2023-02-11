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

router.get('/books/add', isAuthenticated, (req, res) => {
    if (req.user.role != 'admin') {
        res.redirect('/notes');
    } else {
        res.render('books/new-book');
    }
});

router.post('/books/new-book', uploadimage.single('image'), isAuthenticated, async (req, res) => {
    if (req.user.role != 'admin') {
        res.redirect('/notes');
    }
    const { title, isbn, stock, course, demand, editorial, penalizacion } = req.body;
    const { filename, originalname, size, mimetype } = req.file;
    const errors = [];

    if (!title) {
        errors.push({ text: 'Please Write a Title' });
    }
    if (!isbn) {
        errors.push({ text: 'Please write an Isbn' });
    }
    if (!editorial) {
        errors.push({ text: 'Please write an Editorial' });
    }
    if (!stock) {
        errors.push({ text: 'Please write the Stock available' });
    }
    if (!penalizacion) {
        errors.push({ text: 'Please write the Penalization of the book' });
    }
    if (course == 'Select the course of the book:') {
        errors.push({ text: 'Please, Select the course of the book.' });
    }
    if (!demand) {
        errors.push({ text: 'Please write the demand in case you do not know write 0' });
    }

    //console.log(req.file);
    if (errors.length > 0) {
        if (filename) {
            await unlink(path.resolve('./src/public/img/uploads/' + filename));
            errors.push({ text: 'Upload again the photo' });
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
        req.flash('success_msg', 'Book agregada successfully');
        res.redirect('/books');
    }

});

router.post('/books/search', isAuthenticated, async (req, res) => {

    const { search } = req.body;
    var books = await Book.find({ isbn: search }).sort({ date: 'desc' }).lean();
    const errors = [];
    const x = books.length;
    if (books.length == 0) {
        errors.push({ text: 'There is no ISBN like the one you have typed in the database, type it all in or check if you have typed it correctly.' });
        books = await Book.find().sort({ date: 'desc' }).lean();
    }
    if (req.user.role == 'admin') {
        res.render('books/all-books', { errors, books });
    } else {
        res.render('books/the-books-order', { errors, books });
    }
});


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
        const users = await User.find({ adminpermision: false }).sort({ date: 'desc' }).lean();
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
    success_mssg.push({ text: 'Petition process successfully' });
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
    success_mssg.push({ text: 'Petition process successfully' });
    //req.flash('success_msg', 'Petition process successfully');
    res.render('users/petitions', { success_mssg });
});

router.post('/books/demanda', isAuthenticated, async (req, res) => {
    const success_mssg = [];

    /*const count4 = await User.countDocuments({ subscription: true, adminpermision: true, course: "4ESO" });
    const count3 = await User.countDocuments({ subscription: true, adminpermision: true, course: "3ESO" });
    const count2 = await User.countDocuments({ subscription: true, adminpermision: true, course: "2ESO" });
    const count1 = await User.countDocuments({ subscription: true, adminpermision: true, course: "1ESO" });*/

    const courses = User.aggregate([
        { $match: { subscription: true, adminpermision: true } },
        { $group: { _id: "$course", count: { $count: {} } } }
    ]
    ).cursor();
    //courses = JSON.parse(courses);
    //console.log(courses);
    dict = {};
    for await (const item of courses) {
        console.log(item._id + " " + item.count + "-----");
        dict[item._id] = item.count;  
    }
    /*courses.foreach(function (item) {
        dict[item._id] = item.count;
    });*/
    const books = await Book.find().sort({ course: 'desc' }).lean();
    var promises = books.map(function (book) {
        // Código del for each
        console.log("entra");
        console.log(book.course);
        console.log(dict[book.course]);
        return Book.findByIdAndUpdate(book._id, {"demand": dict[book.course] });
        /*switch (book.course) {
            case '4ESO':
                var demand = count4;
                console.log(book.title + " " + demand + "-----");
                return Book.findByIdAndUpdate(book._id, { "demand": demand });
                break;
            case '3ESO':
                var demand = count3;
                return Book.findByIdAndUpdate(book._id, { demand });
                break;
            case '2ESO':
                var demand = count2;
                return Book.findByIdAndUpdate(book._id, { demand });
                break;
            case '1ESO':
                var demand = count1;
                return Book.findByIdAndUpdate(book._id, { demand });
                break;
        }*/
    });

    Promise.all(promises).then(() => {
        // Código después del for-each
        /*console.log("4ESO: " + count4);
        console.log("3ESO: " + count3);
        console.log("2ESO: " + count2);
        console.log("1ESO: " + count1);*/

        req.flash('success_msg', 'Se ha actualizado la demanda');
        res.redirect('/books');
    });
    /*books.forEach(async function (book) {
        switch (book.course) {
            case '4ESO':
                var demand = count4;
                console.log(book.title + " " + demand + "-----");
                await Book.findByIdAndUpdate(book._id, { "demand": demand });/*,
                function (err, docs) {
                    if (err) {
                        console.log(err)
                    }
                    else {
                        console.log("Updated User : ", docs);
                    }
                
                break;
            case '3ESO':
                var demand = count3;
                await Book.findByIdAndUpdate(book._id, { demand });
                break;
            case '2ESO':
                var demand = count2;
                await Book.findByIdAndUpdate(book._id, { demand });
                break;
            case '1ESO':
                var demand = count1;
                await Book.findByIdAndUpdate(book._id, { demand });
                break;
        }
    });*/

    /*console.log("4ESO: " + count4);
    console.log("3ESO: " + count3);
    console.log("2ESO: " + count2);
    console.log("1ESO: " + count1);

    req.flash('success_msg', 'Se ha actualizado la demanda');
    res.redirect('/books');*/
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
        const users = await User.find().sort({ course: 'desc' }).lean();
        var cont4 = 0, cont3 = 0, cont2 = 0, cont1 = 0, total = 0, per1 = 0, per2 = 0, per3 = 0, per4;;

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

router.get('/books/donation', isAuthenticated, async (req, res) => {
    const books = await Book.find().sort({ course: 'desc' }).lean();
    res.render('books/the-books-donation', { books });

});

router.post('/books/subscribe', isAuthenticated, async (req, res) => {
    const books = await Book.find({ course: req.user.course }).sort({ date: 'desc' }).lean();
    if (req.user.adminpermision == true && req.user.subscription == true) {
        req.flash('success_msg', 'You are now subcribed');
        res.render('books/subscribe', { books });
    } else if (req.user.adminpermision == true && req.user.subscription == false) {
        sub = req.user.adminpermision;
        res.render('books/subscribe', { sub });
    } else {
        adminpermision = true;
        sub = adminpermision;
        await User.findByIdAndUpdate(req.user.id, { adminpermision });
        req.flash('success_msg', 'You are now subcribed');
        res.render('books/subscribe', { sub });
    }
});

router.put('/books/donation/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    const { nota } = req.body;
    const stock = book.stock + 1;
    const errors = [];
    const donation = [{
        isbn: book.isbn,
        nota: nota,
    }];
    var isbnDonation = false;
    const usuario = await User.findById(req.user.id);
    const don = usuario.donation;
    don.forEach(function (don) {
        if (book.isbn == don.isbn) {
            isbnDonation = true;
        }
    });
    if (isbnDonation) {
        errors.push({ text: 'No puedes donar el mismo libro 2 veces' });
        const books = await Book.find().sort({ date: 'desc' }).lean();
        res.render('books/the-books-donation', { errors, books });
    } else {
        const donation2 = usuario.donation;
        donation.push.apply(donation, donation2);
        await Book.findByIdAndUpdate(req.params.id, { stock });
        await User.findByIdAndUpdate(req.user.id, { donation });
        req.flash('success_msg', 'Book donated satisfactoriamente');
        res.redirect('/books/donation')
    }

});

router.put('/books/order/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    const demand = book.demand + 1;
    const errors = [];
    const car = [book.isbn];
    const usuario = await User.findById(req.user.id);
    const isbnCar = usuario.car.includes(book.isbn);
    //console.log(isbnCar);
    if (book.course != req.user.course) {
        errors.push({ text: 'No puedes agregar este libro ya que etsas en otro curso' });
    }
    if (isbnCar) {
        errors.push({ text: 'No puedes agregar mas de 1 libro' });
    }
    if (errors.length > 0) {
        const books = await Book.find({ course: req.user.course }).sort({ date: 'desc' }).lean();
        res.render('books/the-books-order', { errors, books });
    } else {
        const car2 = usuario.car;
        car.push.apply(car, car2);
        await Book.findByIdAndUpdate(req.params.id, { demand });
        await User.findByIdAndUpdate(req.user.id, { car });
        req.flash('success_msg', 'Book added satisfactoriamente');
        res.redirect('/books')
    }

});

router.put('/books/orderdelete/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    const demand = book.demand - 1;
    var car = [];
    var car2 = req.user.car;
    await Book.findByIdAndUpdate(req.params.id, { demand });
    //eliminar el isbn de car        
    car2.forEach(async function (car2) {
        if (car2 != book.isbn) {
            car.push(car2);
        }
    });
    await User.findByIdAndUpdate(req.user.id, { car });
    req.flash('success_msg', 'Book delited satisfactoriamente');
    res.redirect('/books/ordercar');
});

router.put('/books/donationdelete/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    const stock = book.stock - 1;
    var donation = [];
    var donation2 = req.user.donation;
    await Book.findByIdAndUpdate(req.params.id, { stock });
    //eliminar el isbn de donation        
    donation2.forEach(async function (donation2) {
        if (donation2.isbn != book.isbn) {
            donation.push(donation2);
        }
    });
    await User.findByIdAndUpdate(req.user.id, { donation });
    req.flash('success_msg', 'Book delited satisfactoriamente');
    res.redirect('/books/mydonation');
});

router.get('/books/ordercar', isAuthenticated, async (req, res) => {
    const car = req.user.car;
    var books = [];
    var libro = [];
    car.forEach(async function (car) {
        libro = await Book.find({ isbn: car }).sort({ date: 'desc' }).lean();
        books.push.apply(books, libro);
    });
    res.render('books/order-books', { books });
});

router.get('/books/mydonation', isAuthenticated, async (req, res) => {
    const donation = req.user.donation;
    var books = [];
    var libro = [];
    donation.forEach(async function (donation) {
        libro = await Book.find({ isbn: donation.isbn }).sort({ date: 'desc' }).lean();
        books.push.apply(books, libro);
    });
    res.render('books/donation-books', { books });
});

router.get('/books/edit/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    res.render('books/edit-book', { book });
});

router.put('/books/edit-book/:id', isAuthenticated, async (req, res) => {
    const { title, isbn, stock, course, demand, editorial, penalizacion } = req.body;
    await Book.findByIdAndUpdate(req.params.id, { title, isbn, stock, course, demand, editorial, penalizacion });
    req.flash('success_msg', 'Book actualizada satisfactoriamente');
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

router.delete('/books/delete/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id);
    await User.updateMany(
        { course: book.course },
        { $pull: { car: book.isbn } }
    );
    const image = await Book.findByIdAndDelete(req.params.id);
    await unlink(path.resolve('./src/public' + image.path));
    req.flash('success_msg', 'Book delited satisfactoriamente');
    res.redirect('/books');
});

module.exports = router;