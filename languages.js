const settings = require("./settings"),
	fs = require('fs').promises,
	{ existsSync } = require("fs"),
	LANG_FOLDER = __dirname + "/lang";

async function getServerLang(guildId) {
	if (!guildId) return "en-gb";
	let currentSettings = await settings.get(guildId);
	return currentSettings["language"] || "en-gb";
}

async function getLangFile(lang) {
	let file = LANG_FOLDER + "/" + lang + ".txt";
	if (!existsSync(file)) return {};
	let buffer = await fs.readFile(file);
	let list = buffer.toString().split("\n").map(item => {
		item = item.split("=");
		return { [item[0]]: item[1] };
	});
	return Object.assign({}, ...list);
}

async function LANGLIST() {
	let list = await (await fs.readdir(LANG_FOLDER + "/")).map(l => {
		let parts = l.split(".");
		parts.pop();
		return parts.join(".");
	});

	return list;
}

async function LANG(guildId, id, macros = {}) {
	let language = await getServerLang(guildId);
	let langFile = await getLangFile(language);

	if (!langFile[id]) return "`" + id + "`";
	let text = langFile[id].split("\\n").join("\n");;
	for (const macro in macros) {
		let value = macros[macro];
		if (typeof (value) == "function") value = await value();
		text = text.split("$" + macro).join(value);
	}
	return text;
}

module.exports = { LANG, LANGLIST };