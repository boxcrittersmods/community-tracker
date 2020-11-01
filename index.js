require('dotenv').config();
const discordBot = require('./discordBot.js'),
	token = process.env.DISCORD_TOKEN || require('./config/token.js').token;

discordBot.login(token);