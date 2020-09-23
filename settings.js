const { MongoClient } = require('mongodb');
var dbUser = process.env.DB_USER || require("./config/token").dbUser;
var dbPassword = process.env.DB_PASSWORD || require("./config/token").dbPassword;
const uri = `mongodb+srv://${dbUser}:${dbPassword}@playerdictionary.mftw9.mongodb.net/settings?retryWrites=true&w=majority`;

async function connect() {
	var client = new MongoClient(uri);
	await client.connect({ useUnifiedTopology: true });
	return client;
}

async function disconnect(client) {
	await client.close();
}

async function reset(serverId) {
	if (!serverId) return;
	var client = await connect();
	var db = client.db();
	var collection = db.collection("settings");
	await collection.findOneAndDelete({ serverId })
	await disconnect(client);
}

async function get(serverId) {
	if (!serverId) return {};
	var client = await connect();
	var db = client.db();
	var collection = db.collection("settings");
	var settings = await collection.findOne({ serverId }) || {};
	await disconnect(client);
	return settings;
}

async function set(serverId, value = {}) {
	if (!serverId) return;
	value.serverId = serverId;
	var client = await connect();
	var db = client.db();
	var collection = db.collection("settings");
	if (!await collection.findOne({ serverId })){
		await collection.insertOne(value);
	} else {
		await collection.replaceOne({ serverId }, value);
	}
	await disconnect(client);

}



module.exports = {
	get,
	set,
	reset
}