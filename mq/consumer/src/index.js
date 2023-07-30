const amqp = require('amqplib');

const { mq } = require('./config.json');

const EXCHANGE = 'IMG360UPLOAD';

async function consumer() {
  try {
    const conn = await amqp.connect(mq);
    const ch = await conn.createChannel();
    ch.assertExchange(EXCHANGE, 'topic');

    const q = await ch.assertQueue('', { exclusive: true });
    console.log(` [${EXCHANGE}] Queue ${q.queue} waiting for logs.`);
    ch.bindQueue(q.queue, EXCHANGE, '#');

    ch.consume(q.queue, (msg) => {
      console.log(" [x] %s:'%s'", msg.fields.routingKey, msg.content.toString());
    }, { noAck: true });
  } catch (e) {
    console.error(e);
  }
}

consumer();
