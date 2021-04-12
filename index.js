require('dotenv').config();
require("./config/global.js");

//const wikiBot = require("./services/wikiBot");
discordBot = require('./services/discordBot'),
	setupDBL = require("./services/dbl");

//if (void 0 != iTrackBC.token.dbl) setupDBL(iTrackBC.token.dbl, discordBot);
discordBot.login(iTrackBC.token.discord);


