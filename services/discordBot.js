const Discord = require("discord.js"),
	DiscordSlash = require("discord.js-slash-command"),
	Website = iTrackBC.require("query/website"),
	{ LANG, LANG_LIST } = iTrackBC.require('query/languages'),
	{ watch, clearWatcher, watchers, watchDiscord } = require("./watcher"),
	{ getItem, getRoom, getCritter, lists } = iTrackBC.require("query/manifests"),
	{ lookNice } = iTrackBC.require("util/discordUtils"),
	playerDictionary = iTrackBC.require("data/playerDictionary"),
	{ getCloseset, sleep } = iTrackBC.require('/util/util'),
	wikiBot = iTrackBC.require("./services/wikiBot"),

	settings = iTrackBC.require("data/settings"),

	client = new Discord.Client,
	slash = new DiscordSlash.Slash(client);

//Clear Slashes
slash.get().then((res) => {
	res.forEach((obj) => {
		slash.delete(obj.id);
	});
});



function mapAsync(array, func, context) {
	return Promise.all(array.map(func, context));
}



async function addChoices(option, things) {
	for (const thing of things) {
		option.addChoice(thing.name || thing.name || thing, thing.id || thing);
		await sleep(iTrackBC.sleep);
	}
}


async function createSlash(c, g) {
	let command = commands[c],
		cSlash = new DiscordSlash.CommandBuilder();
	cSlash.setName(c);
	cSlash.setDescription(await LANG(g, "CMD_" + c.toUpperCase() + "_DESC"));


	for (const arg of command.args) {
		let opt = new DiscordSlash.CommandBuilder();
		opt.setName(arg);
		opt.setDescription(await LANG(g, "CMD_" + c.toUpperCase() + "_ARG_" + arg.toUpperCase()));
		opt.setType(DiscordSlash.CommandType.STRING);

		switch (arg) {
			case "playerid":
				let players = await playerDictionary.list();
				console.log(players[0]);
				await addChoices(opt, players);
				break;
			case "roomid":
				let rooms = await lists.rooms.getJson();
				await addChoices(opt, rooms);
				break;
			case "itemid":
				let items = await lists.items.getJson();
				await addChoices(opt, items);
				break;
			case "critterid":
				let critters = await lists.critters.getJson();
				await addChoices(opt, critters);
				break;
		}
		opt.setRequired(true);
		cSlash.addOption(opt);

	}

	command.slash = cSlash;
	await slash.create(command.slash, g);


	return cSlash;

}


client.on("ready", async () => {
	client.user.setPresence({ game: { name: "Box Critters", type: "PLAYING" }, status: "online" });
	console.log(`Logged in as ${client.user.tag}!`);



	//Slash Commands
	for (const c in commands) {
		let command = commands[c];
		if (!command.global) return;
		if (!command.slash) await createSlash(c);
	}

	for (const [guildid, guild] of client.guilds.cache) {
		let guildSettings = await settings.get(guild.id);
		let getChannel = id => guild.channels.cache.get(id);
		if (typeof guildSettings !== "undefined") [].forEach.call(guildSettings.watchers || [],
			watcher => watchDiscord(getChannel(watcher.channel), watcher.url, watcher.mention)
		);

		//Slash Commands
		for (const c in commands) {
			let command = commands[c];
			if (command.global) return;
			if (!command.slash) await createSlash(c, guild.id);
		}

	}

	client.ws.on("INTERACTION_CREATE", interaction => {
		client.channels.fetch(interaction.channel_id);
		client.users.fetch(interaction.member.user.id).then((user) => {
			let interactions = new InteractionManager(interaction, this.client);
			interactions.callback = function (callback) {
				client.api.interactions(interaction.id, interaction.token).callback.post(JSON.parse(`{"data":{"type":3,"data":` + ((typeof (callback) == "object") ? JSON.stringify({ embeds: [callback] }) : JSON.stringify({ content: callback })) + `}}`));
			};
			this.emit(Events.SLASH_INTERACTION, interactions);
		});
	});
});

