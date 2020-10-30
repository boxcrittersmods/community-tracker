const Discord = require("discord.js"),
	Website = require("./website"),
	stringSimilarity = require('string-similarity'),
	{ LANG, LANGLIST } = require('./languages.js'),
	wikiPages = require("./wikiPages.json"),
	Watcher = require("./watcher"),
	//CritterAPI = require("./critterapi/critterapi.js"),

	itemList = Website.Connect("https://boxcritters.herokuapp.com/base/items.json"),
	roomList = Website.Connect("https://boxcritters.com/base/data/rooms.json"),
	shopList = Website.Connect("https://boxcritters.herokuapp.com/base/shops.json"),
	itemCodeList = Website.Connect("https://api.boxcrittersmods.ga/itemcodes");


db = require("./playerDictionary"),
	settings = require("./settings");

client = new Discord.Client;

String.prototype.replaceAll = function (a, b) {
	return this.split(a).join(b);
};


client.on("ready", async () => {
	client.user.setPresence({ game: { name: "Box Critters", type: "PLAYING" }, status: "online" });
	console.log(`Logged in as ${client.user.tag}!`);

	client.guilds.cache.forEach(async guild => {
		let guildSettings = await settings.get(guild.id);
		if (typeof guildSettings !== "undefined") [].forEach.call(guildSettings.watchers || [], watcher => watch(guild, watcher));
	});
});

async function getItemName(itemId) {
	let item = (await itemList.getJson()).find(t => t.itemId == itemId || t.name == itemId);
	if (item) return item.name;
}

function getCritterEmoji(critterId) {
	if ("snail" == critterId) return "<:rsnail:701095041426391091>";
	let boxCutters = client.guilds.cache.get("570411578139344926");
	return boxCutters ? boxCutters.emojis.find(emoji => emoji.name.toLowerCase() === "critter" + critterId.toLowerCase()) : critterId;
}

async function timeSince(guildId, date) {
	let seconds = Math.floor((new Date() - date) / 1000);
	let interval = seconds / 31536000;
	let output = {};

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
		Object.assign(output, {
			YEARS_LABEL: (output.YEARS_VALUE == 1 ? await LANG(guildId, "TIME_YEARS_LABEL_SINGULAR") : await LANG(guildId, "TIME_YEARS_LABEL_PLURAL")),
			MONTHS_LABEL: (output.MONTHS_VALUE == 1 ? await LANG(guildId, "TIME_MONTHS_LABEL_SINGULAR") : await LANG(guildId, "TIME_MONTHS_LABEL_PLURAL")),
			DAYS_LABEL: (output.DAYS_VALUE == 1 ? await LANG(guildId, "TIME_DAYS_LABEL_SINGULAR") : await LANG(guildId, "TIME_DAYS_LABEL_PLURAL"))
		});
		return await LANG(guildId, "TIME_SINCE_" + (output.YEARS_VALUE ? "Y" : "") + (output.MONTHS_VALUE ? "M" : "") + (output.DAYS_VALUE ? "D" : ""), output);

	} else {
		return await LANG(guildId, "TIME_TODAY");
	}
}


async function getWikiUrl(itemId) {
	let itemName = wikiPages[itemId] || await getItemName(itemId);
	if (!itemName) return;
	return "https://box-critters.fandom.com/wiki/" + itemName.split(" ").join("_");
}

async function getWikiUrl(itemId) {
	let itemName = wikiPages[itemId] || await getItemName(itemId);
	if (itemName) return "https://box-critters.fandom.com/wiki/" + itemName.split(" ").join("_");
}

const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

let truncate = (i, l) => i.length > l ? i.substring(0, l - 3) + '...' : i;

