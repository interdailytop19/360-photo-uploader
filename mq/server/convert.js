const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

try {
  const img360db = low(new FileSync('img360.json'));

  const prevState = img360db.getState();

  if (!prevState.skus) {
    console.log('no array name skus inside the img360.json');
    return;
  }

  const newState = prevState.skus
    .map(e => ({ [e.folder]: e.imgNames }))
    .reduce((obj, item) => Object.assign(obj, item));

  img360db.setState(newState).write();
  console.log('done');
} catch (e) {
  console.log(`fail: ${e}`);
}
