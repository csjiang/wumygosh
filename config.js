const dotenv = require('dotenv');
const cfg = {};

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  dotenv.config({path: '.env'});
} else {
  dotenv.config({path: '.env.test', silent: true});
}

// HTTP Port to run our web application
cfg.port = process.env.PORT || 2409;

// A random string that will help generate secure one-time passwords and
// HTTP sessions
cfg.secret = process.env.APP_SECRET || 'file cabinet makeup';

//twilio and AQICN api credentials
cfg.accountSid = process.env.TWILIO_ACCOUNT_SID;
cfg.authToken = process.env.TWILIO_AUTH_TOKEN;
cfg.sendingNumber = process.env.TWILIO_NUMBER;
cfg.aqiToken = process.env.AQITOKEN;

//Firebase credentials
cfg.dbPath = process.env.DBPATH;
cfg.dbUrl = process.env.DBURL;

const requiredConfig = [cfg.accountSid, cfg.authToken, cfg.sendingNumber, cfg.aqiToken, cfg.dbUrl, cfg.dbPath];
const isConfigured = requiredConfig.every(configValue => {
  return configValue || false;
});

if (!isConfigured) {
  const errorMessage =
    'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_NUMBER, AQITOKEN, DBPATH, and DBURL must be set.';

  throw new Error(errorMessage);
}

// Export configuration object
module.exports = cfg;