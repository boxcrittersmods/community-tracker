const { MongoClient } = require('mongodb'),
	uri = `mongodb+srv://${iTrackBC.db.user}:${iTrackBC.db.password}@${iTrackBC.db.url}?retryWrites=true&w=majority`;

async function connect() {
	let client = new MongoClient(uri, { useUnifiedTopology: true });
	try {
		console.log("Connected to database");
		await client.connect();

	} catch (error) {
		console.log("unable to connect to database");
		return;

	}
	return client;
}

async function disconnect(client) {
	console.log("Disconnected from database");
	await client.close();
}

module.exports = {
	connect,
	disconnect
};