const Discord = require("discord.js");
const Website = require("./website");
const Canvas = require('canvas');
var db = require("./db");
//const CritterAPI = require("./critterapi/critterapi.js")

const wikiPages = require("./wikiPages.json");
const itemList = Website.Connect("https://boxcritters.herokuapp.com/base/items.json");
const roomList = Website.Connect("https://boxcritters.herokuapp.com/base/rooms.json");

const client = new Discord.Client();
//const apt = new CritterAPI();

client.on('ready', () => {
	client.user.setPresence({ game: { name: 'Box Critters', type: "PLAYING", }, status: 'online' });
	console.log(`Logged in as ${client.user.tag}!`);
});


async function getItemName(itemId) {
	var items = await itemList.getJson();
	var item = items.find(i => i.itemId == itemId)
	return item.name;
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
		interval = (seconds / 3600)%24;
		if (interval > 1) {
			var value = Math.floor(interval);
			output.push(value + " hour" + (value == 1 ? "" : "s"));
		}
		interval = (seconds / 60)%60;
		if (interval > 1) {
			var value = Math.floor(interval);
			output.push(value + " minute" + (value == 1 ? "" : "s"));
		}
	}
	if(output.length>0){
		return output.join(", ") + " ago"

	} else {
		return "now";
	}
}

async function getWikiUrl(itemId) {
	var itemName = wikiPages[itemId] || await getItemName(itemId);
	if (!itemName) return;
	return "https://box-critters.fandom.com/wiki/" + itemName.split(" ").join("_");
}

function drawImage(context, url, x, y, w, h) {
	return new Promise(async (res, rej) => {
		Canvas.loadImage(url).then(image => {
			context.drawImage(image, x, y, w, h)
			res();
		}).catch(e => {
			console.log("Error with: " + url)
			res();
		});

	})
}

async function displayRoom(room) {
	var canvas = Canvas.createCanvas(room.width, room.height);
	var context = canvas.getContext('2d');

	await drawImage(context, room.background, 0, 0, canvas.width, canvas.height);
	await drawImage(context, room.foreground, 0, 0, canvas.width, canvas.height);

	var attachment = new Discord.MessageAttachment(canvas.toBuffer(), room.roomId + ".png")
	return attachment;
}

async function displayPlayer(player) {

	var canvas = Canvas.createCanvas(340, 400);
	var context = canvas.getContext('2d');
	if(player.critterId == "snail"){
		canvas.width = canvas.height = 128;
		drawImage(context,"https://cdn.discordapp.com/emojis/701095041426391091.png?v=1",0,0,canvas.width,canvas.height)
	}



	var items = await itemList.getJson();

	var rules = {
		hideNose: false,
		hideEars: false
	}

	var gearSlots = player.gear.map(g => {
		var item = items.find(i => i.itemId == g);
		for (const rule in rules) {
			rules[rule] = rules[rule] | item[rule]
		}
		return item.slot;
	})

	var layers = ["feet", "back.ride", "tail", "back.hand", "back.eyes", "back.ears", "back.head", "back.neck", "back.fuzz", "back.pack", "back.belt", "back.body", "back.mask", "body", "ears", "face", "slots.mask", "slots.body", "slots.belt", "slots.pack", "slots.fuzz", "slots.neck", "slots.head", "slots.ears", "slots.eyes", "nose", "slots.hand", "slots.ride"]
	for (var layer of layers) {
		switch (layer) {
			case "tail":
			case "body":
			case "ears":
			case "face":
			case "nose":
			case "feet":
				if (layer == "nose" && rules.hideNose) break;
				if (layer == "ears" && rules.hideEars) break;
				var url = `https://media.boxcritters.com/critters/${player.critterId}/${layer}.png`
				await drawImage(context, url, 0, 0, canvas.width, canvas.height)

				break;
			default: //Items
				var layerParts = layer.split(".");
				var position = layerParts[0].replace("slots", "front");
				var slot = layerParts[1];
				var gearId = gearSlots.indexOf(slot)
				if (gearId == -1) continue;
				var gear = player.gear[gearId];
				var url = `https://media.boxcritters.com/items/${gear}/${position}.png`;
				await drawImage(context, url, 0, 0, canvas.width, canvas.height)

				break;
		}
	}

	var attachment = new Discord.MessageAttachment(canvas.toBuffer(), "player.png")
	return attachment;

}

