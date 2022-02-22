const Website = iTrackBC.require("query/website"),
	bent = require("bent"),
	Discord = require("discord.js"),
	wikiPages = iTrackBC.wikiPages,
	{ getItemName } = iTrackBC.require("query/manifests"),
	{ LANG, LANG_TIME } = iTrackBC.require('query/languages.js'),
	{ sleep } = require("./util");
devProdConfig = iTrackBC.setup,

	camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
	truncate = (i, l) => i.length > l ? i.substring(0, l - 3 - (i.startsWith("```") ? 3 : 0)) + '...' + (i.startsWith("```") ? "```" : "") : i;


function getCritterEmoji(client, critterId) {
	if ("snail" == critterId) return "<:rsnail:701095041426391091>";
	let boxCutters = client.guilds.cache.get("570411578139344926");
	if (typeof boxCutters != "undefined") {
		return boxCutters.emojis.cache.find(emoji => emoji.name.toLowerCase() === "critter" + critterId.toLowerCase());
	}
	return critterId;
}


async function getWikiUrl(itemId) {
	let itemName = wikiPages[itemId] || await getItemName(itemId);
	if (itemName) return iTrackBC.wiki.fandom+"/wiki/" + itemName.split(" ").join("_");
}


async function lookNice(guild, data, originalAuthor) {
	console.log("1");
	let guildId = guild.id;
	let embed = new Discord.MessageEmbed()
		.setColor(0x55cc11);
	let message = { embed, files: [] };
	async function field(key) {
		if (key == "layout" || key == "triggers" || key == "textures") return;
		let value = data[key],
			type = typeof value;
		if (type == "boolean") {
			value = value ? "✅" : "❌";
		}
		if (type == "object") {
			value = "```json\n" + JSON.stringify(value, null, 2) + "```";
		}
		if (!value) return;
		key = await LANG(guildId, "FIELD_" + camelToSnakeCase(key).toUpperCase());
		key = key.charAt(0).toUpperCase() + key.substr(1);
		if (value) embed.addField("**" + key + "**", truncate(value.toString(), 1024), ["boolean", "number"].includes(type));
	}
	if (!Array.isArray(data)) {
		if (data.nickname) {
			let mascots = ["RocketSnail", "nickname1", "nickname2", "Sir Champion", "Captain Pirate", "zolt", "zerg", "zork", "JglJen", "Mrchilly"];
			//data.isApproved = data.isApproved || false;
			/*if (!data.isApproved) {
				data.nickname = await LANG(guildId, "USER_HIDDEN_NICKNAME");
			}*/
			if (mascots.includes(data.nickname)) {
				data.nickname = await LANG(guildId, "USER_LABEL_MASCOT") + `: ${data.nickname}`;
			} else {
				data.nickname = await LANG(guildId, "USER_LABEL_PLAYER") + `: ${data.nickname}`;
			}

			data.gear = data.gear || [];
		}
		if (data.itemId) {
			data.name = await LANG(guildId, `ITEM_NAME_${data.itemId.toUpperCase()}`);
			if (data.slot) data.slot = await LANG(guildId, "ITEM_SLOT_" + data.slot.toUpperCase());
			if (data.theme) data.theme = await LANG(guildId, "ITEM_THEME_" + data.theme.toUpperCase());


			embed.setImage(data.sprites);
			delete data.sprites;
		}

		if (data.roomId) {
			data.name = await LANG(guildId, `ROOM_NAME_${data.roomId.toUpperCase()}`);

		}

		if (data.media) {
			embed.attachFiles(`${iTrackBC.bcmcAPI.staticRoomPreview}${data.roomId}.png`).setImage(`attachment://${data.roomId}.png`);
		}
	}

	for (const key in data) {
		if (void 0 == data[key]) continue;
		let langTime;
		//if(typeof(data[key]) == "object") continue;
		switch (key) {
			case "name":
			case "nickname":
				embed.setTitle(`__**${data[key]}**__`);
				if (data.itemId) {
					embed.setURL(await getWikiUrl(data.itemId));
				}
				break;
			case "critterId":
				let title = "**" + await LANG(guildId, "FIELD_CRITTER_ID") + "**";
				data[key] = data[key]
					|| "hamster";
				//|| "penguin";
				embed.addField(title, getCritterEmoji(guild.client, data[key]), true);
				break;
			case "created":
			case "lastSeen":
				langTime = await LANG_TIME(guildId, data[key]);
				data[key] = (key == "lastSeen" ? (langTime.time == await LANG(guildId, "TIME_TODAY") ? "🟢 " : "🔴 ") : "")
					+ await LANG(guildId, "TIME_LABEL_" + camelToSnakeCase(key).toUpperCase()) + " " +
					`${langTime.time} (${langTime.dateString})`;
				await field(key);
				break;
			case "media":
				let media = data[key];
				for (const mediaType in media) {
					embed.addField(await LANG(guildId, "FIELD_MEDIA_" + mediaType.toUpperCase()), media[mediaType]);
				}
				break;
			case "dateReleased":
				langTime = await LANG_TIME(guildId, data[key]);
				data[key] = `${langTime.time} (${langTime.dateString})`;
				await field(key);
				break;
			case "gear":
				//Gear Display
				embed.attachFiles([{ name: "player.png", attachment: iTrackBC.bcmcAPI.playerGear + data.playerId + ".png" }]).setImage("attachment://player.png");

				//Gear List
				let gearList = await Promise.all(data[key].map(async i => {
					let wikiUrl = await getWikiUrl(i);
					return wikiUrl ? `[${i}](${wikiUrl})` : i;
				}));
				data[key] = gearList.join("\n");
				await field(key);
				break;
			case "spriteSheet":
				let sprites = data[key];
				embed.addField(await LANG(guildId, "FIELD_SPRITE_SHEET"), sprites.images.join("\n"));
				embed.addField(await LANG(guildId, "FIELD_SPRITES"), data[key]);
				embed.addField(await LANG(guildId, "FIELD_ANIMATION"), `${iTrackBC.bcmcAPI.roomPreview}${data.roomId}.gif`);
				break;
			case "icon":
				embed.setThumbnail(data[key]);
				break;
			case "playerId":
				embed.addField(await LANG(guildId, "FIELD_PLAYER_ID"), `[${data.playerId}](${iTrackBC.bcAPI.players}${data.playerId})`);
				break;
			default:
				await field(key);
				break;
		}
	}
	let fText = "iTrackBC is created by BCMC";
	if (originalAuthor) fText = "Command sent by " + originalAuthor.username + " | " + fText;
	embed.setFooter(fText);
	return message;
}

