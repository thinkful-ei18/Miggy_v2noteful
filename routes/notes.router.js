'use strict';
const express = require('express');
const knex = require('../knex');
const router = express.Router();

// TEMP: Simple In-Memory Database
/*
const data = require('../db/notes');
const simDB = require('../db/simDB');
const notes = simDB.initialize(data);
*/

// Get All (and search by query)
/* ========== GET/READ ALL NOTES ========== */
function currentNoteHelper(note,next){
    if(note){
      res.json(note[0])
    }
    else{
      next();
    }
}

router.get('/notes', (req, res, next) => {
  const  searchTerm = req.query.searchTerm ? req.query.searchTerm : '';
  knex
    .select()
    .from('notes')
    .where('title','like',`%${searchTerm}%`)
    .orderBy('id')
    .then((response) => res.json(response))
    .catch((err) => err)

});

/* ========== GET/READ SINGLE NOTES ========== */
router.get('/notes/:id', (req, res, next) => {
  const noteId = req.params.id;
  knex
      .select()
      .from('notes')
      .where('id',`${noteId}`)
      .then((note) => {
        if(note){
          res.json(note[0])
        }
        else{
          next();
        }})
      .catch((err) => next(err));
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/notes/:id', (req, res, next) => {
  const noteId = req.params.id;
  /***** Never trust users - validate input *****/
  const updateObj = {};
  const updateableFields = ['title', 'content'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      updateObj[field] = req.body[field];
    }
  });

  /***** Never trust users - validate input *****/
  if (!updateObj.title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }


  knex('notes')
    .where('id',`${noteId}`)
    .returning(['id','title','content'])
    .update(updateObj)
    .then((note) => {
      if(note){
        res.json(note[0])
      }
      else{
        next();
      }
    })
    .catch(err=>{next(err)})
});

/* ========== POST/CREATE ITEM ========== */
router.post('/notes', (req, res, next) => {
  const { title, content } = req.body;

  const newItem = { title, content };
  /***** Never trust users - validate input *****/
  if (!newItem.title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }
  knex('notes')
    .returning(['id','title','content'])
    .insert(newItem)
    .then((note) =>{
      if(note){
        res.json(note[0])
      }
      else{
        next();
      }
    })
    .catch((err) => next(err))

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/notes/:id', (req, res, next) => {
  const id = req.params.id;
  knex('notes')
    .returning('id')
    .where({id:id})
    .del()
    .then(res.status(204).end())
    .catch((err) => next(err))
});

module.exports = router;
