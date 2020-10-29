const { connect, disconnect } = require("./db"),
	SETTINGS = [];

async function reset(serverId) {
	if (!serverId) return;
	SETTINGS = SETTINGS.filter(s => s.serverId !== serverId);
	let client = await connect("settings");
	if (!client) return;
	let db = client.db(),
		collection = db.collection("settings");
	await collection.findOneAndDelete({ serverId });
	await disconnect(client);
}

async function get(serverId) {
	if (!serverId) return {};
	let settings = SETTINGS.filter(s => s.serverId == serverId);
	if (!settings) {
		let client = await connect("settings");
		if (!client) return {};
		let db = client.db(),
			collection = db.collection("settings");
		settings = await collection.findOne({ serverId }) || {};
		await disconnect(client);
	}
	return settings;
}

async function set(serverId, value = {}) {
	if (!serverId) return;
	value.serverId = serverId;
	let client = await connect("settings");
	if (!client) return;

	let id = SETTINGS.findIndex(s => s.serverId == serverId);
	db = client.db(),
		collection = db.collection("settings");
	if (id == -1) id = SETTINGS.length;
	if (!await collection.findOne({ serverId })) {
		await collection.insertOne(value);
		SETTINGS.push(value);
	} else {
		await collection.replaceOne({ serverId }, value);
		SETTINGS[id] = value;
	}
	console.log("saving", value);
	await disconnect(client);

}



module.exports = {
	get,
	set,
	reset
};