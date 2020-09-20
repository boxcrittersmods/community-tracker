const Discord = require("discord.js");
const path = require('path');
const request = require("request");

const client = new Discord.Client();

client.on('ready', () => {
	client.user.setPresence({ game: { name: 'P1', type: "LISTENING", }, status: 'online' });
	console.log(`Logged in as ${client.user.tag}!`);
});




function test(cb) {
	request({ url: "https://boxcritters.com/data/player/EF99F6E35EDA62C", method: 'GET', headers: { 'Accept': 'application/json', 'Accept-Charset': 'utf-8', 'User-Agent': 'Node-Request' } }, cb)
}


var commands = {
	"ping": function (message, args) {
		message.channel.send("yay");
	},
	"echo": function (message, args) {
		message.channel.send(args.join(" "));
	},
	"test":function(message,args) {
		test(function(err,res,body){message.channel.send(body)})
	},
	"invite":function(message,args) {
		message.channel.send("https://discord.com/oauth2/authorize?client_id=757346990370717837&scope=bot");
	}
}

function parseCommand(message) {
	var parts = message.content.split(" ")
	parts.shift();
	commands[parts.shift()](message, parts)
}

client.on('message', message => {
	if (message.author == client.user || message.author.bot) {
		return;
	}
	if (message.content.startsWith('!bc')) {
		parseCommand(message);
	}
});

module.exports = client;
