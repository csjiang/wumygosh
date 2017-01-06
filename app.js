const express = require('express');
const http = require('http');

const bodyParser = require('body-parser');
const session = require('express-session');
const morgan = require('morgan');

const twilio = require('twilio');
const client = twilio(config.accountSid, config.authToken);
const cronJob = require('cron').CronJob;

const dbUtils = require('./firebase-db');
const checkAQI = require('./aqi-checker');

const config = require('./config');

//initialize Express app 
const app = express();

// logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// body-parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// session middleware
app.use(session({
  secret: config.secret,
  resave: true,
  saveUninitialized: true
}));

// Handle subscription
app.post('/', (req, res) => {
  const twiml = new twilio.TwimlResponse();
  const fromNum = req.body.From;
  const content = req.body.Body.trim().toLowerCase();
  let aqiMessage;
  let greeting;

  dbUtils.checkForUser(fromNum)
  .then(results => {
    if (results.exists && content === 'wubye') {
      greeting = '好滴，谢谢利用雾霾gosh！您的订阅将被取消。如果想查看其他城市的AQI请回复该城市名的拼音。再给您最后一次的AQI报告：';
      aqiMessage = checkAQI(results.city);
      dbUtils.removeUser(fromNum);
    } else if (results.exists) {
      greeting = '您已经订阅了！如果您想取消订阅，请回复“WUBYE”。如果想查看其他城市的AQI请回复该城市名的拼音。';
      aqiMessage = checkAQI(content);
    } else {
      greeting = '谢谢订阅雾霾gosh！如果您想取消订阅，请回复“WUBYE”。 如果想查看其他城市的AQI请回复该城市名的拼音。';
      dbUtils.createUser(fromNum, content);
      aqiMessage = checkAQI(content);
    }
  })
  .then(() => {
    aqiMessage
    .then(message => {
      twiml.message(`${greeting} ${message}`);
      res.writeHead(200, {'Content-Type': 'text/xml'});
      res.end(twiml.toString());
    });
  });
});

// Start the server and schedule cronJob
http.createServer(app).listen(config.port, () => {
  console.log(`Express server listening on port ${config.port}`);
    // Sends SMS AQI updates to all subscribers at 9:00 AM China Standard Time daily. 
    const textJob = new cronJob('00 09 * * *', function() {
    dbUtils.assignBulkMessages()
    .then(results => {
      results.forEach(user => {
        client.sendMessage({
          to: user.number,
          from: config.sendingNumber,
          body: '雾霾gosh，早上好！' + user.message
        }, function (err, data) {});
      });
    })
    .catch(e => console.log(e));
  }, null, true, 'Asia/Shanghai');
});

// Export Express app
module.exports = app;