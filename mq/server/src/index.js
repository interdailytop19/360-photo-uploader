// koa
const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const Router = require('koa-router');
const serve = require('koa-static');

// amqp
const amqp = require('amqplib');

const EXCHANGE = 'IMG360UPLOAD';

// lowdb
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const img360db = low(new FileSync('img360.json'));

const array = require('lodash/array');

// config
const { prefix, port, mq } = require('./config.json');

async function server() {
  try {
    // set up mq
    let ch;
    if (mq) {
      const conn = await amqp.connect(mq);
      ch = await conn.createChannel();
      await ch.assertExchange(EXCHANGE, 'topic');
    }

    // set up koa
    const app = new Koa();
    const router = new Router({ prefix });

    app.use(bodyParser());

    // image 360 upload success
    router.post('/img360', async ctx => {
      const { rawBody, body } = ctx.request;

      let isSent = false;

      if (mq) {
        try {
          isSent = ch.publish(
            EXCHANGE,
            'img360.uploaded',
            Buffer.from(rawBody)
          );
        } catch (e) {
          console.log('error sending mq', e.stack);
        }
      } else {
        isSent = true;
      }

      try {
        // write to lowdb
        const { folder, imgNames } = body;
        const sku = img360db.get(folder).value();
        if (sku !== undefined) {
          img360db.set(folder, array.union(sku, imgNames).sort()).write();
        } else {
          img360db.set(folder, imgNames).write();
        }
      } catch (e) {
        console.log('write to lowdb error : ', e);
      }

      if (isSent) {
        ctx.status = 200;
        ctx.body = 'success';
      } else {
        ctx.status = 401;
        ctx.body = 'fail';
      }
    });

    // return list of sku
    router.get('/img360', ctx => {
      try {
        const stateObj = img360db.getState()

        ctx.status = 200;
        ctx.body = Object.keys(stateObj).map(e => ({ folder: e, imgs: stateObj[e] }));
      } catch (e) {
        console.log('get error : ', e);
        ctx.status = 401;
        ctx.body = 'fail';
      }
    });

    // return info of individual SKU
    router.get('/img360/sku/:sku', ctx => {
      try {
        const { params } = ctx;

        const queryData = img360db.get(params.sku).value();

        if (queryData) {
          ctx.status = 200;
          ctx.body = queryData;
        } else {
          ctx.status = 404;
        }
      } catch (e) {
        console.log('get error : ', e);
        ctx.status = 401;
        ctx.body = 'fail';
      }
    });

    router.get('/img360/list', ctx => {
      try {
        const queryData = Object.keys(img360db.getState());

        if (queryData.length > 0) {
          ctx.status = 200;
          ctx.body = queryData;
        } else {
          ctx.status = 404;
        }
      } catch (e) {
        console.log('get error : ', e);
        ctx.status = 401;
        ctx.body = 'fail';
      }
    });

    app
      .use(cors())
      .use(serve('static'))
      .use(router.routes())
      .use(router.allowedMethods());

    app.listen(port, () => console.log(`Listening to ${port}`));
  } catch (e) {
    console.error(e);
  }
}

server();
