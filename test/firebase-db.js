const admin = require('firebase-admin');
const serviceAccount = require('../private/wumygoshkey.json');
const checkAQI = require('./aqi-checker');

//initialize Firebase app 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://wumygosh.firebaseio.com', //config.dbUrl
});

const db = admin.database();
const ref = db.ref('/subscribers'); //config.dbPath

const assignBulkMessages = () => {
	let users = {};

	return ref.orderByChild('city').once('value')
	.then(function(snapshot) {
	    snapshot.forEach(child => {
		  	const city = child.val().city;
		  	if (!users[city]) {
		  		users[city] = [ { number: child.key } ];
		  	} else users[city].push( { number: child.key });
		});
	})
	.then(() => {
		return new Promise(function(resolve, reject) {
			Object.keys(users).forEach(city => {
				const airForCity = checkAQI(city);
				airForCity
			  		.then(result => {
			  			users[city].forEach(user => {
			  				user.message = result;
			  			});
			  		})
			  		.then(() => {
			  			if (Object.keys(users).indexOf(city) === Object.keys(users).length - 1) resolve(users);
			  		});
			});
		});
	})
	.then(usersByCity => {
		let flatArray = [];
		Object.keys(usersByCity).forEach(city => {
			flatArray = flatArray.concat(usersByCity[city]);
		});
		return flatArray;
	});
};

const errorCb = error => {
  if (error) {
    console.log('Data could not be saved.' + error);
  } else {
    console.log('Data saved successfully.');
  }
};

const createUser = (number, city) => {
	return ref.child(number).set({ city }, errorCb);
};

const removeUser = number => {
	return ref.child(number).remove();
};

const checkForUser = number => {
  return ref
    .child(number)
    .once('value')
    .then(dataSnapshot => {
    	return dataSnapshot.exists()
    	? Promise.resolve({ exists: true, city: dataSnapshot.val().city })
    	: Promise.resolve({ exists: false })
    });
};

module.exports = { assignBulkMessages, createUser, removeUser, checkForUser };

// Clear the whole DB 
	// ref.remove();

// Clear just one child node
	// ref.child(key).remove();

// Set with unique IDs
	// ref.child('test').set({
	//   city: 'Beijing'
	// }, errorCb);

// Set with auto-generated unique IDs
	// ref.push({
	//   number: 'test2',
	//   city: 'Shanghai'
	// }, errorCb);
