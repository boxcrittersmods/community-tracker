const Discord = require("discord.js");
const { type } = require("os");
const path = require('path');
const request = require("request");
const Website = require("./website");
var Jimp = require('jimp');
//const CritterAPI = require("./critterapi/critterapi.js")

const wikiPages = require("./wikiPages.json");
const itemList = Website.Connect("https://boxcritters.herokuapp.com/base/items.json");
const roomList = Website.Connect("https://boxcritters.herokuapp.com/base/rooms.json");

const client = new Discord.Client();
//const apt = new CritterAPI();
var playerIds = JSON.parse(process.env.DICTIONARY || "{}");

client.on('ready', () => {
	client.user.setPresence({ game: { name: 'Box Critters', type: "PLAYING", }, status: 'online' });
	console.log(`Logged in as ${client.user.tag}!`);
});


async function getItemName(itemId) {
	var items = await itemList.getJson();
	var item = items.find(i => i.itemId == itemId)
	return item.name;
}
async function getWikiUrl(itemId) {
	var itemName = wikiPages[itemId] || await getItemName(itemId);
	if (!itemName) return;
	return "https://box-critters.fandom.com/wiki/" + itemName.split(" ").join("_");
}


async function lookNice(data) {
	var embed = {
		color: 0x55cc11, fields: []
	};
	function field(key) {
		if(!data[key]) return;
		var type = typeof(data[key]);
		var boolean = type == "boolean"
		if (boolean) {
			data[key] = data[key] ? "✅" : "❌";
		}
		embed.fields.push({
			name: key,
			value: data[key].toString() || "N/A",
			inline: ["boolean","number"].includes(type)
		});
	}

	for (const key in data) {
		if(typeof(data[key]) == "object") continue;
		switch (key) {
			case "name":
			case "nickname":
				embed.title = data[key];
				break;
			case "critterId":
				data[key] = data[key] || "hamster";
				field(key);
				break;
			case "created":
			case "lastSeen":
				data[key] = new Date(data[key]).toDateString();
				field(key);
				break;
			case "gear":
				data[key] = await Promise.all(data[key].map(async i => {
					var wikiUrl = await getWikiUrl(i);
					return wikiUrl ? `[${i}](${wikiUrl})` : i
				}));
				data[key] = data[key].join("\n");
				field(key);
				break;
			case "icon":
				embed.thumbnail = {};
				embed.thumbnail.url = data[key];
				break;
			case "background":
			case "sprites":
				embed.image = {};
				embed.image.url = data[key];
				break;
			default:
				field(key)
				break;
		}
	}
	return { embed };
}

function lookUp(url, cb) {
	return Website.Connect(url).getText();
}

var commands = {
	"ping": {
		args: [], description: "Test command", call: function (message, args) {
			message.channel.send("yay!");
		}
	},
	"echo": {
		args: ["message"], description: "Says what you say", call: function (message, args) {
			message.channel.send(args.join(" "))
		}
	},
	"invite": {
		args: [], description: "Share the bot", call: function (message, args) {
			message.channel.send("https://discord.com/oauth2/authorize?client_id=757346990370717837&scope=bot&permissions=68608");
		}
	},
	"help": {
		args: [], description: "Lists help commands", call: function (message, args) {
			message.channel.send("Commands: ```" + Object.keys(commands).map(c => "!bc " + c + " " + commands[c].args.map(a => "[" + a + "]").join(" ") + " - " + commands[c].description).join("\n") + "```Want specific help?: https://discord.gg/D2ZpRUW");
		}
	},
	"lookup": {
		args: ["username"], description: "Look up players", call: function (message, args) {
			//message.channel.send("Is that you " + message.author + "? I know thats you. Well, this command hasn't been made yet.")

			var nickname = args.join(" ");
			var id = playerIds[nickname] || nickname;

			function invalidError() {
				message.channel.send("Invalid playerId or nickname. Please look up a playerId of a player first to add their nickname to the database.\nTo look up your own id type `world.player.playerId` into the developer console.")
			}

			lookUp("https://boxcritters.com/data/player/" + id).then(async (body) => {
				try {
					var data = JSON.parse(body);
				} catch (e) {
					invalidError();
					return
				}
				if (!playerIds[data.nickname]) {
					playerIds[data.nickname] = id;
					message.channel.send(data.nickname + " has been saved to the dictionary as " + id + ". You can now use the nickname to look up this player.");
				}
				message.channel.send(await lookNice(data));
			});
		}
	},
	"dictionary": {
		args: [], description: "Lists the playerIds and the respective nicknames of all known players.", call: function (message, args) {
			message.channel.send("```json\n" + JSON.stringify(playerIds) + "```")
		}
	},
	"room": {
		args: ["roomId"], description: "Look up Rooms", call: function name(message,args) {
			var roomId = args[0]
			roomList.getJson().then(async rooms => {
				var room = rooms.find(r => r.roomId == roomId);
				message.channel.send(await lookNice(room));
			});
		}
	},
	"item": {
		args: ["itemId"], description: "Look up Items", call: function name(message,args) {
			var itemId = args[0]
			itemList.getJson().then(async items => {
				var item = items.find(r => r.itemId == itemId);
				message.channel.send(await lookNice(item));
			});
		}
	}
}

function parseCommand(message) {
	var parts = message.content.split(" ")
	parts.shift();
	var cmd = parts.shift();
	if (!commands[cmd]) {
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