async function lookNice(guildId, data) {
	let embed = new Discord.MessageEmbed()
		.setColor(0x55cc11);
	let message = { embed, files: [] };
	async function field(key) {
		let value = data[key];
		let type = typeof (value);
		let boolean = type == "boolean";
		if (boolean) {
			value = value ? "✅" : "❌";
		}
		if (!value) return;
		key = await LANG(guildId, "FIELD_" + camelToSnakeCase(key).toUpperCase());
		key = key.charAt(0).toUpperCase() + key.substr(1);
		if (value) embed.addField("**" + key + "**", truncate(value.toString(), 1024), ["boolean", "number"].includes(type));
	}

	if (!Array.isArray(data)) {
		if (data.nickname) {
			let mascots = ["RocketSnail", "nickname1", "nickname2", "Sir Champion", "Captain Pirate", "zolt", "zerg", "zork", "JglJen", "Mrchilly"];
			if (!data.isApproved) {
				data.nickname = await LANG(guildId, "USER_HIDDEN_NICKNAME");
			}
			if (mascots.includes(data.nickname)) {
				data.nickname = await LANG(guildId, "USER_LABEL_MASCOT") + `: ${data.nickname}`;
			} else {
				data.nickname = await LANG(guildId, "USER_LABEL_PLAYER") + `: ${data.nickname}`;
			}

			data.isApproved = data.isApproved || false;
			data.gear = data.gear || [];
		}
		if (data.itemId) {
			data.name = await LANG(guildId, "ITEM_NAME_" + data.itemId.toUpperCase());
			if (data.slot) data.slot = await LANG(guildId, "ITEM_SLOT_" + data.slot.toUpperCase());
			if (data.theme) data.theme = await LANG(guildId, "ITEM_THEME_" + data.theme.toUpperCase());
		}

		if (data.roomId) {
			data.name = await LANG(guildId, "ROOM_NAME_" + data.roomId.toUpperCase());
		}

		if (data.background || data.foreground) {
			embed.attachFiles("https://api.boxcrittersmods.ga/room/static/" + data.roomId + ".png").setImage("attachment://" + data.roomId + ".png");
		}
	}

	for (const key in data) {

		//if(typeof(data[key]) == "object") continue;
		switch (key) {
			case "name":
			case "nickname":
				embed.setTitle("__**" + data[key] + "**__");
				if (data.itemId) {
					embed.setURL(await getWikiUrl(data.itemId));
				}
				break;
			case "critterId":
				let title = "**" + await LANG(guildId, "FIELD_CRITTER_ID") + "**";
				data[key] = data[key]
					|| "hamster";
				//|| "penguin";
				embed.addField(title, getCritterEmoji(data[key]), true);
				break;
			case "created":
			case "lastSeen":
				const monthNames = await Promise.all(new Array(26).fill("").map(async (_, n) => (await LANG(guildId, "TIME_MONTH_" + n))));
				const dayNames = await Promise.all(new Array(6).fill("").map(async (_, n) => (await LANG(guildId, "TIME_DAY_" + n))));
				let zero = (n) => n < 10 ? "0" + n : n;
				let date = new Date(data[key]);
				let dateString = await LANG(guildId, "TIME_DATESTRING", {
					DDD: dayNames[date.getDay()],
					DD: zero(date.getDate()),//01-31
					D: date.getDate(),//1-31
					MMM: monthNames[date.getMonth()],
					MM: zero(date.getMonth() + 1),
					M: date.getMonth() + 1,
					YYYY: date.getFullYear(),
					YY: zero(date.getFullYear() - 2000),
					Y: date.getFullYear() - 2000
				});
				let time = await timeSince(guildId, date);
				data[key] = (key == "lastSeen" ? (time == await LANG(guildId, "TIME_TODAY") ? "🟢 " : "🔴 ") : "") + await LANG(guildId, "TIME_LABEL_" + camelToSnakeCase(key).toUpperCase()) + " " +
					`${time} (${dateString})`;
				await field(key);
				break;
			case "gear":
				//Gear Display
				embed.attachFiles([{ name: "player.png", attachment: "https://api.boxcrittersmods.ga/player/" + data.playerId + ".png" }]).setImage("attachment://player.png");

				//Gear List
				let gearList = await Promise.all(data[key].map(async i => {
					let wikiUrl = await getWikiUrl(i);
					return wikiUrl ? `[${i}](${wikiUrl})` : i;
				}));
				data[key] = gearList.join("\n");
				await field(key);
				break;
			case "spriteSheet":
				let sprites = await (Website.Connect(data[key])).getJson();;
				embed.addField(await LANG(guildId, "FIELD_SPRITE_SHEET"), sprites.images.join("\n"));
				embed.addField(await LANG(guildId, "FIELD_SPRITES"), data[key]);
				embed.addField(await LANG(guildId, "FIELD_ANIMATION"), "https://api.boxcrittersmods.ga/room/" + data.roomId + ".gif");
				break;
			case "icon":
				embed.setThumbnail(data[key]);
				break;
			case "triggers":
				embed.addField(await LANG(guildId, "FIELD_TRIGGERS"), truncate(data[key].map(JSON.stringify).join("\n"), 1024));
				break;
			case "sprites":
				embed.setImage(data[key]);
				break;
			case "playerId":
				embed.addField(await LANG(guildId, "FIELD_PLAYER_ID"), `[${data.playerId}](https://boxcritters.com/data/player/${data.playerId})`);
				break;
			default:
				await field(key);
				break;
		}
	}
	embed.footer = "BCMC";
	return message;
}

