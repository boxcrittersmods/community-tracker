const { connect, disconnect } = require("./db"),
	playerDictionary = [];

async function addToDB(playerId, nickname) {
	let client = await connect("playerIds");
	if (!client) return;
	let db = client.db();
	let collection = db.collection("playerIds");
	let field = { nickname, playerId };
	playerDictionary.push(field);
	collection.insertOne(field);
	await disconnect(client);

}

async function getUsenames() {
	let client = await connect("playerIds");
	if (!client) return playerDictionary.map(i => i.nickname);
	let db = client.db();
	let collection = db.collection("playerIds");
	let usernames = await collection.distinct("nickname");
	await disconnect(client);
	return usernames;

}

async function getFromDB(nickname) {
	let player = playerDictionary.find(p => p.nickname == nickname);
	if (!player) {
		let client = await connect("playerIds");
		if (!client) return;
		let db = client.db();
		let collection = db.collection("playerIds");
		player = await collection.findOne({ nickname });
		await disconnect(client);
	}
	return player.playerId;
}

module.exports = {
	add: addToDB,
	get: getFromDB,
	list: getUsenames
};