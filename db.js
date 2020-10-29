const { MongoClient } = require('mongodb');
var dbUser = process.env.DB_USER || require("./config/token").dbUser;
var dbPassword = process.env.DB_PASSWORD || require("./config/token").dbPassword;
const uri = `mongodb+srv://${dbUser}:${dbPassword}@playerdictionary.mftw9.mongodb.net/COLLECTION?retryWrites=true&w=majority`;

async function connect(collection) {
	var client = new MongoClient(uri.replace("COLLECTION", collection), { useUnifiedTopology: true });
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

async function addToDB(playerId, nickname) {
	var client = await connect("playerIds");
	if (!client) return;
	var db = client.db();
	var collection = db.collection("playerIds");
	collection.insertOne({ nickname, playerId });
	await disconnect(client);

}

async function getUsenames() {
	var client = await connect();
	if (!client) return [];
	var db = client.db();
	var collection = db.collection("playerIds");
	var usernames = await collection.distinct("nickname");
	await disconnect(client);
	return usernames;

}



async function getFromDB(nickname) {
	var client = await connect();
	if (!client) return;
	var db = client.db();
	var collection = db.collection("playerIds");
	var player = await collection.findOne({ nickname });
	await disconnect(client);
	if (!player) return;
	return player.playerId;
}

module.exports = {
	connect,
	disconnect,
	add: addToDB,
	get: getFromDB,
	list: getUsenames
};