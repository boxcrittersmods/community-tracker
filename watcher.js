"strict mode";

const _ = require('lodash'),
	{ lists, itemCodeList, getItem } = require("./manifests"),
	{ lookNice } = require("./discordUtils"),
	{ LANG_TIME } = require('./languages.js'),
	interval = 120e3,
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
					shop = (await (await lists.shops()).getJson()).sort((a, b) => a.startDate - b.startDate),
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
	for (let watcher of watchers) {
		if (0 == watcher.channels.length) continue;
		let data = await createMessage(watcher);
		for (let channel of watcher.channels) send(channel, data);
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

async function watch(discordChannel, url, mention, first,) {
	let watcher = watchers.find(w => w.id == url);
	if (typeof watcher == "undefined") {
		watcher = createWatcher(url);
		watchers.push(watchers);
	}
	let channel = watcher.channels.find(c => c.id == discordChannel.id);
	if (typeof channel == "undefined") {
		channel = {
			id: discordChannel.id,
			discord: discordChannel,
			mention: mention
		};
		watcher.channels.push(channel);
	}
	if (watcher && channel && first) {
		let data = await createMessage(watcher);
		send(channel, data);
	}
	channel.send(`Watching ${url} in ${channel}`).then(m => setTimeout(() => m.delete(), 5000)).catch(console.error);
	console.log(`${discordChannel.name} in ${discordChannel.guild.name} is now watching ${url}¬`);
}

async function watch(discordChannel, url, first, mention) {
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
	if (watcher && channel && first) {
		console.log("first");
		let data = await createMessage(watcher);
		send(channel, data);
	}
}

function clearWatcher(discordChannel) {
	console.log(watchers);
	for (let watcher of watchers) {
		console.log(`looking for ${discordChannel.id} in ${watcher.id} watcher`);
		watcher.channels = watcher.channels.filter(c => c.id != discordChannel.id);
	}
}

module.exports = { watch, clearWatcher };