let commands = {
	"ping": {
		global: true,
		args: [], call: async function (message, args) {
			/*message.channel.send("```json\n" + JSON.stringify(message, null, 2) + "```");
			message.channel.send("message created timestamp:" + message.createdTimestamp);
			message.channel.send("Date.now():" + Date.now());*/
			message.channel.send(await LANG(message.guild.id, "PING_RESPONSE", { PING: Date.now() - message.createdTimestamp }));
		}
	},
	"echo": {
		global: true,
		args: ["message"], call: async function (message, args) {
			message.channel.send(args.join(" "));
		}
	},
	"invite": {
		global: true,
		args: [], call: async function (message, args) {
			message.channel.send("https://discord.com/oauth2/authorize?client_id=757346990370717837&scope=bot&permissions=68608");
		}
	},
	"help": {
		global: true,
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
		global: true,
		args: ["playerid"], call: async function (message, args) {

			async function invalidError() {
				message.channel.send(await LANG(message.guild.id, "LOOKUP_ERROR_INVALID", { COMMAND: "`world.player.playerId`" }));
			}
			async function sendMessageError() {
				message.channel.send(await LANG(message.guild.id, "LOOKUP_ERROR_SENDMESSAGE"));
			}

			let
				nickname = args.join(" "),
				playerNicknames = await playerDictionary.list(),
				similarity = getCloseset(playerNicknames, nickname),
				id,
				messageLookupStatus;
			if (similarity.rating > .7) {
				id = await playerDictionary.get(playerNicknames[similarity.index]);
				if (similarity.rating == 1) {
					messageLookupStatus = await message.channel.send(await LANG(message.guild.id, "LOOKUP_100"));

				} else {
					messageLookupStatus = await message.channel.send(await LANG(message.guild.id, "LOOKUP_SIMILAR", {
						QUERY: nickname,
						NICKNAME: similarity.value,
						SIMILARITY: similarity.rating * 100
					}));
				}
			} else {
				id = nickname;
			}
			message.channel.startTyping();
			try {
				let data = await Website.Connect(iTrackBC.bcAPI.players + id).getJson();
				if (!await playerDictionary.get(data.nickname)) {
					await playerDictionary.add(id, data.nickname);
					await message.channel.send(await LANG(message.guild.id, "LOOKUP_SAVED", {
						NICKNAME: data.nickname,
						ID: id
					}));
				}
				data.critterId = data.critterId || "hamster";
				try {
					await message.channel.send(await lookNice(message.guild, data, message.author));
					messageLookupStatus.delete();
				} catch (e) {
					sendMessageError(e);
					throw e;
				}
			} catch (e) {
				invalidError(e);
				throw e;
			}
		}
	},
	"room": {
		global: true,
		args: ["roomid"], call: async function name(message, args) {
			let roomId = args.join(" ");
			let room = await getRoom(roomId);
			if (!room) {
				message.channel.send(await LANG(message.guild.id, "ROOM_INVALID", { ROOM: room }));
				return;
			}
			await message.channel.send(await lookNice(message.guild, room, message.author));
			if (room.media.music) {
				await message.channel.send({ files: [room.media.music] });
			}
		}
	},
	"critter": {
		global: true,
		args: ["critterid"], call: async function name(message, args) {
			let critterId = args.join(" ");
			let critter = await getCritter(critterId);
			if (!critter) {
				message.channel.send(await LANG(message.guild.id, "CRITTER_INVALID", { CRITTER: critter }));
				return;
			}
			message.channel.send(await lookNice(message.guild, critter, message.author));
		}
	},
	"item": {
		global: true,
		args: ["itemid"], call: async function name(message, args) {
			let itemId = args.join(" ");
			let item = await getItem(itemId);
			if (!item) {
				message.channel.send(await LANG(message.guild.id, "ITEM_INVALID", { ITEM: item }));
				return;
			}
			message.channel.send(await lookNice(message.guild, item, message.author));
		}
	},
	"settings": {
		global: true,
		args: ["key/action", "value"],
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
		global: true,
		args: [],
		call: async function (message, args) {
			let list = await LANG_LIST();
			message.channel.send("`" + list.join("`, `") + "`");
		}
	},
	"watch": {
		global: true,
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
					message.channel.send(await lookNice(message.guild, currentSettings.watchers[id], message.author));
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
				message.channel.send("```" + watchers.map(w => `${w.id} (${w.actions.length} watchers)`).join("\n") + "```");
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
					await watchDiscord(message.channel, url, mention, first);
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
		BOTDEV: "flines#0891"
	}));
}

