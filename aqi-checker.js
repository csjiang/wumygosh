const rp = require('request-promise');
const config = require('./config');

const generateMessage = city => {
  const theCity = city.toString();
  let message;
  const aqiToken = config.aqiToken; 
  const options = {
    uri: `http://api.waqi.info/feed/${theCity}/?token=${aqiToken}`,
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true 
  };

  return rp(options)
  .then(data => {
    //return the appropriate message based on air pollution index 
    const realTimeAQI = data.data.aqi;

    switch (true) {
      case (realTimeAQI < 50): 
        return `我的妈呀，今天的AQI只有${realTimeAQI}，太好了！赶快出去享受！`
      case (realTimeAQI < 150): 
        return `现在的AQI指数为${realTimeAQI}，你要出去的话还是戴个口罩吧！`
      case (realTimeAQI < 250): 
        return `哎呀，现在的AQI指数为${realTimeAQI}，要出去的话得记得戴好口罩哦！`
      case (realTimeAQI < 350): 
        return `天哪，现在的AQI指数高达${realTimeAQI}，最好不要在外面活动，出门的话必须得戴上口罩呀！`
      case (realTimeAQI < 450): 
        return `神马！现在的AQI指数高达${realTimeAQI}，今天还是躲在家里看书吧。。。`
      case (realTimeAQI >= 450): 
        return `现在的PM2.5指数居然是${realTimeAQI}。。。快去买个净化器，再也不出门了。`
    }
  })
  .catch(() => '好像查不到现在的PM2.5。。。要不你自己上网查一下？ https://aqicn.org/')
};

module.exports = generateMessage;