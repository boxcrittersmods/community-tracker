const devProdConfig = require("./devProdConfig"),
	{ getCloseset } = require("./util"),
	Website = require("./website"),
	lists = {
		items: Website.Connect(`${devProdConfig.bcmcApi}/manifests/items`),
		rooms: Website.Connect(`${devProdConfig.bcmcApi}/manifests/rooms`),
		shops: Website.Connect(`${devProdConfig.bcmcApi}/manifests/shops`),
	},
	itemCodeList = Website.Connect(`${devProdConfig.bcmcApi}/itemcodes`);



async function getItemName(itemId) {
	let item = (await lists.items.getJson()).find(t => t.itemId == itemId || t.name == itemId);
	if (item) return item.name;
}

async function getItem(itemId) {
	let items = await lists.items.getJson();
	itemId = getCloseset([...items.map(i => i.itemId), ...items.map(i => i.name)].filter(a => !!a), itemId).value;
	return items.find(i => i.itemId == itemId || i.name == itemId);
}
async function getRoom(roomId) {
	let rooms = await lists.rooms.getJson();
	roomId = getCloseset([...rooms.map(r => r.roomId), ...rooms.map(r => r.name)].filter(a => !!a), roomId).value;
	return rooms.find(r => r.roomId == roomId || r.name == roomId);
}

module.exports = {
	lists,
	itemCodeList,
	getItemName,
	getItem,
	getRoom
};
