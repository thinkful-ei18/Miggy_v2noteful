const knex = require('../knex');

// knex.select(1).then(res => console.log(res));
// knex
//   .select()
//   .from('notes')
// //   .then((response) => console.log(response));
// knex
//     .from('notes')
//     .where('id',`1003`)
//     .then((res) => console.log(res));

  knex('notes')
    .where('id',1001)
    .returning('id','title','content')
    .update(`${updateObj}`)
    .then((note) =>res.json(note))
