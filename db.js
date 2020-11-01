const { MongoClient } = require('mongodb'),
	dbUser = process.env.DB_USER || require("./config/token").dbUser,
	dbPassword = process.env.DB_PASSWORD || require("./config/token").dbPassword,
	uri = `mongodb+srv://${dbUser}:${dbPassword}@playerdictionary.mftw9.mongodb.net/COLLECTION?retryWrites=true&w=majority`;

async function connect(dbName) {
	let client = new MongoClient(uri.replace("COLLECTION", dbName), { useUnifiedTopology: true });
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