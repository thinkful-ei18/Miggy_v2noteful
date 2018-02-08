const express = require('express')
const knex = require('../knex');
const router = express.Router();

const {UNIQUE_VIOLATION} = require('pg-error-constants');

router.get('/tags',(req,res,next) => {
  knex
    .select()
    .from('tags')
    .then((tagItems) => res.json(tagItems))
    .catch((err) => next(error));
});

router.get('/tags/:id',(req,res,next) => {
  const tagId = req.params.id
  knex
    .select()
    .from('tags')
    .where('id',tagId)
    .then((tagItems) => res.json(tagItems))
    .catch((err) => next(err));
})
router.put('/tags/:id',(req,res,next) => {
  const tagId = req.params.id;

  const {name} = req.body
  const updateTag = {name};

  if(!updateTag.name){
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  knex('tags')
    .where('id',`${tagId}`)
    .returning(['id','name'])
    .update(updateTag)
    .then((result) => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result)})
    .catch(err => {
       if (err.code === UNIQUE_VIOLATION && err.constraint === 'tags_name_key') {
         console.log(err);
         err = new Error('Tags name is already taken');
         err.status = 409;
       }
       next(err);
     });
})
router.post('/tags',(req,res,next) => {
  const {name} = req.body
  const newTag = {name};
  if(!name){
    const err = new Error('missing`name` in request body');
    err.status=400;
    return next(err);
  }

  knex('tags')
    .returning(['id','name'])
    .insert(newTag)
    .then((result)=>res.location(`${req.originalUrl}/${result.id}`).status(201).json(result))
    .catch(err => {
     if (err.code === UNIQUE_VIOLATION && err.constraint === 'tags_name_key') {
       console.log(err);
       err = new Error('Tags name is already taken');
       err.status = 409;
     }
     next(err);
   });
})




router.delete('/tags/:id',(req,res,next) => {
  const tagId = req.params.id
  knex('tags')
    .where({id:tagId})
    .del()
    .then(res.status(204).end())
    .catch((err)=>next(err));


})


module.exports = router;
