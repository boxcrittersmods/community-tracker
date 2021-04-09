const devProdConfig = iTrackBC.setup,
	{ getCloseset } = iTrackBC.require("util/util"),
	Website = require("./website"),
	lists = {
		items: Website.Connect(iTrackBC.bcmcAPI.items),
		rooms: Website.Connect(iTrackBC.bcmcAPI.rooms),
		critters: Website.Connect(iTrackBC.bcmcAPI.critters),
		shop: Website.Connect(iTrackBC.bcmcAPI.shop),
		files: Website.Connect(iTrackBC.bcmcAPI.files)
	},
	itemCodeList = Website.Connect(iTrackBC.bcmcAPI.itemCodes);



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
async function getCritter(critterName) {
	let critters = await lists.critters.getJson();
	roomId = getCloseset([...critters.map(c => c.critterId), ...critters.map(c => c.name)].filter(a => !!a), critterId).value;
	return critters.find(c => c.critterId == critterd || c.name == critterId);
}

module.exports = {
	lists,
	itemCodeList,
	getItemName,
	getItem,
	getRoom,
	getCritter
};
