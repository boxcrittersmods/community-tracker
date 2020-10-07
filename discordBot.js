const Discord = require("discord.js");
const Website = require("./website");
var stringSimilarity = require('string-similarity');

var db = require("./db");
var settings = require("./settings")
//const CritterAPI = require("./critterapi/critterapi.js")

String.prototype.replaceAll = function (a, b) {
	return this.split(a).join(b)
};

const wikiPages = require("./wikiPages.json");
const itemList = Website.Connect("https://boxcritters.herokuapp.com/base/items.json");
const roomList = Website.Connect("https://boxcritters.herokuapp.com/base/rooms.json");

const client = new Discord.Client();

client.on('ready', () => {
	client.user.setPresence({ game: { name: 'Box Critters', type: "PLAYING", }, status: 'online' });
	console.log(`Logged in as ${client.user.tag}!`);
});


async function getItemName(itemId) {
	var items = await itemList.getJson();
	var item = items.find(i => i.itemId == itemId || i.name == itemId)
	return item.name;
}

function getCritterEmoji(critterID) {
	if (critterID == "snail") {
		return "<:rsnail:701095041426391091>";
	}
	var boxCutters = client.guilds.get("570411578139344926");
	if(!boxCutters) return critterID;
	return boxCutters.emojis.find(emoji => emoji.name.toLowerCase() === "critter" + critterID.toLowerCase());
}

function timeSince(date) {

	var seconds = Math.floor((new Date() - date) / 1000);

	var interval = seconds / 31536000;

	var output = [];

	if (interval > 1) {
		var value = Math.floor(interval);
		output.push(value + " year" + (value == 1 ? "" : "s"));
	}
	interval = (seconds / 2592000) % 12;
	if (interval > 1) {
		var value = Math.floor(interval);
		output.push(value + " month" + (value == 1 ? "" : "s"));
	} else {
		interval = seconds / 86400;
		if (interval > 1) {
			var value = Math.floor(interval);
			output.push(value + " day" + (value == 1 ? "" : "s"));
		}
		interval = (seconds / 3600) % 24;
		/*if (interval > 1) {
			var value = Math.floor(interval);
			output.push(value + " hour" + (value == 1 ? "" : "s"));
		}
		interval = (seconds / 60) % 60;
		if (interval > 1) {
			var value = Math.floor(interval);
			output.push(value + " minute" + (value == 1 ? "" : "s"));
		}*/
	}
	if (output.length > 0) {
		return output.join(", ") + " ago"

	} else {
		return "today";
	}
}

async function getWikiUrl(itemId) {
	var itemName = wikiPages[itemId] || await getItemName(itemId);
	if (!itemName) return;
	return "https://box-critters.fandom.com/wiki/" + itemName.split(" ").join("_");
}

