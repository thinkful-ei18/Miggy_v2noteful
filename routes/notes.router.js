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

  knex.select('notes.id', 'title','created','folder_id', 'folders.name as folder_name','tags.id as tags:id','tags.name as tags:name')
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
      console.log('tagSearchTerm rang true');
      const subQuery = knex.select('notes.id')
        .from('notes')
        .innerJoin('notes_tags', 'notes.id', 'notes_tags.note_id')
        .where('notes_tags.tag_id', tagSearchTerm);
      this.whereIn('notes.id', subQuery);
    }
  })
    .orderBy('notes.id')
    .then((note) => {

      const hydratedNotesArray=[];
      let hydratedNote = {};
      // console.log("THIS IS TEH START OF OUR HYDRTATION /GET ALL ");
      let counter = 0;
      note.forEach((dehydratedNote) => {
        // console.log(hydratedNote.id,'======',dehydratedNote.id)
        if(hydratedNote.id&&hydratedNote.id!=dehydratedNote.id){
          hydratedNotesArray.push(hydratedNote)}
        if(hydratedNote.id !== dehydratedNote.id){
          // console.log('STARTING A NEW NOTE',dehydratedNote.id,dehydratedNote.title);
          hydratedNote={
            id:dehydratedNote.id,
            title:dehydratedNote.title,
            content:dehydratedNote.content,
            folder_id:dehydratedNote.folder_id,
            folder_name:dehydratedNote.folder_name,
            tags:[]
          }
        }
        // console.log('pushing',dehydratedNote['tags:name']);
        hydratedNote.tags.push({
          'id':dehydratedNote['tags:id'],
          'name':dehydratedNote['tags:name']
        })
      })
      hydratedNotesArray.push(hydratedNote);
      res.json(hydratedNotesArray);
    })
    .catch((err) => next(err));
});


router.get('/notes/:id', (req, res, next) => {
  const noteId = req.params.id;

  knex.select('notes.id', 'title','content', 'folder_id', 'folders.name as folder_name' ,'tags.id as tags:id','tags.name as tags:name')
      .from('notes')
      .leftJoin('folders', 'notes.folder_id', 'folders.id')
      .leftJoin('notes_tags','notes.id','note_id')
      .leftJoin('tags','tag_id','tags.id')
      .where('notes.id', `${noteId}`)
      .then((note) => {
        if(note.length === 0 ){
          next();
        }
        else{
          const hydrated = hydroHelper(note);
          res.json(hydrated);
        }
      })
      .catch((err) => next(err));
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/notes/:id', (req, res, next) => {
  const noteId = req.params.id;
  const {tags} = req.body;

  /***** Never trust users - validate input *****/
  const updateObj = {};
  const updateableFields = ['title', 'content', 'folder_id'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      updateObj[field] = req.body[field];
    }
  });
  console.log('we out here');
  let currentNoteId;
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
    .then((id)=>{
      return knex('notes_tags')
        .returning('note_id')
        .del()
        .where('note_id',`${id}`)
    })
    .then((id) => {

      const  tagsInsert = tags.map(tagId => ({ note_id: noteId, tag_id: tagId }));
      return knex.insert(tagsInsert)
        .into('notes_tags')
        .returning('note_id');
    })
    .then((id) => {
      console.log('log cabin',id);
      currentNoteId = id;
      return knex.select('notes.id', 'title', 'content', 'folder_id', 'folders.name as folder_name', 'tags.id as tags:id', 'tags.name as tags:name')
        .from('notes')
        .leftJoin('folders', 'notes.folder_id', 'folders.id')
        .leftJoin('notes_tags', 'notes.id', 'notes_tags.note_id')
        .leftJoin('tags', 'tags.id', 'notes_tags.tag_id')
        .where('notes.id', noteId)
        .orderBy('notes.id')
    })
    .then((results) => {
      const hydrated = hydroHelper(results);
      res.location(`${req.originalUrl}/${results.id}`).status(202).json(hydrated);
    })
    .catch(err=> { next(err); });
});


/* ========== POST/CREATE ITEM ========== */
router.post('/notes', (req, res, next) => {
  const { title, content, folder_id, tags } = req.body;
  const newItem = { title, content, folder_id};

  let noteId;

  /***** Never trust users - validate input *****/
  if (!newItem.title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  knex.insert(newItem)
    .into('notes')
    .returning('id')
    .then(([id]) => {
      noteId = id;
      const  tagsInsert = tags.map(tagId => ({ note_id: noteId, tag_id: tagId }));
      return knex.insert(tagsInsert)
        .into('notes_tags');
    })
    .then(()=> {
          return knex.select('notes.id', 'title', 'content', 'folder_id', 'folders.name as folder_name', 'tags.id as tags:id', 'tags.name as tags:name')
          .from('notes')
          .leftJoin('folders', 'notes.folder_id', 'folders.id')
          .leftJoin('notes_tags', 'notes.id', 'notes_tags.note_id')
          .leftJoin('tags', 'tags.id', 'notes_tags.tag_id')
          .where('notes.id', noteId)
          .orderBy('notes.id')
    })
    .then((results) => {
      const hydrated = hydroHelper(results);
      return res.location(`${req.originalUrl}/${results.id}`).status(201).json(hydrated);
    })
    .catch((err) => next(err));

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/notes/:id', (req, res, next) => {
  const id = req.params.id;
  knex('notes')
    .returning('id')
    .where({ id: id })
    .del()
    .then(res.status(204).end())
    .catch((err) => next(err));
});




function hydroHelper(response){
  let myNewObj={}
  response.forEach((updateObj) => {
    if(updateObj===response[0]){
      myNewObj={
        id:updateObj.id,
        title:updateObj.title,
        content:updateObj.content,
        folder_id:updateObj.folder_id,
        folder_name:updateObj.folder_name,
        tags:[]
      }
    }
    myNewObj.tags.push({
      'id':updateObj['tags:id'],
      'name':updateObj['tags:name']
    })
  })
  return myNewObj;
}




module.exports = router;
