const Discord = require("discord.js");
const Website = require("./website");
var stringSimilarity = require('string-similarity');
const { LANG,LANGLIST } = require('./languages.js');

var db = require("./db");
var settings = require("./settings")
//const CritterAPI = require("./critterapi/critterapi.js")

String.prototype.replaceAll = function (a, b) {
	return this.split(a).join(b)
};

const wikiPages = require("./wikiPages.json");
const languages = require("./languages.js");
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
	if(!item) return;
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

async function timeSince(guildId,date) {

	var seconds = Math.floor((new Date() - date) / 1000);

	var interval = seconds / 31536000;

	var output = {}

	if (interval > 1) {
		output.YEARS_VALUE = Math.floor(interval);
	}
	interval = (seconds / 2592000) % 12;
	if (interval > 1) {
		output.MONTHS_VALUE = Math.floor(interval);
	} else {
		interval = seconds / 86400;
		if (interval > 1) {
			output.DAYS_VALUE = Math.floor(interval);
		}
	}
	if (Object.keys(output).length > 0) {
		//return "hmm" + " ago"
		Object.assign(output,{
			YEARS_LABEL:(output.YEARS_VALUE==1?await LANG(guildId,"TIME_YEARS_LABEL_SINGULAR"):await LANG(guildId,"TIME_YEARS_LABEL_PLURAL")),
			MONTHS_LABEL:(output.MONTHS_VALUE==1?await LANG(guildId,"TIME_MONTHS_LABEL_SINGULAR"):await LANG(guildId,"TIME_MONTHS_LABEL_PLURAL")),
			DAYS_LABEL:(output.DAYS_VALUE==1?await LANG(guildId,"TIME_DAYS_LABEL_SINGULAR"):await LANG(guildId,"TIME_DAYS_LABEL_PLURAL"))
		})
		return await LANG(guildId,"TIME_SINCE_" + (output.YEARS_VALUE?"Y":"")+(output.MONTHS_VALUE?"M":"")+(output.DAYS_VALUE?"D":""),output)

	} else {
		return await LANG(guildId,"TIME_TODAY");
	}
}

async function getWikiUrl(itemId) {
	var itemName = wikiPages[itemId] || await getItemName(itemId);
	if (!itemName) return;
	return "https://box-critters.fandom.com/wiki/" + itemName.split(" ").join("_");
}

const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

