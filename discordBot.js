const Discord = require("discord.js");
const path = require('path');
const request = require("request");
//const CritterAPI = require("./critterapi/critterapi.js")

const client = new Discord.Client();
//const apt = new CritterAPI();
var playerIds = JSON.parse(process.env.DICTIONARY)||{};

client.on('ready', () => {
	client.user.setPresence({ game: { name: 'Box Critters', type: "PLAYING", }, status: 'online' });
	console.log(`Logged in as ${client.user.tag}!`);
});


function lookNice(data) {
	var embed = {
		color: 0x55cc11,fields:[]};
	function field(key) {
		embed.fields.push({
			name:key,
			value:data[key].toString()||"N/A"
		});
	}

	for (const key in data) {
		switch (key) {
			case "nickname":
				embed.title = data[key];
			break;
			case "critterId":
				data[key] = data[key]||"hamster";
				field(key);
			break;
			case "gear":
				data[key] = data[key].join("\n");
				field(key);
				break;
			default:
				field(key)
				break;
		}
	}
	return {embed};
}

function test(cb) {
	request({ url: "https://boxcritters.com/data/player/EF99F6E35EDA62C", method: 'GET', headers: { 'Accept': 'application/json', 'Accept-Charset': 'utf-8', 'User-Agent': 'Node-Request' } }, cb)
}

function lookUp(url,cb) {
	request({ url, method: 'GET', headers: { 'Accept': 'application/json', 'Accept-Charset': 'utf-8', 'User-Agent': 'Node-Request' } }, cb)
}



var commands = {
	"ping":{args:[],description:"Test command",call: function (message, args) {
		message.channel.send("yay!");
	}},
	"echo": {args:["message"],description:"Says what you say",call:function (message, args) {
		message.channel.send(args.join(" "))
	}},
	"invite":{args:[],description:"Share the bot",call:function(message,args) {
		message.channel.send("https://discord.com/oauth2/authorize?client_id=757346990370717837&scope=bot&permissions=68608");
	}},
	"help":{args:[],description:"Lists help commands",call:function(message,args) {
		message.channel.send("Commands: ```"+Object.keys(commands).map(c=>"!bc " + c + " " + commands[c].args.map(a=>"["+a+"]").join(" ") + " - " + commands[c].description).join("\n")+"```Want specific help?: https://discord.gg/D2ZpRUW");
	}},
	"lookup":{args:["username"],description:"Look up players",call:function(message,args){
		//message.channel.send("Is that you " + message.author + "? I know thats you. Well, this command hasn't been made yet.")

		var nickname = args.join(" ");
		var id = playerIds[nickname]||nickname;

		function invalidError() {
			message.channel.send("Invalid playerId or nickname. Please look up a playerId of a player first to add their nickname to the database.\nTo look up your own id type `world.player.playerId` into the developer console.")
		}

		lookUp("https://boxcritters.com/data/player/"+id,(err,res,body) =>{
			if(err) {
				invalidError()
				return;
			}
			try {
				var data = JSON.parse(body);
			} catch(e) {
				invalidError();
				return
			}
			if(!playerIds[data.nickname]) {
				playerIds[data.nickname] = id;
				message.channel.send(data.nickname + " has been saved to the dictionary as " + id + ". You can now use the nickname to look up this player.");
			}
			message.channel.send(lookNice(data));
		});
	}},
	"dictionary":{args:[],description:"Lists the playerIds and the respective nicknames of all known players.",call:function(message,args) {
		message.channel.send("```json\n"+JSON.stringify(playerIds)+"```")
	}}
}

function parseCommand(message) {
	var parts = message.content.split(" ")
	parts.shift();
	var cmd = parts.shift();
	if(!commands[cmd]){
		console.log("Invalid command " + cmd);
		return; 
	}
	commands[cmd].call(message, parts)
}

client.on('message', message => {
	if (message.author == client.user || message.author.bot) {
		return;
	}
	if (message.content.startsWith('!bc')) {
		parseCommand(message);
	}
});

module.exports = client;
