module.exports = void 0 == process.env.DEV ?
	{
		prefix: "!test",
		bcmcApi: "http://localhost:3000"
	} : {
		prefix: "!bc",
		bcmcApi: "https://api.boxcrittersmods.ga"
	}