async function getItem(itemId) {
	let items = await itemList.getJson();
	itemId = getCloseset([...items.map(i => i.itemId), ...items.map(i => i.name)].filter(a => !!a), itemId).value;
	return items.find(i => i.itemId == itemId || i.name == itemId);
}
async function getRoom(roomId) {
	let rooms = await roomList.getJson();
	roomId = getCloseset([...rooms.map(r => r.roomId), ...rooms.map(r => r.name)].filter(a => !!a), roomId).value;
	return rooms.find(r => r.roomId == roomId || r.name == roomId);
}

function lookUp(url) {
	return Website.Connect(url).getText();
}


function mapAsync(array, func, context) {
	return Promise.all(array.map(func, context));
}

async function watch(guild, { channel, url, first, mention }) {
	if (typeof guild == "string") guild = client.guilds.cache.get(guild);
	if (typeof channel == "string") channel = guild.channels.cache.get(channel);
	let isEqual = undefined, watcher;

	switch (url) {
		case "item":
		case "items":
			watcher = new Watcher(async () => {
				let codes = await itemCodeList.getJson(),
					shops = await shopList.getJson(),
					shop = shops.sort((a, b) => a.startDate - b.startDate)[0];

				let shopItems = shop.collection.map(itemId => ({
					name: itemId,
					dateReleased: shop.startDate,
					code: "Available in the shop"
				}));
				codes = codes.concat(shopItems).sort((a, b) => new Date(b.dateReleased) - new Date(a.dateReleased)).filter(i => !i.dateExpired);

				return codes;
			}, (a, b) => a.name == b.name, null, first);
			watcher.onChange(async (last, now, diff) => {
				let items = await Promise.all(diff.map(
					async code => {
						let item = await getItem(code.name);
						return {
							itemId: item.itemId,
							name: item.name,
							icon: item.icon,
							sprites: item.sprites,
							dateReleased: code.dateReleased,
							notes: code.notes,
							code: "`" + code.code + "`"
						};
					}
				));
				items.forEach(async data => await channel.send(mention || "", await lookNice(guild, data)));
				console.log("Items", items);
			});
			break;
		case "room":
		case "rooms":
			isEqual = (a, b) => {
				return a.roomId == b.roomId;
			};
			watcher = new Watcher(async () => {
				return await roomList.getJson();

			}, isEqual, null, first);
		default:

			if (!watcher) {
				if (!url.startsWith("http")) {
					channel.send(await LANG(channel.guild.id, "WATCH_URL_INVALID"));
					return;
				}
				let website = Website.Connect(url);
				watcher = new Watcher(async () => {
					return await website.getJson();

				}, isEqual, null, first);
			}

			watcher.onChange(async (last, now, diff) => {
				let send = async (data) => channel.send(mention || "", typeof data == "object" ? await lookNice(channel.guild.id, data) : data);
				console.log("Differences", diff);
				if (Array.isArray(diff)) {
					diff.forEach(send);
				} else {
					await send(diff);
				}
			});
	}
	channel.send(`Watching ${url} in ${channel}`).then(m => setTimeout(() => m.delete(), 5000)).catch(console.error);
	channel.watcher = watcher;
}

