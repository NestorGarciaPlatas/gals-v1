const express = require('express');
const { route } = require('.');
const router = express.Router();
const { isAuthenticated } = require('../helpers/auth');
const User = require('../models/User');
const Book = require('../models/Book');
const passport = require('passport');
xlsxtojson = require('xlsx-to-json'),


router.get('/users/signin', (req, res) => {
    res.render('users/signin');
});

router.post('/users/signin',passport.authenticate('local',{
    successRedirect: '/books',
    failureRedirect: '/users/signin',
    failureFlash: true
}));

router.get('/users/signup', (req, res) =>{
    res.render('users/signup');
});

router.post('/users/signup', async (req,res)=>{
    const {name, email, course, password, confirm_password} = req.body;
    const errors=[];
    if(name.length <= 0){
        errors.push({text:'Please insert your name'});
    }
    if(course =='Select the course:'){
        errors.push({text:'Please, Select the course.'});        
    }
    if(password!=confirm_password){
        errors.push({text:'Password do not match'});
    }
    if(password.length < 4){
        errors.push({text:'Password must be at least 4 characters'});
    }
    if(errors.length > 0){
        res.render('users/signup', {errors, name, email, password, confirm_password});
    }else{
        const emailUser = await User.findOne({email: email});
        //console.log(emailUser);
        if(emailUser){
            
            req.flash('error_msg', 'The email is already in use');
            //req.flash('success_msg', 'You are registered');
            //console.log('emailUser');
            res.redirect('/users/signup');
        }else{
            role = 'customer';
            subscription = false;
            adminpermision = false;            
            const newUser = new User({name, email, course, password,role, subscription, adminpermision});            
            newUser.password = await newUser.encryptPassword(password);
            await newUser.save();
            req.flash('success_msg', 'You are registered');
            res.redirect('/users/signin');
        }
        
    }
    
});

router.get('/users', isAuthenticated, async (req,res)=>{
       
    if(req.user.role == 'admin'){        
        const users = await User.find().sort({date: 'desc'}).lean();        
        res.render('users/all-users', { users});
    }else{        
        const user = await User.findById(req.user.id);                
        res.render('users/profile', { user});
    }    
});

router.get('/users/edit/:id', isAuthenticated, async (req, res) => {
    const user = await User.findById(req.params.id).lean();
    if(req.user.role == 'admin'){        
        res.render('users/edit-user', { user });
    }else{
        res.render('users/edit-profile', { user });
    }
});

router.put('/users/edit-user/:id', isAuthenticated, async (req, res) => {
    const { name, email, role, course } = req.body;
    await User.findByIdAndUpdate(req.params.id, { name, email, role, course});
    req.flash('success_msg', 'User actualizada satisfactoriamente');
    res.redirect('/users')
});

router.put('/users/edit-profile/:id', isAuthenticated, async (req, res) => {
    const { name, course } = req.body;
    await User.findByIdAndUpdate(req.params.id, { name, course});
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
    const books = await Book.find({course:user.course}).sort({ date: 'desc' }).lean();
    res.render('users/penalty', { user , books});
});

router.get('/actualize', isAuthenticated, async (req, res) => {
    res.render('users/actualize');
});

router.post('/actualizedata', isAuthenticated, async (req, res) => {    
    let excel2json;
    excel2json = xlsxtojson;
    excel2json({
        input: req.file.path,  
        output: null, // output json 
        lowerCaseHeaders:true
    }, function(err, result) {
        if(err) {
          res.json(err);
        } else {
          res.json(result);
        }
    });
    console.log(excel2json);
});


router.get('/users/logout', function(req, res, next){
    req.logout(function(err) {
        if (err) { 
          return next(err); 
          }
        res.redirect('/');
      });
});

module.exports = router;