async function lookNice(guildId,data) {
	var embed = new Discord.RichEmbed()
		.setColor(0x55cc11);
	var message = {embed,files:[]}
	async function field(key) {
		var value = data[key];
		var type = typeof (value);
		var boolean = type == "boolean"
		if (boolean) {
			value = value ? "✅" : "❌";
		}
		if (!value) return;
		//key = key.replace("is", "");
		/*key = key.replace("gear", await LANG(guildId,"USER_CURRENT_GEAR"));
		key = key.replace("lastSeen", await LANG(guildId,"USER_LAST_SEEN"));
		key = key.replace("Team", await LANG(guildId,"USER_TEAM"));
		key = key.replace("Approved", await LANG(guildId,"USER_APPROVED"));
		key = key.replace("Member", await LANG(guildId,"USER_MEMBER"));
		key = key.replace("Banned", await LANG(guildId,"USER_BANNED"));
		key = key.replace("created", await LANG(guildId,"USER_CREATED"));*/
		key = await LANG(guildId,"FIELD_"+camelToSnakeCase(key).toUpperCase());
		key = key.charAt(0).toUpperCase() + key.substr(1)
		embed.addField("**" + key + "**", value, ["boolean", "number"].includes(type))
	}

	if (data.nickname) {
		var mascots = ["RocketSnail", "nickname1", "nickname2", "Sir Champion", "Captain Pirate", "zolt", "zerg", "zork", "JglJen", "Mrchilly"]
		if (!data.isApproved) {
			data.nickname = await LANG(guildId,"USER_HIDDEN_NICKNAME")
		}
		if (mascots.includes(data.nickname)) {
			data.nickname = await LANG(guildId,"USER_LABEL_MASCOT") + `: ${data.nickname}`
		} else {
			data.nickname = await LANG(guildId,"USER_LABEL_PLAYER") + `: ${data.nickname}`
		}

		data.isApproved = data.isApproved || false;
		data.gear = data.gear || [];
	}
	if(data.itemId) {
		data.name = await LANG(guildId,"ITEM_NAME_"+data.itemId.toUpperCase());
		if(data.slot) data.slot = await LANG(guildId,"ITEM_SLOT_"+data.slot.toUpperCase());
		if(data.theme) data.theme = await LANG(guildId,"ITEM_THEME_"+data.theme.toUpperCase());
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
				var title = "**" + await LANG(guildId,"FIELD_CRITTER_ID") + "**";
				data[key] = data[key] || "hamster";
				embed.addField(title, getCritterEmoji(data[key]), true);
				break;
			case "created":
			case "lastSeen":
				const monthNames = await Promise.all(new Array(26).fill("").map(async(_,n)=>(await LANG(guildId,"TIME_MONTH_"+n))));
				const dayNames = await Promise.all(new Array(6).fill("").map(async(_,n)=>(await LANG(guildId,"TIME_DAY_"+n))));
				var zero = (n)=>n<10?"0"+n:n;
				var date = new Date(data[key])
				var dateString = await LANG(guildId,"TIME_DATESTRING",{
					DDD:dayNames[date.getDay()],
					DD:zero(date.getDate()),//01-31
					D:date.getDate(),//1-31
					MMM:monthNames[date.getMonth()],
					MM:zero(date.getMonth()),
					M:date.getMonth(),
					YYYY:date.getFullYear(),
					YY:zero(date.getFullYear()-2000),
					Y:date.getFullYear()-2000
				})
				var time = await timeSince(guildId,date);
				data[key] = (key == "lastSeen" ? (time == await LANG(guildId,"TIME_TODAY") ? "🟢 " : "🔴 ") : "") + await LANG(guildId,"TIME_LABEL_"+camelToSnakeCase(key).toUpperCase()) + " " +
					`${time} (${dateString})`;
				await field(key);
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
				await field(key);
				break;
			case "spriteSheet":
				var sprites = await (Website.Connect(data[key])).getJson();;
				embed.addField(await LANG(guildId,"FIELD_SPRITE_SHEET"),sprites.images.join("\n"))
				embed.addField(await LANG(guildId,"FIELD_SPRITES"),data[key])
				embed.addField(await LANG(guildId,"FIELD_ANIMATION"),"https://api.boxcrittersmods.ga/room/" + data.roomId + ".gif")
				break;
			case "icon":
				embed.setThumbnail(data[key])
				break;
			case "triggers":
				embed.addField(await LANG(guildId,"FIELD_TRIGGERS"), data[key].map(JSON.stringify).join("\n"));
			break;
			case "sprites":
				embed.setImage(data[key]);
				break;
			case "playerId":
				embed.addField(await LANG(guildId,"FIELD_PLAYER_ID"),`[${data.playerId}](https://boxcritters.com/data/player/${data.playerId})`)
				break;
			default:
				await field(key)
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

Array.prototype.mapAsync = function(func,context) {
	return Promise.all(this.map(func,context));
}

var commands = {
	"ping": {
		args: [], call: async function (message, args) {
			message.channel.send(await LANG(message.guild.id,"PING_RESPONSE"));
		}
	},
	"echo": {
		args: ["message"], call: async function (message, args) {
			message.channel.send(args.join(" "))
		}
	},
	"invite": {
		args: [], call: async function (message, args) {
			message.channel.send("https://discord.com/oauth2/authorize?client_id=757346990370717837&scope=bot&permissions=68608");
		}
	},
	"help": {
		args: [], call: async function (message, args) {
			var list = await Object.keys(commands).mapAsync(async c => {
				var description = await LANG(message.guild.id,"CMD_"+c.toUpperCase()+"_DESC");
				var args = await commands[c].args.mapAsync(async a => {
					a = await LANG(message.guild.id,"CMD_"+c.toUpperCase()+"_ARG_"+a.toUpperCase())
					return !a.includes("(") ? "[" + a + "]" : a
				});
				return "!bc " + c + (args.length>0?" ":"") + args.join(" ") + " - " + description;
			})
			var header = await LANG(message.guild.id,"HELP_HEADER")
			var footer = await LANG(message.guild.id,"HELP_FOOTER",{LINK:"https://discord.gg/D2ZpRUW"})
			message.channel.send(header+"\n```" + list.join("\n") + "```\n"+footer);
		}
	},
	"lookup": {
		args: ["playerid"], call: async function (message, args) {
			var nickname = args.join(" ");
			var playerNicknames = await db.list();
			var similarity = getCloseset(playerNicknames, nickname)
			var id;
			if (similarity.rating > .7) {
				id = await db.get(playerNicknames[similarity.index]);
				if (similarity.rating == 1) {
					message.channel.send(await LANG(message.guild.id,"LOOKUP_100"));

				} else {
					message.channel.send(await LANG(message.guild.id,"LOOKUP_SIMILAR",{
						QUERYE:nickname,
						NICKNAME:similarity.value,
						SIMILARITY:similarity.rating * 100
					}))
				}
			} else {
				id = nickname

			}

			async function invalidError() {
				message.channel.send(await LANG(message.guild.id,"LOOKUP_ERROR_INVALID",{COMMAND:"`world.player.playerId`"}))
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
					message.channel.send(await LANG(message.guild.id,"LOOKUP_SAVED",{
						NICKNAME:data.nickname,
						ID:id
					}))
				}
				data.critterId = data.critterId || "hamster";
				message.channel.send(await lookNice(message.guild.id,data));
			});
		}
	},
	"room": {
		args: ["roomid"], call: async function name(message, args) {
			var roomId = args.join(" ")
			var room = await getRoom(roomId);
			if (!room) {
				message.channel.send(await LANG(message.guild.id,"ROOM_INVALID",{ROOM:room}));
				return;
			}
			await message.channel.send(await lookNice(message.guild.id,room));
			if(room.music) {
				await message.channel.send({file:room.music})
			}
		}
	},
	"item": {
		args: ["itemid"], call: async function name(message, args) {
			var itemId = args.join(" ")
			var item = await getItem(itemId);
			if (!item) {
				message.channel.send(await LANG(message.guild.id,"ITEM_INVALID",{ITEM:item}));
				return;
			}
			message.channel.send(await lookNice(message.guild.id,item));
		}
	},
	"settings": {
		args: ["action", "key", "value"],
		call: async function (message, args) {
			var serverId = message.guild.id;
			var serverName = message.guild.name;
			var currentSettings = await settings.get(serverId);
			var key = args.shift();
			var value = args.shift();

			if (key == "reset") {
				await settings.reset(serverId);
				message.channel.send(await LANG(message.guild.id,"SETTINGS_RESET",{SERVER:serverName}))
			} else if (value) {
				message.channel.send(await LANG(message.guild.id,"SETTINGS_SET",{
					KEY:"`"+key+"`",
					OLDVALUE:"`"+currentSettings[key]+"`",
					NEWVALUE:"`"+value+"`",
					SERVER:+serverName
				}))
				//message.channel.send(`Setting the value of \`${key}\` from \`${currentSettings[key]}\` to \`${value}\` for ${serverName}`);
				currentSettings[key] = value;
				message.channel.send(`${serverName}.\`${key}\`=\`${value}\``);
				await settings.set(serverId, currentSettings);
			}


			var embed = new Discord.RichEmbed();
			embed.setTitle(await LANG(message.guild.id,"SETTINGS_HEADER",{SERVER:serverName}));
			if (Object.keys(currentSettings).length == 0) embed.setDescription(await LANG(message.guild.id,"SETTINGS_NONE"))
			for (const k in currentSettings) {
				if (!key || k == key) embed.addField(k[0].toUpperCase() + k.substring(1), "```" + JSON.stringify(currentSettings[k], null, 2) + "```");
			}
			message.channel.send({ embed })

		}
	},
	"language":{
		args:[],
		call:async function(message,args) {
			var list = await LANGLIST();
			message.channel.send("`"+list.join("`, `")+"`")
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
				.setTitle(await LANG(message.guild.id,"PERMISSIONS_CHANNEL_WRONG_TITLE"))
				.setColor(0xff0000)
				.setDescription(await LANG(message.guild.id,"PERMISSIONS_CHANNEL_WRONG_TEXT",{CHANNEL:channelQuery}));
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
				.setDescription(await LANG(message.guild.id,"PERMISSIONS_ROLE_WRONG_TEXT",{ROLE:roleQuery}));
			var msg = await message.channel.send({ embed });
			setTimeout(() => {
				msg.delete();
			}, 3000);
			return;
		}
	}

	if (!commands[cmd]) {
		console.log(await LANG(message.guild.id,"CMD_INVALID",{COMMAND:cmd}));
		return;
	}
	await commands[cmd].call(message, parts)
}

async function logError(message = {},e){
	console.log(e);
	if(!message) return;
	message.reply = message.reply||message.channel.send;
	message.reply(await LANG(message.guild.id,"CMD_ERROR",{
		STACK:e.stack,
		BOTDEV:"TumbleGamer#6140"
	}))
}

client.on('message', message => {
	if (message.author == client.user || message.author.bot) {
		return;
	}
	if (message.content.toLowerCase().startsWith('!test')) {
		parseCommand(message).catch(e=>logError(message,e));
	}
});

module.exports = client;
