"strict mode";

const _ = require('lodash'),
	Website = iTrackBC.require("query/website"),
	{ lists, itemCodeList, getItem } = iTrackBC.require("query/manifests"),
	{ lookNice } = iTrackBC.require("util/discordUtils"),
	{ getWatcherCache, cacheWatcher, files } = iTrackBC.require("data/watcherCache");

interval = 120e3,
	sendOne = async (channel, data) => channel.discord.send(channel.mention || "", typeof data == "object" ? await lookNice(channel.discord.guild, data) : data),
	send = async (channel, data) => Array.isArray(data) ? data.forEach(async d => await sendOne(channel, d)) : await sendOne(channel, data),
	createWatcher = (id, {
		query = async () => await Website.Connect(id).getJson(),
		equality = _.isEqual,
		createMessage = async (diff, last, now) => diff
	}) => ({ id, query, equality, createMessage, actions: [], get channels() { return this.actions; } }),
	watchers = [
		createWatcher("rooms", {
			query: async () => await lists.rooms.getJson(),
			equality: (a, b) => a.roomId == b.roomId,
		}),
		createWatcher("critters", {
			query: async () => await lists.critters.getJson(),
			equality: (a, b) => a.critterId == b.critterId,
		}),
		createWatcher("items", {
			query: async () => await lists.items.getJson(),
			equality: (a, b) => a.itemId == b.itemId,
		}),
		createWatcher("codes", {
			query: async () => {
				let codes = await itemCodeList.getJson(),
					shop = await lists.shop.getJson();
				shopItems = shop.collection ? shop.collection.map(e => ({ name: e, dateReleased: shop.startDate, code: "Available in the shop", source: "shop" })) : [],
					roomItems = (await lists.rooms.getJson()).flatMap(room => room.triggers.filter(trigger => trigger.server && trigger.server.grantItem).map(trigger => ({ name: trigger.server.grantItem, code: `Found in ${room.name}`, source: "room" })));
				return codes.concat(shopItems, roomItems).sort((a, b) => new Date(b.dateReleased) - new Date(a.dateReleased));
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
							cost: code.source == "shop" ? item.cost : null,
							code: "`" + code.code + "`"
						};
					}
				))
		}),
		createWatcher("files", {
			query: async () => {
				let files = await lists.files.getJson();
				list = Object.values(files);
				return list;
			},
			createMessage: async (diff, last, now) => {
				diff.map(file => {
					return { name: file };
				});
			}
		})
	];

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function createMessage(watcher, force) {
	let now = await watcher.query(),
		last = watcher.last;
	void 0 == last && (last = new now.constructor);
	let diff = force ? now : _.filter(now, a => !_.find(last, b => watcher.equality(a, b))),
		data = await watcher.createMessage(diff, last, now);
	console.log({ now, last, diff, data });
	cacheWatcher(watcher.id, now);
	watcher.last = now;
	return data;
}


async function tick() {
	if (watchers.length == 0 || watchers.reduce((s, w) => s + w.actions.length, 0) == 0) {
		await sleep(interval);
	} else {
		console.log("WATCHER TICK");
		for (let watcher of watchers) {
			if (0 == watcher.actions.length) continue;
			console.log("Updateing watcher " + watcher.id);
			let data = await createMessage(watcher);
			if (void 0 != data && Array.isArray(data) ? data.length > 0 : 1)
				for (let action of watcher.actions) {
					action.cb(data, action);
				}
			await sleep(interval);
		}
	}
	setTimeout(tick, 0);
}

setTimeout(tick, 0);

function diffStr(str1, str2) {
	let diff = "";
	str2.split('').forEach(function (val, i) {
		if (val != str1.charAt(i))
			diff += val;
	});
	return diff;
}

async function setupInitialLastValue(watcher) {
	let data = await getWatcherCache(watcher.id);
	if (void 0 == data) data = await watcher.query();
	watcher.last = data;
}

async function watch(actionId, watcherId, first, cb) {
	clearWatcher(actionId);
	let watcher = watchers.find(e => e.id == watcherId);
	if (void 0 === watcher) {
		if (!watcherId.startsWith("http")) throw "Invalid URL or watcher preset. " + watcherId;
		watcher = createWatcher(watcherId, {}),
			watchers.push(watcher);
	}
	let action = watcher.actions.find(t => t.id == action);
	void 0 === action && (
		action = {
			id: actionId,
			mention: mention,
			cb
		},
		watcher.actions.push(action)
	);
	if (void 0 == first) {
		setupInitialLastValue(watcher);
	} else {
		first();
	}
	return action;
}

async function watchDiscord(discordChannel, url, mention, first) {
	if (first) {
		first = () => {
			console.log("watcher", watcher);
			discordChannel.send("Sending previous entries").then(e => setTimeout(() => e.delete(), 10e3));
			let data = await createMessage(watcher, true);
			console.log("data", data);
			send(subscription, data);
		};
	}

	let cb = (data, { channel }) => {
		console.log(`Sending updates to ${channel.discord.name} in ${channel.discord.guild.name}`);
		send(channel, data);
	};
	let action = watch(discordChannel.id, url, first, cb);
	action.mention = mention;
	action.discord = discordChannel;

}

function clearWatcher(id) {
	for (let watcher of watchers) {
		console.log(`looking for ${id} in ${watcher.id} watcher`);
		watcher.actions = watcher.actions.filter(a => a.id != id);
	}
}

module.exports = { watchers, watch, watchDiscord, clearWatcher };
