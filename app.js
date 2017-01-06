const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const morgan = require('morgan');
const http = require('http');
const twilio = require('twilio');
const admin = require('firebase-admin');
const serviceAccount = require('./private/wumygoshkey.json');
const client = twilio(config.accountSid, config.authToken);
const cronJob = require('cron').CronJob;

const generateMessage = require('./aqi-checker');
const config = require('./config');

//initialize Express app 
const app = express();

//initialize Firebase app 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: config.dbUrl,
});

// utility functions for Firebase
const createUser = (number, city) => {
  admin.auth().createUser({
    uid: number,
    displayName: city,
    disabled: false
  })
    .then(userRecord => {
      console.log("Successfully created new user:", userRecord.uid);
    })
    .catch(error => console.log(error));
};

const deleteUser = number => {
  admin.auth().deleteUser(number)
    .then(function() {
      console.log("Successfully deleted user");
    })
    .catch(function(error) {
      console.log("Error deleting user:", error);
    });
};

const users = [];

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
  const city = req.body.Body.trim().toLowerCase();
  const aqiMessage = generateMessage(city);
  let greeting;
  if (users.indexOf(fromNum) !== -1) {
    greeting = '您已经订阅了！如果您想取消订阅，请回复“STOP”.';
  } else if (city === 'stop') {
    greeting = '好滴，谢谢利用雾霾gosh！您的订阅将被取消。再给您最后一次的aqi报告：';
    users.splice(users.findIndex(user => {
      return user.number === fromNum
    }));
    deleteUser(fromNum);
  } else {
    greeting = '谢谢订阅雾霾gosh！如果您想取消订阅，请回复“STOP”.';
    users.push({
      number: fromNum,
      city
    });
    createUser(fromNum, city);
  }
  aqiMessage.then(message => {
    twiml.message(`${greeting} ${message}`);
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
  });
});

// Start the server and schedule cronJob
http.createServer(app).listen(config.port, () => {
  console.log(`Express server listening on port ${config.port}`);

    // Sends SMS AQI updates to all users at 9:00 AM China Standard Time daily. 
    const textJob = new cronJob('00 09 * * *', function() {
      users.forEach(user => {
        generateMessage(user.city)
        .then(result => {
          client.sendMessage( { 
              to: user.number, 
              from: config.sendingNumber, 
              body: result 
          }, function( err, data ) {});
        })
        .catch(e => console.log(e));
      });
    }, null, true, 'Asia/Shanghai');
});

// Export Express app
module.exports = app;