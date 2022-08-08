const express = require('express');
const { route } = require('.');
const router = express.Router();
const { isAuthenticated } = require('../helpers/auth');
const User = require('../models/User');

const passport = require('passport');


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
            const newUser = new User({name, email, course, password,role});
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
        const notes = await Note.find({user: req.user.id}).sort({date: 'desc'}).lean();
        res.render('notes/all-notes', { notes});
    }
    
    
});

router.delete('/users/delete/:id', isAuthenticated, async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'User delited satisfactoriamente');
    res.redirect('/users');
});

router.get('/users/logout', (req, res) =>{
    req.logout();
    res.redirect('/');
});

module.exports = router;