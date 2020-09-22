const {MongoClient} = require('mongodb');
var dbUser = process.env.DB_USER || require("./config/token").dbUser;
var dbPassword = process.env.DB_PASSWORD || require("./config/token").dbPassword;
const uri = `mongodb+srv://${dbUser}:${dbPassword}@playerdictionary.mftw9.mongodb.net/playerIds?retryWrites=true&w=majority`;

async function connect() {
	var client = new MongoClient(uri);
	await client.connect({ useUnifiedTopology: true });
	return client;
}

async function listDatabases(){
    databasesList = await client.db().admin().listDatabases();
 
    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
};

async function disconnect(client) {
	await client.close();
}

async function addToDB(playerId,nickname) {
	var client = await connect();
	var db = client.db();
	var collection = db.collection("playerIds");
	collection.insertOne({nickname,playerId})
	await disconnect(client);

}


async function getFromDB(nickname) {
	var client = await connect();
	var db = client.db();
	var collection = db.collection("playerIds");
	var player = await collection.findOne({nickname})
	await disconnect(client);
	if(!player) return;
	return player.playerId;
}

module.exports = {
	add:addToDB,
	get:getFromDB
}