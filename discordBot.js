const Discord = require("discord.js");
const path = require('path');
const request = require("request");
const CritterAPI = require("./critterapi/critterapi.js")

const client = new Discord.Client();
const apt = new CritterAPI();
var playerIds = {};

client.on('ready', () => {
	client.user.setPresence({ game: { name: 'BoxCritters', type: "PLAYING", }, status: 'online' });
	console.log(`Logged in as ${client.user.tag}!`);
});


function lookNice(data) {
	var embed = {
		color: 0x0099ff,fields:[]};
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
	"ping":{args:[],description:"test command",call: function (message, args) {
		message.channel.send("yay");
	}},
	"echo": {args:["message"],description:"says what you say",call:function (message, args) {
		message.channel.send(args.join(" "))
	}},
	"invite":{args:[],description:"share the bot",call:function(message,args) {
		message.channel.send("https://discord.com/oauth2/authorize?client_id=757346990370717837&scope=bot&permissions=68608");
	}},
	"help":{args:[],description:"lists help commands",call:function(message,args) {
		message.channel.send("Commands: ```"+Object.keys(commands).map(c=>"!bc " + c + " " + commands[c].args.map(a=>"["+a+"]").join(" ") + " - " + commands[c].description).join("\n")+"```Want specific help?: https://discord.gg/D2ZpRUW");
	}},
	"lookup":{args:["username"],description:"look at people",call:function(message,args){
		//message.channel.send("is that you " + message.author + " I know thats you. Well this command hasn't been made yet")

		var nickname = args.join(" ");
		var id = playerIds[nickname]||nickname;

		lookUp("https://boxcritters.com/data/player/"+id,(err,res,body) =>{
			if(err) {
				message.channel.send("Invalid playerId or username. Please look up a playerId to add its username to the database.")
				return;
			}
			try {
				var data = JSON.parse(body);
			} catch(e) {
				message.channel.send("Invalid playerId or username. Please look up a playerId to add its username to the database.")
				return
			}
			if(!playerIds[data.nickname]) {
				playerIds[data.nickname] = id;
				message.channel.send(data.nickname + " has been saved to the dictionary as " + id);
			}
			message.channel.send(lookNice(data));
		});
	}},
	"dictionary":{args:[],description:"i kow things",call:function(message,args) {
		message.channel.send("```json\n"+JSON.stringify(playerIds)+"```")
	}}
}

function parseCommand(message) {
	var parts = message.content.split(" ")
	parts.shift();
	var cmd = parts.shift();
	if(!commands[cmd]){
		console.log("Invalic command " + cmd);
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