client.on('message', message => {
	if (message.author == client.user || message.author.bot) {
		return;
	}
	if (message.content.toLowerCase().startsWith(iTrackBC.prefix)) {
		message.reply("Hello World!");
		parseCommand(message).catch(e => logError(message, e));
	}


});

function slashReply(interaction, data) {
	console.log(interaction.id, interaction.token);
	let callback = client.api.interactions(interaction.id, interaction.token).callback;
	//callback.post(JSON.parse(`{"data":{"type":4,"data":` + ((typeof data == "object") ? JSON.stringify({ embeds: [data] }) : JSON.stringify({ content: data })) + `}}`));
	callback.post({
		data: {
			type: 4,
			data: {
				content: data
			}
		}
	});
}


slash.on("slashInteraction", message => {
	console.log(message);

	//console.log(message.command.options);
	let content = iTrackBC.prefix + " " + message.command.name;
	if (message.command.options) content += " " + message.command.options.map(c => c.value).join(" ");
	//console.log(content);
	message.content = content;
	message.guild = message.channel.guild;
	//slashReply(message, "Hello World!");
	//message.callback("Recived");


	parseCommand(message).catch(e => logError(message, e));

});


module.exports = client;



//WIKIBOT


async function initWikiBot() {
	await wikiBot.login();
	interval = iTrackBC.sleep;
	watch({
		actionId: "wiki-rooms", watcherId: "rooms",
		cb: async (data, action) => {
			for (let d of data) {
				await wikiBot.uploadImage(d.id, iTrackBC.bcmcAPI.roomPreview + "/static/" + d.id + ".png");
				await wikiBot.createRoomPage(d);

				await sleep(interval);
			};
			//console.log(data.map(d => d.wiki));
		}, first: true
	});
	watch({
		actionId: "wiki-items", watcherId: "items",
		cb: async (data, action) => {
			for (let d of data) {
				console.log(d.wiki);
				await wikiBot.uploadImage(d.id, d.icon);
				let critters = await lists.critters.getJson();
				for (let c of critters) if (c.type != "mascot") await wikiBot.uploadImage(c.id + "_" + d.id, iTrackBC.bcmcAPI.gear + c.id + ".png?" + d.id);
				await wikiBot.createItemPage(d);
				await sleep(interval);
			}
			//console.log(data.map(d => d.wiki));
		}, first: true
	});
	watch({
		actionId: "wiki-critters", watcherId: "critters",
		cb: async (data, action) => {
			for (let d of data) {
				await wikiBot.uploadImage(d.id, iTrackBC.bcmcAPI.gear + d.id + ".png");
				await wikiBot.createCritterPage(d);
				await sleep(interval);
			}
			//console.log(data.map(d => d.wiki));
		}, first: true
	});

	watch({
		actionId: "wiki-history", watcherId: "codes",
		cb: async (data, action) => {
			//console.log(data);
			for (let d of data) {
				d.code = d.code.split("`").join("");
				console.log(`==== ${d.code || ""} - ${d.notes || ""}  ${d.dateReleased || ""} ${d.dateExpired || ""}`);

				if (d.source === 'shop') d.code = "Available in the [[Shop]]";
				if (d.code === '/freeitem') await wikiBot.updateFreeItem(d);

				await wikiBot.addHistory(d, `${d.code}${d.notes ? " - " + d.notes : ""}`, d.dateReleased, d.dateExpired);

				await sleep(interval);
			}
		}
	});
}
initWikiBot();
