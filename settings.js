const { MongoClient } = require('mongodb');
const { connect, disconnect } = require("./db");

async function reset(serverId) {
	if (!serverId) return;
	var client = await connect("settings");
	if (!client) return;
	var db = client.db();
	var collection = db.collection("settings");
	await collection.findOneAndDelete({ serverId });
	await disconnect(client);
}

async function get(serverId) {
	if (!serverId) return {};
	var client = await connect("settings");
	if (!client) return {};
	var db = client.db();
	var collection = db.collection("settings");
	var settings = await collection.findOne({ serverId }) || {};
	await disconnect(client);
	return settings;
}

async function set(serverId, value = {}) {
	if (!serverId) return;
	value.serverId = serverId;
	var client = await connect("settings");
	if (!client) return;
	var db = client.db();
	var collection = db.collection("settings");
	if (!await collection.findOne({ serverId })) {
		await collection.insertOne(value);
	} else {
		await collection.replaceOne({ serverId }, value);
	}
	console.log("saving", value);
	await disconnect(client);

}



module.exports = {
	get,
	set,
	reset
};