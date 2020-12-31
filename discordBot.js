const Discord = require("discord.js"),
	Website = require("./website"),
	{ LANG, LANG_LIST } = require('./languages.js'),
	{ watch, clearWatcher, watchers } = require("./watcher"),
	{ getItem, getRoom } = require("./manifests"),
	{ lookNice } = require("./discordUtils"),
	playerDictionary = require("./playerDictionary"),
	devProdConfig = require("./devProdConfig"),
	{ getCloseset } = require("./util"),

	settings = require("./settings"),

	client = new Discord.Client;

function mapAsync(array, func, context) {
	return Promise.all(array.map(func, context));
}


client.on("ready", async () => {
	client.user.setPresence({ game: { name: "Box Critters", type: "PLAYING" }, status: "online" });
	console.log(`Logged in as ${client.user.tag}!`);

	client.guilds.cache.forEach(async guild => {
		let guildSettings = await settings.get(guild.id);
		let getChannel = id => guild.channels.cache.get(id);
		if (typeof guildSettings !== "undefined") [].forEach.call(guildSettings.watchers || [],
			watcher => watch(getChannel(watcher.channel), watcher.url, watcher.mention)
		);
	});
});

let commands = {
	"ping": {
		args: [], call: async function (message, args) {
			/*message.channel.send("```json\n" + JSON.stringify(message, null, 2) + "```");
			message.channel.send("message created timestamp:" + message.createdTimestamp);
			message.channel.send("Date.now():" + Date.now());*/
			message.channel.send(await LANG(message.guild.id, "PING_RESPONSE", { PING: Date.now() - message.createdTimestamp }));
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
			let playerNicknames = await playerDictionary.list();
			let similarity = getCloseset(playerNicknames, nickname);
			let id;
			if (similarity.rating > .7) {
				id = await playerDictionary.get(playerNicknames[similarity.index]);
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
			try {
				let data = await Website.Connect("https://boxcritters.com/data/player/" + id).getJson();
				if (!await playerDictionary.get(data.nickname)) {
					await playerDictionary.add(id, data.nickname);
					message.channel.send(await LANG(message.guild.id, "LOOKUP_SAVED", {
						NICKNAME: data.nickname,
						ID: id
					}));
				}
				data.critterId = data.critterId || "hamster";
				message.channel.send(await lookNice(message.guild, data));
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
			message.channel.send(await lookNice(message.guild, room));
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
			message.channel.send(await lookNice(message.guild, item));
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
			for (let k in currentSettings) {
				if (!key || k == key) embed.addField(k[0].toUpperCase() + k.substring(1), "```" + JSON.stringify(currentSettings[k], null, 2) + "```");
			}
			message.channel.send({ embed });

		}
	},
	"languages": {
		args: [],
		call: async function (message, args) {
			let list = await LANG_LIST();
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
					message.channel.send(await lookNice(message.guild, currentSettings.watchers[id]));
				}
				return;
			}
			if (url == "debug") {
				console.log(watchers);
				message.channel.send("Outputed to console");
				//message.channel.send("```json\n" + JSON.stringify(watchers, null, 2) + "```");
				return;
			}
			if (url == "types") {
				message.channel.send("```" + watchers.map(w => `${w.id} (${w.channels.length} watchers)`).join("\n") + "```");
				return;
			} else if (url == "clear") {
				currentSettings.watchers = currentSettings.watchers.filter(w => w.channel != message.channel.id);
				message.channel.send(`Watcher for ${message.channel} has been cleared!`);
				await clearWatcher(message.channel);
			} else {
				if (id == -1) id = currentSettings.watchers.length;
				currentSettings.watchers[id] = {
					url,
					mention,
					channel: message.channel.id
				};
				try {
					await watch(message.channel, url, mention, first);
					discordChannel.send(`Watching ${watcher.id} in ${message.channel}.`).then(e => setTimeout(() => e.delete(), 10e3));
				} catch (error) {
					console.error(error);
				}
			}
			await settings.set(message.guild.id, currentSettings);

		}
	}
};


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
	if (message.content.toLowerCase().startsWith(devProdConfig.prefix)) {
		parseCommand(message).catch(e => logError(message, e));
	}
});


module.exports = client;;;
