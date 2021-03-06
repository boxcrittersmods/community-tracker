const settings = iTrackBC.require("data/settings"),
	fs = require('fs').promises,
	{ existsSync } = require("fs"),
	LANG_FOLDER = iTrackBC.root + "/lang";

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

async function LANG_LIST() {
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


async function timeSince(guildId, date) {
	let seconds = Math.floor((new Date() - date) / 1000);
	let interval = seconds / 31536000;
	let output = {};

	if (interval > 1) {
		output.YEARS_VALUE = Math.floor(interval);
	}
	interval = (seconds / 2592000) % 12;
	if (interval > 1) {
		output.MONTHS_VALUE = Math.floor(interval);
	} else {
		interval = seconds / 86400;
		if (interval > 1) {
			output.DAYS_VALUE = Math.floor(interval);
		}
	}
	if (Object.keys(output).length > 0) {
		//return "hmm" + " ago"
		Object.assign(output, {
			YEARS_LABEL: (output.YEARS_VALUE == 1 ? await LANG(guildId, "TIME_YEARS_LABEL_SINGULAR") : await LANG(guildId, "TIME_YEARS_LABEL_PLURAL")),
			MONTHS_LABEL: (output.MONTHS_VALUE == 1 ? await LANG(guildId, "TIME_MONTHS_LABEL_SINGULAR") : await LANG(guildId, "TIME_MONTHS_LABEL_PLURAL")),
			DAYS_LABEL: (output.DAYS_VALUE == 1 ? await LANG(guildId, "TIME_DAYS_LABEL_SINGULAR") : await LANG(guildId, "TIME_DAYS_LABEL_PLURAL"))
		});
		return await LANG(guildId, "TIME_SINCE_" + (output.YEARS_VALUE ? "Y" : "") + (output.MONTHS_VALUE ? "M" : "") + (output.DAYS_VALUE ? "D" : ""), output);

	} else {
		return await LANG(guildId, "TIME_TODAY");
	}
}

async function LANG_TIME(guildId, dateInfo) {
	let monthNames = await Promise.all(new Array(26).fill("").map(async (_, n) => (await LANG(guildId, "TIME_MONTH_" + n)))),
		dayNames = await Promise.all(new Array(6).fill("").map(async (_, n) => (await LANG(guildId, "TIME_DAY_" + n)))),
		zero = (n) => n < 10 ? "0" + n : n,
		date = new Date(dateInfo),
		dateString = await LANG(guildId, "TIME_DATESTRING", {
			DDD: dayNames[date.getDay()],
			DD: zero(date.getDate()),//01-31
			D: date.getDate(),//1-31
			MMM: monthNames[date.getMonth()],
			MM: zero(date.getMonth() + 1),
			M: date.getMonth() + 1,
			YYYY: date.getFullYear(),
			YY: zero(date.getFullYear() - 2000),
			Y: date.getFullYear() - 2000
		}),
		time = await timeSince(guildId, date);
	return { time, dateString };
};

module.exports = { LANG, LANG_LIST, LANG_TIME };