async function lookNice(data) {
	var embed = new Discord.RichEmbed()
		.setColor(0x55cc11);
	var message = {embed,files:[]}
	function field(key) {
		var value = data[key];
		var type = typeof (value);
		var boolean = type == "boolean"
		if (boolean) {
			value = value ? "✅" : "❌";
		}
		if (!value) return;
		key = key.replace("is", "");
		key = key.replace("gear", "Current Gear");
		key = key.replace("lastSeen", "Last Seen");
		key = key.replace("Team", "Team Member");
		key = key.replace("Approved", "Nickname Approved");
		key = key.charAt(0).toUpperCase() + key.substr(1)
		embed.addField("**" + key + "**", value, ["boolean", "number"].includes(type))
	}

	if (data.nickname) {
		var mascots = ["RocketSnail", "nickname1", "nickname2", "Sir Champion", "Captain Pirate", "zolt", "zerg", "zork", "JglJen", "Mrchilly"]
		if (!data.isApproved) {
			data.nickname = "Hamster"
		}
		if (mascots.includes(data.nickname)) {
			data.nickname = `Mascot: ${data.nickname}`
		} else {
			data.nickname = `Player: ${data.nickname}`
		}

		data.isApproved = data.isApproved || false;
		data.gear = data.gear || [];
	}

	if(data.background||data.foreground){
		embed.attachFile("https://api.boxcrittersmods.ga/room/static/" + data.roomId + ".png").setImage("attachment://" + data.roomId + ".png")
	}

	for (const key in data) {
		//if(typeof(data[key]) == "object") continue;
		switch (key) {
			case "name":
			case "nickname":
				embed.setTitle("__**" + data[key] + "**__");
				if (data.itemId) {
					embed.setURL(await getWikiUrl(data.itemId))
				}
				break;
			case "critterId":
				var title = "**Critter Type**";
				data[key] = data[key] || "hamster";
				embed.addField(title, getCritterEmoji(data[key]), true);
				break;
			case "created":
			case "lastSeen":
				var date = new Date(data[key])
				var time = timeSince(date);
				data[key] = (key == "lastSeen" ? (time == "today" ? "🟢 " : "🔴 ") : "") + (key.charAt(0).toUpperCase() + key.substr(1)).replace("LastSeen", "") + " " +
					`${time} (${date.toDateString()})`;
				field(key);
				break;
			case "gear":
				//Gear Display
				embed.attachFiles([{ name: "player.png", attachment: "https://api.boxcrittersmods.ga/player/" + data.playerId + ".png" }]).setImage("attachment://player.png")

				//Gear List
				var gearList = await Promise.all(data[key].map(async i => {
					var wikiUrl = await getWikiUrl(i);
					return wikiUrl ? `[${i}](${wikiUrl})` : i
				}));
				data[key] = gearList.join("\n");
				field(key);
				break;
			case "spriteSheet":
				var sprites = await (Website.Connect(data[key])).getJson();;
				embed.addField("SpriteSheet",sprites.images.join("\n"))
				embed.addField("Sprites",data[key])
				embed.addField("Animation","https://api.boxcrittersmods.ga/room/" + data.roomId + ".gif")
				break;
			case "icon":
				embed.setThumbnail(data[key])
				break;
			case "triggers":
				embed.addField("Triggers", data[key].map(JSON.stringify).join("\n"));
			break;
			case "sprites":
				embed.setImage(data[key]);
				break;
			case "playerId":
				embed.addField("PlayerID",`[${data.playerId}](https://boxcritters.com/data/player/${data.playerId})`)
				break;
			default:
				field(key)
				break;
		}
	}
	return message;
}

async function getItem(itemId) {
	var items = await itemList.getJson();
	itemId = getCloseset([...items.map(i => i.itemId), ...items.map(i => i.name)], itemId).value;
	return items.find(i => i.itemId == itemId || i.name == itemId);
}
async function getRoom(roomId) {
	var rooms = await roomList.getJson()
	roomId = getCloseset([...rooms.map(r => r.roomId), ...rooms.map(r => r.name)], roomId).value
	return rooms.find(r => r.roomId == roomId || r.name == roomId);
}

function lookUp(url) {
	return Website.Connect(url).getText();
}