let commands = {
	"ping": {
		args: [], call: async function (message, args) {
			message.channel.send(await LANG(message.guild.id, "PING_RESPONSE"));
		}
	},
	"echo": {
		args: ["message"], call: async function (message, args) {
			message.channel.send(args.join(" "));
		}
	},
	"invite": {
		args: [], call: async function (message, args) {
			message.channel.send("https://discord.com/oauth2/authorize?client_id=757346990370717837&scope=bot&permissions=68608");
		}
	},
	"help": {
		args: [], call: async function (message, args) {
			let list = await mapAsync(Object.keys(commands), async c => {
				let description = await LANG(message.guild.id, "CMD_" + c.toUpperCase() + "_DESC");
				let args = await mapAsync(commands[c].args, async a => {
					a = await LANG(message.guild.id, "CMD_" + c.toUpperCase() + "_ARG_" + a.toUpperCase());
					return !a.includes("(") ? "[" + a + "]" : a;
				});
				return "!bc " + c + (args.length > 0 ? " " : "") + args.join(" ") + " - " + description;
			});
			let header = await LANG(message.guild.id, "HELP_HEADER");
			let footer = await LANG(message.guild.id, "HELP_FOOTER", { LINK: "https://discord.gg/D2ZpRUW" });
			message.channel.send(header + "\n```" + list.join("\n") + "```\n" + footer);
		}
	},
	"lookup": {
		args: ["playerid"], call: async function (message, args) {
			let nickname = args.join(" ");
			let playerNicknames = await db.list();
			let similarity = getCloseset(playerNicknames, nickname);
			let id;
			if (similarity.rating > .7) {
				id = await db.get(playerNicknames[similarity.index]);
				if (similarity.rating == 1) {
					await message.channel.send(await LANG(message.guild.id, "LOOKUP_100"));

				} else {
					await message.channel.send(await LANG(message.guild.id, "LOOKUP_SIMILAR", {
						QUERY: nickname,
						NICKNAME: similarity.value,
						SIMILARITY: similarity.rating * 100
					}));
				}
			} else {
				id = nickname;
			}
			message.channel.startTyping();

			async function invalidError() {
				message.channel.send(await LANG(message.guild.id, "LOOKUP_ERROR_INVALID", { COMMAND: "`world.player.playerId`" }));
			}

			let body = await lookUp("https://boxcritters.com/data/player/" + id);
			try {
				let data = JSON.parse(body);
				if (!await db.get(data.nickname)) {
					await db.add(id, data.nickname);
					message.channel.send(await LANG(message.guild.id, "LOOKUP_SAVED", {
						NICKNAME: data.nickname,
						ID: id
					}));
				}
				data.critterId = data.critterId || "hamster";
				message.channel.send(await lookNice(message.guild.id, data));
			} catch (e) {
				invalidError();
			}
		}
	},
	"room": {
		args: ["roomid"], call: async function name(message, args) {
			let roomId = args.join(" ");
			let room = await getRoom(roomId);
			if (!room) {
				message.channel.send(await LANG(message.guild.id, "ROOM_INVALID", { ROOM: room }));
				return;
			}
			message.channel.send(await lookNice(message.guild.id, room));
			if (room.music) {
				await message.channel.send({ files: [room.music] });
			}
		}
	},
	"item": {
		args: ["itemid"], call: async function name(message, args) {
			let itemId = args.join(" ");
			let item = await getItem(itemId);
			if (!item) {
				message.channel.send(await LANG(message.guild.id, "ITEM_INVALID", { ITEM: item }));
				return;
			}
			message.channel.send(await lookNice(message.guild.id, item));
		}
	},
	"settings": {
		args: ["action", "key", "value"],
		call: async function (message, args) {
			let serverId = message.guild.id;
			let serverName = message.guild.name;
			let currentSettings = await settings.get(serverId);
			let key = args.shift();
			let value = args.shift();

			if (key == "reset") {
				await settings.reset(serverId);
				message.channel.send(await LANG(message.guild.id, "SETTINGS_RESET", { SERVER: serverName }));
			} else if (value) {
				message.channel.send(await LANG(message.guild.id, "SETTINGS_SET", {
					KEY: "`" + key + "`",
					OLDVALUE: "`" + currentSettings[key] + "`",
					NEWVALUE: "`" + value + "`",
					SERVER: +serverName
				}));
				//message.channel.send(`Setting the value of \`${key}\` from \`${currentSettings[key]}\` to \`${value}\` for ${serverName}`);
				currentSettings[key] = value;
				message.channel.send(`${serverName}.\`${key}\`=\`${value}\``);
				await settings.set(serverId, currentSettings);
			}


			let embed = new Discord.MessageEmbed();
			embed.setTitle(await LANG(message.guild.id, "SETTINGS_HEADER", { SERVER: serverName }));
			if (Object.keys(currentSettings).length == 0) embed.setDescription(await LANG(message.guild.id, "SETTINGS_NONE"));
			for (const k in currentSettings) {
				if (!key || k == key) embed.addField(k[0].toUpperCase() + k.substring(1), "```" + JSON.stringify(currentSettings[k], null, 2) + "```");
			}
			message.channel.send({ embed });

		}
	},
	"languages": {
		args: [],
		call: async function (message, args) {
			let list = await LANGLIST();
			message.channel.send("`" + list.join("`, `") + "`");
		}
	},
	"watch": {
		args: ["url", "(mention)", "(showMissed)"],
		call: async (message, args) => {
			let url = args[0],
				mention = args[1] || "",
				first = args[2],
				currentSettings = await settings.get(message.guild.id);
			console.log(currentSettings);
			if (typeof currentSettings.watchers == "undefined") currentSettings.watchers = [];
			let id = currentSettings.watchers.findIndex(w => w.channel == message.channel.id);
			if (!url) {
				if (id == -1) {
					message.channel.send("This channel does not have a watcher.");
				} else {
					message.channel.send(await lookNice(message.guild.id, currentSettings.watchers[id]));
				}
				return;
			}
			if (url == "clear") {
				currentSettings.watchers = currentSettings.watchers.filter(w => w.channel != message.channel.id);
				message.channel.send(`Watcher for ${message.channel} has been cleared!`);
				if (message.channel.watcher) {
					message.channel.watcher.stop();
					delete message.channel.watcher;
				}
			} else {
				if (id == -1) id = currentSettings.watchers.length;
				currentSettings.watchers[id] = {
					url,
					mention,
					channel: message.channel.id
				};

				watch(message.guild, {
					channel: message.channel,
					url,
					first,
					mention
				});
			}
			await settings.set(message.guild.id, currentSettings);

		}
	}
};

