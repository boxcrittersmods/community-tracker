const { MongoClient } = require('mongodb');
var dbUser = process.env.DB_USER || require("./config/token").dbUser;
var dbPassword = process.env.DB_PASSWORD || require("./config/token").dbPassword;
const uri = `mongodb+srv://${dbUser}:${dbPassword}@playerdictionary.mftw9.mongodb.net/COLLECTION?retryWrites=true&w=majority`;

async function connect(dbName) {
	let client = new MongoClient(uri.replace("COLLECTION", dbName), { useUnifiedTopology: true });
	try {
		await client.connect({ useUnifiedTopology: true });

	} catch (error) {
		console.log("unable to connect to db");
		return;

	}
	return client;
}

async function disconnect(client) {
	await client.close();
}

module.exports = {
	connect,
	disconnect
};