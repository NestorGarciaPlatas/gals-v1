const express = require('express');
const router = express.Router();
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

router.post('/books/new-book', isAuthenticated, async (req, res) => {
    if (req.user.role != 'admin') {
        res.redirect('/notes');
    }
    const { title, isbn, stock, course, demand } = req.body;
    const errors = [];
    if (!title) {
        errors.push({ text: 'Please Write a Title' });
    }
    if (!isbn) {
        errors.push({ text: 'Please write a Isbn' });
    }
    if (!stock) {
        errors.push({ text: 'Please write the Stock available' });
    }
    if (course == 'Select the course of the book:') {
        errors.push({ text: 'Please, Select the course of the book.' });
    }
    if (!demand) {
        errors.push({ text: 'Please write the demand in case you do not know write 0' });
    }
    if (errors.length > 0) {
        res.render('books/new-book', {
            errors,
            title,
            isbn,
            stock,
            demand
        });
    } else {
        const newBook = new Book({ title, isbn, stock, course, demand });
        await newBook.save();
        req.flash('success_msg', 'Book agregada successfully');
        res.redirect('/books');
    }

});

router.post('/books/search', isAuthenticated, async (req, res) => {

    const { search } = req.body;
    var books = await Book.find({isbn: search}).sort({ date: 'desc' }).lean();    
    const errors = [];
    const x=books.length;    
    if(books.length==0){
        errors.push({ text: 'There is no ISBN like the one you have typed in the database, type it all in or check if you have typed it correctly.' });
        books = await Book.find().sort({ date: 'desc' }).lean();
    }
    if (req.user.role == 'admin') {            
        res.render('books/all-books',{errors, books});
    } else {           
        res.render('books/the-books-order',{errors, books});
    }
});


router.get('/books', isAuthenticated, async (req, res) => {    
    if (req.user.role == 'admin') {
        const books = await Book.find().sort({ course: 'desc' }).lean();
        res.render('books/all-books', { books });
    } else {
        const books = await Book.find({course:req.user.course}).sort({ date: 'desc' }).lean();
        res.render('books/the-books-order', { books });       
    }
});

router.get('/books/donation', isAuthenticated, async (req, res) => {   
    const books = await Book.find().sort({ course: 'desc' }).lean();
    res.render('books/the-books-donation', { books });       
    
});

router.put('/books/donation/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    const {nota}=req.body;
    const stock= book.stock +1;
    const errors = [];
    const donation =[{
        isbn: book.isbn,
        nota: nota,        
    }]; 
    var isbnDonation = false;
    const usuario= await User.findById(req.user.id);
    const don = usuario.donation;
    don.forEach(function(don){        
        if(book.isbn==don.isbn){            
            isbnDonation=true;
        }
    });    
    if(isbnDonation){
        errors.push({ text: 'No puedes donar el mismo libro 2 veces' });
        const books = await Book.find().sort({ date: 'desc' }).lean();
        res.render('books/the-books-donation',{errors,books});
    }else{
        const donation2=usuario.donation;        
        donation.push.apply(donation,donation2);        
        await Book.findByIdAndUpdate(req.params.id, {  stock });    
        await User.findByIdAndUpdate(req.user.id,{donation});
        req.flash('success_msg', 'Book donated satisfactoriamente');
        res.redirect('/books/donation')
    }
    
});

router.put('/books/order/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    const demand= book.demand +1;
    const errors = [];
    const car =[book.isbn];    
    const usuario= await User.findById(req.user.id);
    const isbnCar= usuario.car.includes(book.isbn);
    //console.log(isbnCar);
    if(book.course!=req.user.course){
        errors.push({ text: 'No puedes agregar este libro ya que etsas en otro curso' });
    }
    if(isbnCar){
        errors.push({ text: 'No puedes agregar mas de 1 libro' });
    }
    if(errors.length > 0){
        const books = await Book.find({course:req.user.course}).sort({ date: 'desc' }).lean();
        res.render('books/the-books-order',{errors,books});
    }else{
        const car2=usuario.car;
        car.push.apply(car,car2);
        await Book.findByIdAndUpdate(req.params.id, {  demand });    
        await User.findByIdAndUpdate(req.user.id,{car});
        req.flash('success_msg', 'Book added satisfactoriamente');
        res.redirect('/books')
    }
    
});

router.put('/books/orderdelete/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    const demand= book.demand-1;    
    var car = [];
    var car2 = req.user.car;            
    await Book.findByIdAndUpdate(req.params.id, {  demand });
    //eliminar el isbn de car        
    car2.forEach(async function(car2) {            
        if(car2 != book.isbn){                
            car.push(car2);
        }            
    });        
    await User.findByIdAndUpdate(req.user.id,{car});
    req.flash('success_msg', 'Book delited satisfactoriamente');
    res.redirect('/books/ordercar');    
});

router.put('/books/donationdelete/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    const stock= book.stock-1;    
    var donation = [];    
    var donation2 = req.user.donation;           
    await Book.findByIdAndUpdate(req.params.id, {  stock });
    //eliminar el isbn de donation        
    donation2.forEach(async function(donation2) {            
        if(donation2.isbn != book.isbn){                
            donation.push(donation2);
        }            
    });                
    await User.findByIdAndUpdate(req.user.id,{donation});
    req.flash('success_msg', 'Book delited satisfactoriamente');
    res.redirect('/books/mydonation');    
});

router.get('/books/ordercar', isAuthenticated,async (req, res) => {
    const car = req.user.car;    
    var books = [];
    var libro =[];
    car.forEach(async function(car) {        
        libro = await Book.find({isbn: car}).sort({ date: 'desc' }).lean();
        books.push.apply(books, libro);
    });
    res.render('books/order-books',{books});    
});

router.get('/books/mydonation', isAuthenticated,async (req, res) => {
    const donation = req.user.donation;      
    var books = [];
    var libro =[];    
    donation.forEach(async function(donation) {        
        libro = await Book.find({isbn: donation.isbn}).sort({ date: 'desc' }).lean();
        books.push.apply(books, libro);
    });
    res.render('books/donation-books',{books});    
});

router.get('/books/edit/:id', isAuthenticated, async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    res.render('books/edit-book', { book });
});

router.put('/books/edit-book/:id', isAuthenticated, async (req, res) => {
    const { title, isbn, stock, course, demand } = req.body;
    await Book.findByIdAndUpdate(req.params.id, { title, isbn, stock, course, demand });
    req.flash('success_msg', 'Book actualizada satisfactoriamente');
    res.redirect('/books')
});

router.delete('/books/delete/:id', isAuthenticated, async (req, res) => {
    await Book.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Book delited satisfactoriamente');
    res.redirect('/books');
});

module.exports = router;