/**
 * 
 * @param {Array.<String>} array 
 * @param {String} value 
 */
function getCloseset(array, value) {
	let similarity = stringSimilarity.findBestMatch("_" + value.toLowerCase().replace(" ", "☺"), array.map(a => "_" + a.toLowerCase().replace(" ", "☺")));
	console.log("Similarities of " + value, similarity.ratings);
	return {
		value: array[similarity.bestMatchIndex],
		rating: similarity.ratings[similarity.bestMatchIndex].rating,
		index: similarity.bestMatchIndex,
		ratings: similarity.ratings
	};
}

async function parseCommand(message) {
	message.channel.startTyping();
	let parts = message.content.split(" ");
	parts.shift();
	let commandIds = Object.keys(commands);
	let cmd = parts.shift();
	let similarity = getCloseset(commandIds, cmd);
	cmd = similarity.value;

	let currentSettings = await settings.get(message.guild.id);
	let channelQuery = currentSettings[cmd + "Channel"];
	if (channelQuery) {
		let chId = channelQuery.replace(/\D/g, '');
		if (message.channel.id != chId) {
			let embed = new Discord.MessageEmbed()
				.setTitle(await LANG(message.guild.id, "PERMISSIONS_CHANNEL_WRONG_TITLE"))
				.setColor(0xff0000)
				.setDescription(await LANG(message.guild.id, "PERMISSIONS_CHANNEL_WRONG_TEXT", { CHANNEL: channelQuery }));
			let msg = await message.channel.send({ embed });
			setTimeout(() => {
				msg.delete();
			}, 3000);
			return;
		}
	}
	let roleQuery = currentSettings[cmd + "Permissions"];
	if (roleQuery) {
		let rlId = roleQuery.replace(/\D/g, '');
		if (!message.member.roles.cache.has(rlId)) {
			let embed = new Discord.MessageEmbed()
				.setTitle("You are unautherised to use this command")
				.setColor(0xff0000)
				.setDescription(await LANG(message.guild.id, "PERMISSIONS_ROLE_WRONG_TEXT", { ROLE: roleQuery }));
			let msg = await message.channel.send({ embed });
			setTimeout(() => {
				msg.delete();
			}, 3000);
			return;
		}
	}

	if (!commands[cmd]) {
		console.log(await LANG(message.guild.id, "CMD_INVALID", { COMMAND: cmd }));
		return;
	}
	await commands[cmd].call(message, parts);
	if (message.channel.typing) message.channel.stopTyping(message.channel.typingCount);
}

async function logError(message = {}, e) {
	console.log(e);
	if (!message) return;
	message.reply = message.reply || message.channel.send;
	message.reply(await LANG(message.guild.id, "CMD_ERROR", {
		STACK: e.stack,
		BOTDEV: "TumbleGamer#6140"
	}));
}

client.on('message', message => {
	if (message.author == client.user || message.author.bot) {
		return;
	}
	if (message.content.toLowerCase().startsWith('!bc')) {
		parseCommand(message).catch(e => logError(message, e));
	}
});

module.exports = client;