let getSlash = bent("GET"),
	createSlash = bent("POST"),
	deleteSlash = bent("DELETE", 204),
	slashAuth = (client) => ({
		Authorization: "Bot " + client.token
	});


function getAppId(client) {
	return client.user.id;
};

function slash(client, guildid, commandid) {
	let url = "https://discord.com/api/v8/applications/" + getAppId(client);
	if (void 0 != guildid && guildid) url += "/guilds/" + guildid;
	url += "/commands";
	if (void 0 != commandid && commandid) url += "/" + commandid;
	return url;
}

async function getSlashCommands(client) {
	if (!client.token) throw "Invalid Token";
	let slashUrl = slash(client);
	let commands = await getSlash(slashUrl, undefined, slashAuth(client));

	return commands.json();
}

async function deleteSlashCommand(client, guildid, commandid) {
	let command = slash(client, guildid, commandid);
	await deleteSlash(command, undefined, slashAuth(client));
	console.log("Deleted command: " + command.name);
}

async function clearSlashCommands(client, guildid) {
	console.log("Clearing Slash Commands");
	let commands = await getSlashCommands(client);
	console.log(commands.length + " slash commands to clear");
	for (let command of commands) {
		await deleteSlashCommand(client, guildid, command.id);
		await sleep(iTrackBC.sleep);
	}
}


function createParam({ name, description = name, choices = [], required = true }) {
	let MAX_CHOICES = 10,
		param = {
			name: name.replace(/[\W_]+/g, ''), description: description.replace(/[\W_]+/g, ' '), required,
			type: 3
		};
	if (choices.length < MAX_CHOICES) param.choices = choices.map(c => (typeof c == "object") ? c : { name: c, value: c });
	return param;
}

async function createSlashCommand(client, guildid, { name, description = name, options = [] }) {
	let data = {
		name, description
	};
	data.options = options.map(o => (typeof c == "string") ? createParam({ name: o }) : createParam(o));
	let command = slash(client, guildid);
	//console.log(command);
	//console.log(JSON.stringify(data));
	try {
		await createSlash(command, data, slashAuth(client));
	} catch (error) {
		if (299 < error.statusCode || 200 > error.statusCode) console.error("Error Creating Slash Command: ", data);
	}

	console.log("Created slash command: " + data.name);
}

function onSlashCommand(client, callback) {
	client.ws.on("INTERACTION_CREATE", async interaction => {
		await client.channels.fetch(interaction.channel_id);
		await client.users.fetch(interaction.member.user.id);
		callback(interaction);
	});
}

module.exports = { lookNice, getWikiUrl, getCritterEmoji, truncate, camelToSnakeCase, clearSlashCommands, deleteSlashCommand, getSlashCommands, createSlashCommand, onSlashCommand };