var commands = {
	"ping": {
		args: [], description: "Test command", call: async function (message, args) {
			message.channel.send("yay!");
		}
	},
	"echo": {
		args: ["message"], description: "Says what you say", call: async function (message, args) {
			message.channel.send(args.join(" "))
		}
	},
	"invite": {
		args: [], description: "Share the bot", call: async function (message, args) {
			message.channel.send("https://discord.com/oauth2/authorize?client_id=757346990370717837&scope=bot&permissions=68608");
		}
	},
	"help": {
		args: [], description: "Lists help commands", call: async function (message, args) {
			message.channel.send("Commands: ```" + Object.keys(commands).map(c => "!bc " + c + " " + commands[c].args.map(a => !a.includes("(") ? "[" + a + "]" : a).join(" ") + " - " + commands[c].description).join("\n") + "```Want specific help?: https://discord.gg/D2ZpRUW");
		}
	},
	"lookup": {
		args: ["nickname/playerId"], description: "Look up players", call: async function (message, args) {
			var nickname = args.join(" ");
			var playerNicknames = await db.list();
			var similarity = getCloseset(playerNicknames, nickname)
			var id;
			if (similarity.rating > .9) {
				id = await db.get(playerNicknames[similarity.index]);
				if (similarity.rating == 1) {
					message.channel.send(`No, you know you were right. I'm not going to say how close you were. I'll just get the account for you`);

				} else {
					message.channel.send(`I'm not sure who ${nickname} is but it seems similar to ${similarity.value} with a ${similarity.rating * 100}% similarirty`);
				}
			} else {
				id = nickname

			}

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
				if (!await db.get(data.nickname)) {
					await db.add(id, data.nickname);
					message.channel.send(data.nickname + " has been saved to the database as " + id + ". You can now use the nickname to look up this player.");
				}
				data.critterId = data.critterId || "hamster";
				message.channel.send(await lookNice(data));
			});
		}
	},
	"room": {
		args: ["roomId or name"], description: "Look up Rooms", call: async function name(message, args) {
			var roomId = args.join(" ")
			var room = await getRoom(roomId);
			if (!room) {
				message.channel.send("Invalid Room: " + room);
				return;
			}
			message.channel.send(await lookNice(room));
			if(room.music) {
				message.channel.send({file:room.music})
			}
		}
	},
	"item": {
		args: ["itemId or name"], description: "Look up Items", call: async function name(message, args) {
			var itemId = args.join(" ")
			var item = await getItem(itemId);
			if (!item) {
				message.channel.send("Invalid Item: " + itemId);
				return;
			}
			message.channel.send(await lookNice(item));
		}
	},
	"settings": {
		args: ["set/reset", "key", "(value)"],
		description: "Set server specific bot settings",
		call: async function (message, args) {
			var serverId = message.guild.id;
			var serverName = message.guild.name;
			var currentSettings = await settings.get(serverId);
			var key = args.shift();
			var value = args.shift();

			if (key == "reset") {
				await settings.reset(serverId);
				message.channel.send(`Reset settings for ${serverName}`)

			} else if (value) {
				message.channel.send(`Setting the value of \`${key}\` from \`${currentSettings[key]}\` to \`${value}\` for ${serverName}`);
				currentSettings[key] = value;
				message.channel.send(`${serverName}.\`${key}\`=\`${value}\``);
				await settings.set(serverId, currentSettings);
			}


			var embed = new Discord.RichEmbed();
			embed.setTitle("Settings for " + serverName);
			if (Object.keys(currentSettings).length == 0) embed.setDescription("No Settings")
			for (const k in currentSettings) {
				if (!key || k == key) embed.addField(k[0].toUpperCase() + k.substring(1), "```" + JSON.stringify(currentSettings[k], null, 2) + "```");
			}
			message.channel.send({ embed })

		}
	}
}

/**
 * 
 * @param {Array.<String>} array 
 * @param {String} value 
 */
function getCloseset(array, value) {
	var similarity = stringSimilarity.findBestMatch("_" + value.toLowerCase().replace(" ", "☺"), array.map(a => "_" + a.toLowerCase().replace(" ", "☺")));
	console.log("Similarities of " + value, similarity.ratings);
	return {
		value: array[similarity.bestMatchIndex],
		rating: similarity.ratings[similarity.bestMatchIndex].rating,
		index: similarity.bestMatchIndex,
		ratings: similarity.ratings
	};
}

async function parseCommand(message) {
	var parts = message.content.split(" ")
	parts.shift();
	var commandIds = Object.keys(commands);
	var cmd = parts.shift();
	var similarity = getCloseset(commandIds, cmd);
	cmd = similarity.value;

	var currentSettings = await settings.get(message.guild.id);
	var channelQuery = currentSettings[cmd + "Channel"];
	if (channelQuery) {
		let chId = channelQuery.replace(/\D/g, '');
		if (message.channel.id != chId) {
			let embed = new Discord.RichEmbed()
				.setTitle("IncorectChannel")
				.setColor(0xff0000)
				.setDescription("No go to " + channelQuery);
			var msg = await message.channel.send({ embed });
			setTimeout(() => {
				msg.delete();
			}, 3000);
			return;
		}
	}
	var roleQuery = currentSettings[cmd + "Permissions"];
	if (roleQuery) {
		let rlId = roleQuery.replace(/\D/g, '');
		if (!message.member.roles.has(rlId)) {
			let embed = new Discord.RichEmbed()
				.setTitle("You are unautherised to use this command")
				.setColor(0xff0000)
				.setDescription("Only " + roleQuery + " can use this command");
			var msg = await message.channel.send({ embed });
			setTimeout(() => {
				msg.delete();
			}, 3000);
			return;
		}
	}

	if (!commands[cmd]) {
		console.log("Invalid command " + cmd);
		return;
	}
	await commands[cmd].call(message, parts)
}


client.on('message', message => {
	if (message.author == client.user || message.author.bot) {
		return;
	}
	if (message.content.toLowerCase().startsWith('!test')) {
		parseCommand(message).catch(console.error);
	}
});

module.exports = client;
