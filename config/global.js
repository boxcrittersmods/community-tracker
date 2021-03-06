const path = require("path")
var iTrackBC = {
    root: path.join(__dirname,".."),
    require:(id)=>require(path.join(iTrackBC.root,id)),
    token: {
        discord: process.env.DISCORD_TOKEN || require('./token').token,
        dbl: process.env.DBL_TOKEN || require('./token').dblToken,
    },
    db: {
        user: process.env.DB_USER || require("./token").dbUser,
        password: process.env.DB_PASSWORD || require("./token").dbPassword,
        url: "playerdictionary.mftw9.mongodb.net/lookupBot"
    },
    setup:require("./devProdConfig"),
    wikiPages:require("./wikiPages.json")
}

global.iTrackBC = iTrackBC;