const Discord = require("discord.js");
const { type } = require("os");
const path = require('path');
const request = require("request");
const Website = require("./website");
//const CritterAPI = require("./critterapi/critterapi.js")

const wikiPages = require("./wikiPages.json");
const itemList = Website.Connect("https://boxcritters.herokuapp.com/base/items.json");

const client = new Discord.Client();
//const apt = new CritterAPI();
var playerIds = JSON.parse(process.env.DICTIONARY) || {};

client.on('ready', () => {
	client.user.setPresence({ game: { name: 'Box Critters', type: "PLAYING", }, status: 'online' });
	console.log(`Logged in as ${client.user.tag}!`);
});


async function getItemName(itemId) {
	var items = await itemList.getJson();
	var item = items.filter(i => i.itemId == itemId)
	return item.name;
}
async function getWikiUrl(itemId) {
	return "https://box-critters.fandom.com/wiki/" + wikiPages[itemId] || await getItemName(itemId);
}


async function lookNice(data) {
	var embed = {
		color: 0x55cc11, fields: []
	};
	function field(key) {
		if (typeof (data[key]) == "boolean") {
			data[key] = data[key] ? "✅" : "❌";
		}
		embed.fields.push({
			name: key,
			value: data[key].toString() || "N/A",
			inline: typeof (data[key]) == "boolean"
		});
	}

	for (const key in data) {
		switch (key) {
			case "nickname":
				embed.title = data[key];
				break;
			case "critterId":
				data[key] = data[key] || "hamster";
				field(key);
				break;
			case "created":
				data[key] = new Date(data[key]);
				field(key);
				break;
			case "gear":
				data[key] = data[key].map(i => `[${i}](${await getWikiUrl(i)})`).join("\n");
				field(key);
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
