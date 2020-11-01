"strict mode";

const _ = require('lodash'),
	Website = require("./website"),

	{ lists, itemCodeList, getItem } = require("./manifests"),
	{ lookNice } = require("./discordUtils"),
	interval = 5000,//120e3,
	sendOne = async (channel, data) => channel.discord.send(channel.mention || "", typeof data == "object" ? await lookNice(channel.discord.guild.id, data) : data),
	send = async (channel, data) => Array.isArray(data) ? data.forEach(async d => await sendOne(channel, d)) : await sendOne(channel, data),
	createWatcher = (id, {
		query = async () => await Website.Connect(url).getJson(),
		equality = _.isEqual,
		createMessage = async (diff, last, now) => diff
	}) => ({ id, query, equality, createMessage, channels: [] }),
	watchers = [
		createWatcher("rooms", {
			query: async () => await (await lists.rooms()).getJson(),
			equality: (a, b) => a.roomId == b.roomId,
		}),
		createWatcher("items", {
			query: async () => {
				let codes = await itemCodeList.getJson(),
					shop = (await (await lists.shops()).getJson()).sort((a, b) => a.startDate - b.startDate)[0],
					shopItems = shop.collection.map(e => ({ name: e, dateReleased: shop.startDate, code: "Available in the shop" }));
				return codes.concat(shopItems).sort((e, t) => new Date(t.dateReleased) - new Date(e.dateReleased));
			},
			equality: (a, b) => a.name == b.name,
			createMessage: async (diff, last, now) =>
				await Promise.all(diff.map(
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
				))
		})
	];
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function createMessage(watcher) {
	let now = await watcher.query(),
		last = watcher.last;
	null == last && (last = new now.constructor);
	let diff = _.filter(now, e => !_.find(last, n => watcher.equality(e, n))),
		data = await watcher.createMessage(diff, last, now);
	watcher.last = now;
	return data;
}

async function tick() {
	console.log("WATCHER TICK");
	for (let watcher of watchers) {
		if (0 == watcher.channels.length) continue;
		console.log("Updateing watcher " + watcher.id);
		let data = await createMessage(watcher);
		if (void 0 != data && Array.isArray(data) ? data.length > 0 : 1) for (let channel of watcher.channels) console.log(`Sending updates to ${channel.discord.name} in ${channel.discord.guild.name}`), send(channel, data);
		await sleep(interval);
	}
	setTimeout(tick, interval);
}
setTimeout(tick, interval);

function diffStr(str1, str2) {
	let diff = "";
	str2.split('').forEach(function (val, i) {
		if (val != str1.charAt(i))
			diff += val;
	});
	return diff;
}

async function watch(discordChannel, url, mention, first) {
	clearWatcher(discordChannel);
	let watcher = watchers.find(e => e.id == url);
	void 0 === watcher && (
		watcher = createWatcher(url, {}),
		watchers.push(watcher)
	);
	let channel = watcher.channels.find(i => i.id == discordChannel.id);
	void 0 === channel && (
		channel = {
			id: discordChannel.id,
			discord: discordChannel,
			mention: mention
		},
		watcher.channels.push(channel)
	);
	discordChannel.send(`Watching ${watcher.id} in ${discordChannel}.`).then(w => setTimeout(w.delete(), 3000));
	if (first) {
		console.log("first");
		let data = await createMessage(watcher);
		send(channel, data);
	} else {
		watcher.last = await watcher.query();
	}
}

function clearWatcher(discordChannel) {
	for (let watcher of watchers) {
		console.log(`looking for ${discordChannel.id} in ${watcher.id} watcher`);
		watcher.channels = watcher.channels.filter(c => c.id != discordChannel.id);
	}
}

module.exports = { watchers, watch, clearWatcher };