async function lookNice(data) {
	var embed = new Discord.RichEmbed()
		.setColor(0x55cc11)
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
		embed.addField("**"+key+"**", value, ["boolean", "number"].includes(type))
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

		data.isApproved = data.isApproved||false;
		data.gear = data.gear ||[];
	}

	for (const key in data) {
		//if(typeof(data[key]) == "object") continue;
		switch (key) {
			case "name":
			case "nickname":
				embed.setTitle("__**"+data[key]+"**__");
				if(data.itemId) {
					embed.setURL(await getWikiUrl(data.itemId))
				}
				break;
			case "critterId":
				data[key] = data[key] || "hamster";
				switch (data[key]) {
					case "snail":
						embed.addField("**Critter Type**", "<:bcmcrsnail:715520658238472253>", true)
						break;
					case "hamster":
						embed.addField("**Critter Type**", "<:critterhamster:701095038746362029>", true)
						break;
					default:
						field(key);
						break;
				}
				break;
			case "created":
			case "lastSeen":
				var date = new Date(data[key])
				var time = timeSince(date);
				data[key] = (key=="lastSeen"?(time=="now"?"🟢 ":"🔴 "):"")+(key.charAt(0).toUpperCase() + key.substr(1)).replace("LastSeen","Online")+" "+
				`${time} (${date.toDateString()})` ;
				field(key);
				break;
			case "gear":
				//Gear Display
				var image = await displayPlayer(data);
				embed.attachFiles([{ name: "player.png", attachment: image.message }]).setThumbnail("attachment://player.png")

				//Gear List
				data[key] = await Promise.all(data[key].map(async i => {
					var wikiUrl = await getWikiUrl(i);
					return wikiUrl ? `[${i}](${wikiUrl})` : i
				}));
				data[key] = data[key].join("\n");
				field(key);
				break;
			case "icon":
				embed.setThumbnail(data[key])
				break;
			case "background":
			case "foreground":
				var image = await displayRoom(data);
				delete data.foreground
				delete data.background;
				embed.attachFiles([{ name: "room.png", attachment: image.message }]).setImage("attachment://room.png")
				break;
			case "sprites":
				embed.setImage(data[key]);
				break;
			case "playerId":
				data[key] = `[${data.playerId}](https://boxcritters.com/data/player/${data.playerId})`
				field(key);
				break;
			default:
				field(key)
				break;
		}
	}
	return { embed };
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
			message.channel.send("Commands: ```" + Object.keys(commands).map(c => "!bc " + c + " " + commands[c].args.map(a => "[" + a + "]").join(" ") + " - " + commands[c].description).join("\n") + "```Want specific help?: https://discord.gg/D2ZpRUW");
		}
	},
	"lookup": {
		args: ["username"], description: "Look up players", call: async function (message, args) {
			//message.channel.send("Is that you " + message.author + "? I know thats you. Well, this command hasn't been made yet.")

			var nickname = args.join(" ");
			var id = await db.get(nickname) || nickname;

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
	"dictionary": {
		args: [], description: "Lists the playerIds and the respective nicknames of all known players.", call: async function (message, args) {
			message.channel.send("```json\n" + JSON.stringify(playerIds) + "```")
		}
	},
	"room": {
		args: ["roomId"], description: "Look up Rooms", call: async function name(message, args) {
			var roomId = args[0]
			roomList.getJson().then(async rooms => {
				var room = rooms.find(r => r.roomId == roomId);
				if (!room) {
					message.channel.send("Invalid Room");
					return;
				}
				var nice = await lookNice(room)
				message.channel.send(nice);
			});
		}
	},
	"item": {
		args: ["itemId"], description: "Look up Items", call: async function name(message, args) {
			var itemId = args[0]
			itemList.getJson().then(async items => {
				var item = items.find(r => r.itemId == itemId);
				if (!item) {
					message.channel.send("Invalid Item");
					return;
				}
				message.channel.send(await lookNice(item));
			});
		}
	}
}

async function parseCommand(message) {
	var parts = message.content.split(" ")
	parts.shift();
	var cmd = parts.shift();
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
	if (message.content.startsWith('!bc')) {
		parseCommand(message).then(console.log).catch(console.error);
	}
});

module.exports = client;
