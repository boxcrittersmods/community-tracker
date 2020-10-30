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
	let settings = SETTINGS.find(s => s.serverId == serverId);
	if (!settings) {
		let client = await connect("settings");
		if (!client) return {};
		let db = client.db(),
			collection = db.collection("settings");
		settings = await collection.findOne({ serverId }) || {};
		SETTINGS.push(settings);
		await disconnect(client);
	}

	console.log("GET SETTINGS:", settings);
	return settings;
}

async function set(serverId, value = {}) {
	if (!serverId) return;
	value.serverId = serverId;
	let client = await connect("settings");
	if (!client) return;

	let id = SETTINGS.findIndex(s => s.serverId == serverId);
	SETTINGS[id == -1 ? SETTINGS.length : id] = value;
	db = client.db(),
		collection = db.collection("settings");
	if (!await collection.findOne({ serverId })) {
		await collection.insertOne(value);
	} else {
		await collection.replaceOne({ serverId }, value);
	}
	console.log("SETTINGS SAVE:", value);
	console.log("SETTINGS CACHE:", SETTINGS);
	await disconnect(client);

}



module.exports = {
	get,
	set,
	reset
};