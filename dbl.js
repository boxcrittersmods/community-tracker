const DBL = require("dblapi.js");

module.exports = function (dblToken, client) {
	const dbl = new DBL(dblToken, {}, client);

	dbl.on('posted', () => {
		console.log('POSTED SERVER COUNT TO TOP.GG');
	});

	client.on('ready', () => {
		setInterval(() => {
			dbl.postStats(client.guilds.size, client.shards.Id, client.shards.total);
		}, 1800000);
	});

	dbl.webhook.on('vote', vote => {
		console.log(`User <@${vote.user}> (${client.users.cache.get(vote.user)}) just voted${vote.isWeekend ? " twice" : ""}!`);
	});
};