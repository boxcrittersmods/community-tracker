module.exports = process.env.LOCAL ?
	{
		prefix: "!test",
		bcmcApi: "http://localhost:3000"
	} : {
		prefix: "!bc",
		bcmcApi: "https://api.boxcrittersmods.ga"
	}