const Website = require("./website"),
	Discord = require("discord.js"),
	wikiPages = require("./wikiPages.json"),
	{ getItemName } = require("./manifests"),
	{ LANG, LANG_TIME } = require('./languages.js'),
	devProdConfig = require("./devProdConfig"),

	camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
	truncate = (i, l) => i.length > l ? i.substring(0, l - 3 - (i.startsWith("```") ? 3 : 0)) + '...' + (i.startsWith("```") ? "```" : "") : i;


function getCritterEmoji(client, critterId) {
	if ("snail" == critterId) return "<:rsnail:701095041426391091>";
	let boxCutters = client.guilds.cache.get("570411578139344926");
	return boxCutters ? boxCutters.emojis.find(emoji => emoji.name.toLowerCase() === "critter" + critterId.toLowerCase()) : critterId;
}


async function getWikiUrl(itemId) {
	let itemName = wikiPages[itemId] || await getItemName(itemId);
	if (itemName) return "https://box-critters.fandom.com/wiki/" + itemName.split(" ").join("_");
}


async function lookNice(guild, data) {
	let guildId = guild.id;
	let embed = new Discord.MessageEmbed()
		.setColor(0x55cc11);
	let message = { embed, files: [] };
	async function field(key) {
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
			data.name = await LANG(guildId, `ITEM_NAME_${data.itemId.toUpperCase()}`);
			if (data.slot) data.slot = await LANG(guildId, "ITEM_SLOT_" + data.slot.toUpperCase());
			if (data.theme) data.theme = await LANG(guildId, "ITEM_THEME_" + data.theme.toUpperCase());


			embed.setImage(data.sprites);
			delete data.sprites;
		}

		if (data.roomId) {
			data.name = await LANG(guildId, `ROOM_NAME_${data.roomId.toUpperCase()}`);

		}

		if (data.background || data.foreground) {
			embed.attachFiles(`${devProdConfig.bcmcApi}/room/static/${data.roomId}.png`).setImage(`attachment://${data.roomId}.png`);
		}
	}

	for (const key in data) {
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
				langTime = LANG_TIME(guildId, data[key]);
				data[key] = (key == "lastSeen" ? (langTime.time == await LANG(guildId, "TIME_TODAY") ? "🟢 " : "🔴 ") : "")
					+ await LANG(guildId, "TIME_LABEL_" + camelToSnakeCase(key).toUpperCase()) + " " +
					`${langTime.time} (${langTime.dateString})`;
				await field(key);
				break;
			case "dateReleased":
				langTime = LANG_TIME(guildId, data[key]);
				data[key] = `${langTime.time} (${langTime.dateString})`;
				await field(key);
				break;
			case "gear":
				//Gear Display
				embed.attachFiles([{ name: "player.png", attachment: `${devProdConfig.bcmcApi}/player/${data.playerId}.png` }]).setImage("attachment://player.png");

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
				embed.addField(await LANG(guildId, "FIELD_ANIMATION"), `${devProdConfig.bcmcApi}/room/${data.roomId}.gif`);
				break;
			case "icon":
				embed.setThumbnail(data[key]);
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

module.exports = { lookNice };