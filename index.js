require('dotenv').config();
const discordBot = require('./discordBot.js'),
	setupDBL = require("./dbl"),
	token = process.env.DISCORD_TOKEN || require('./config/token.js').token,
	dblToken = process.env.DBL_TOKEN || require('./config/token.js').dblToken;

if (void 0 != dblToken) setupDBL(dblToken, discordBot);
discordBot.login(token);