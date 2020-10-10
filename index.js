const discordBot = require('./discordBot.js');

const token = process.env.DISCORD_TOKEN || require('./config/token.js').token;

discordBot.login(token);