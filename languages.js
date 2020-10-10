var settings = require("./settings")
const fs = require('fs').promises;
const {existsSync} = require("fs");

var LANG_FOLDER = __dirname + "/lang";

async function getServerLang(guildId) {
	if(!guildId)return "en-gb";
	var currentSettings = await settings.get(guildId);
	return currentSettings["Language"]||"en-gb";
}

async function getLangFile(lang) {
	var file = LANG_FOLDER + "/" + lang + ".txt"
	if(!existsSync(file)) return {};
	var buffer = await fs.readFile(file);
	var list = buffer.toString().split("\n").map(item=>{
		item = item.split("=")
		return {[item[0]]:item[1]};
	})
	return Object.assign({},...list);
}

async function LANGLIST() {
	var list = await (await fs.readdir(LANG_FOLDER + "/")).map(l=>{
		var parts = l.split(".");
		parts.pop();
		return parts.join(".")
	})

	return list;
}

async function LANG(guildId,id,macros={}) {
	var language = await getServerLang(guildId);
	var langFile = await getLangFile(language);
	
	if(!langFile[id]) return "`" + id + "`";
	var text = langFile[id].split("\\n").join("\n");;
	for (const macro in macros) {
		var value = macros[macro];
		if(typeof(value) == "function") value = await value();
		text = text.split("$"+macro).join(value);
	}
	return text;
}

module.exports = {LANG,LANGLIST}