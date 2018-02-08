'use strict';
const express = require('express');
const knex = require('../knex');
const router = express.Router();
const Treeize = require('treeize');

// TEMP: Simple In-Memory Database
/*
const data = require('../db/notes');
const simDB = require('../db/simDB');
const notes = simDB.initialize(data);
*/

// Get All (and search by query)
/* ========== GET/READ ALL NOTES ========== */
router.get('/notes', (req, res, next) => {
  const  searchTerm = req.query.searchTerm ? req.query.searchTerm : '';
  const  folderSearchTerm = req.query.folderId ? req.query.folderId : null;
  const  tagSearchTerm = req.query.tagId ? req.query.tagId : null;


  knex.select('notes.id', 'title','content', 'folder_id', 'folders.name as folder_name','tags.id as tags:id','tags.name as tags:name')
    .from('notes')
    .leftJoin('folders', 'notes.folder_id', 'folders.id')
    .leftJoin('notes_tags','notes.id','note_id')
    .leftJoin('tags','tag_id','tags.id')
    .where('title', 'like', `%${searchTerm}%`)
    .where(function () {
      if (req.query.folderId) {
        this.where('folder_id', req.query.folderId);
      }
    })
    .where(function () {
    if (tagSearchTerm) {
      const subQuery = knex.select('notes.id')
        .from('notes')
        .innerJoin('notes_tags', 'notes.id', 'notes_tags.note_id')
        .where('notes_tags.tag_id', tagSearchTerm);
      this.whereIn('notes.id', subQuery);
    }
  })
    .orderBy('notes.id')
    .then((results) => {
      const treeize = new Treeize();
      treeize.grow(results);
      const hydrated = treeize.getData();
      res.json(hydrated);
    })
    .catch((err) => next(err));
});


router.get('/notes/:id', (req, res, next) => {
  const noteId = req.params.id;
  knex.select('notes.id', 'title', 'folder_id', 'folders.name as folder_name','tags.id as tags:id','tags.name as tags:name')
      .from('notes')
      .leftJoin('folders', 'notes.folder_id', 'folders.id')
      .leftJoin('notes_tags','notes.id','note_id')
      .leftJoin('tags','tag_id','tags.id')
      .where('notes.id', `${noteId}`)
      .then((note) => {
        if(note.length ===0 ){
          next();
        }
        else{
          const treeize = new Treeize();
          treeize.grow(note);
          const hydrated = treeize.getData();
          res.json(hydrated);
        }
      })
      .catch((err) => next(err));
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/notes/:id', (req, res, next) => {
  const noteId = req.params.id;
  /***** Never trust users - validate input *****/
  const updateObj = {};
  const updateableFields = ['title', 'content', 'folder_id'];
  let currentNoteId;

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
    .where('id', `${noteId}`)
    .returning('id')
    .update(updateObj)
    .then(([id]) => {
      currentNoteId = id;
      return knex.select('notes.id', 'title', 'content', 'folder_id', 'folders.name as folder_name')
        .from('notes')
        .leftJoin('folders', 'notes.folder_id', 'folders.id')
        .where('notes.id', currentNoteId);
    })
    .then(([result]) => {
      res.location(`${req.originalUrl}/${result.id}`).status(202).json(result);
    })
    .catch(err=> { next(err); });
});

/* ========== POST/CREATE ITEM ========== */
router.post('/notes', (req, res, next) => {
  const { title, content, folder_id, tags } = req.body;

  const newItem = { title, content, folder_id };
  /***** Never trust users - validate input *****/
  if (!newItem.title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  let noteId;
  knex('notes')
    .insert(newItem)
    .returning('id')
    .then(([id])=> {
      noteId = id;
      return knex.select('notes.id', 'title', 'content', 'folder_id', 'folders.name as folder_name')
        .from('notes')
        .leftJoin('folders', 'notes.folder_id', 'folders.id')
        .where('notes.id', noteId);
    })
    .then(([result]) => {
        res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
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
