const express = require('express');
const knex = require('../knex');
const router = express.Router();

router.get('/folders',(req,res,next) => {
  knex
  .select()
  .from('folders')
  .orderBy('id')
  .then((response) => {res.json(response)})
  .catch((err) => next(err));
});

router.get('/folders/:id',(req,res,next) => {
  const folderId = req.params.id;
  knex
    .select()
    .from('folders')
    .where('id',`${folderId}`)
    .then((response) => res.json(response))
    .catch((err) => next(err));

});

router.put('/folders/:id',(req,res,next) => {
  const folderId = req.params.id;
  const {name} = req.body;

  const updateFolder = {name};
  console.log(updateFolder)
  if(!updateFolder.name){
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  knex('folders')
    .where('id',`${folderId}`)
    .returning('name')
    .update(updateFolder)
    .then((folder) => {
      if(folder){
        res.json(folder)
      }
      else{
        next();
      }
    })
    .catch(err=>{next(err)})
});

router.post('/folders',(req,res,next) => {
  const {name} =req.body;
  const newFolder = {name};
  if(!newFolder.name){
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }
  knex('folders')
    .returning('name')
    .insert(newFolder)
    .then((folder) => {
      if(folder){
        res.json(folder)
      }
      else{
        next();
      }
    })
    .catch((err) => next(err));
})

router.delete('/folders/:id',(req,res,next) => {
  const folderId = req.params.id;
  knex('folders')
    .where({id:folderId})
    .del()
    .then(res.status(204).end())
    .catch((err) => next(err));
})


module.exports = router;
