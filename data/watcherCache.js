const { connect, disconnect } = require("./db"),
	WATCHER_CACHE = [];

async function cacheWatcher(watcherId, data) {
	if (void 0 == watcherId) return;
	let field = { watcherId, data },
		client = await connect();
	if (void 0 == client) return;

	let id = WATCHER_CACHE.findIndex(w => w.watcherId == watcherId);
	WATCHER_CACHE[id == -1 ? WATCHER_CACHE.length : id] = field;
	let db = client.db(),
		collection = db.collection("watcherCache");
	if (await collection.findOne({ watcherId })) {
		await collection.replaceOne({ watcherId }, field);
	} else {
		await collection.insertOne(field);
	}
	await disconnect(client);
}

async function getWatcherCache(watcherId) {
	if (void 0 == watcherId) return;
	let field = WATCHER_CACHE.find(w => w.watcherId == watcherId);
	if (!field) {
		let client = await connect();
		if (void 0 == client) return;
		let db = client.db(),
			collection = db.collection("watcherCache");
		field = await collection.findOne({ watcherId }) || {};
		WATCHER_CACHE.push(field);
		await disconnect(client);
	}
	if (field) return field.data;
}

module.exports = { getWatcherCache, cacheWatcher };