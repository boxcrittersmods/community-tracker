module.exports = process.env.LOCAL ?
	{
		prefix: "!test",
		bcmcApi: /*"http://localhost:3000"*/"https://api.boxcrittersmods.ga"
	} : {
		prefix: "!bc",
		bcmcApi: ""
	}