const express = require('express');
const router = express.Router();

const Note = require('../models/Note');
const { isAuthenticated } = require('../helpers/auth');
const User = require('../models/User');

router.get('/notes/add', isAuthenticated, (req, res)=>{
    res.render('notes/new-note');
});

router.post('/notes/new-note', isAuthenticated, async (req, res)=>{
    const {title, description } = req.body;
    const errors =[];
    if(!title){
        errors.push({text:'Please Write a Title'});
    }
    if(!description){
        errors.push({text:'Please write a description'});
    }
    if(errors.length>0){
        res.render('notes/new-note', {
            errors,
            title,
            description
        });
    }else{
        const newNote = new Note({title, description});
        newNote.user = req.user.id;
        newNote.role = 'admin';
        await newNote.save();
        req.flash('success_msg', 'Nota agregada successfully');
        res.redirect('/notes');        
    }
    
});

router.get('/notes', isAuthenticated, async (req,res)=>{    
    if(req.user.role == 'admin'){        
        const notes = await Note.find().sort({date: 'desc'}).lean();        
        res.render('notes/all-notes', { notes});
    }else{        
        const notes = await Note.find({user: req.user.id}).sort({date: 'desc'}).lean();
        console.log(notes);
        res.render('notes/all-notes', { notes});
    }
    
    
});

router.get('/notes/edit/:id', isAuthenticated, async (req, res)=>{
   const note = await Note.findById(req.params.id).lean();
   res.render('notes/edit-note',{note}); 
});

router.put('/notes/edit-note/:id', isAuthenticated, async (req, res)=>{
    const {title, description} = req.body;
    await Note.findByIdAndUpdate(req.params.id, {title, description});
    req.flash('success_msg', 'Nota actualizada satisfactoriamente');
    res.redirect('/notes')
});

router.delete('/notes/delete/:id', isAuthenticated, async (req, res) =>{
    await Note.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Nota delited satisfactoriamente');
    res.redirect('/notes');    
});

module.exports = router;