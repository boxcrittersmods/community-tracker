const path = require("path"),

    //bcmcAPI = "http://localhost:3000",
    bcmcAPI = "https://api.bcmc.ga",

    iTrackBC = {
        sleep: 3e3,
        root: path.join(__dirname, ".."),
        require: (id) => require(path.join(iTrackBC.root, id)),
        token: {
            discord: process.env.DISCORD_TOKEN || require('./token').token,
            dbl: process.env.DBL_TOKEN || require('./token').dblToken,
            wiki: {
                user: process.env.WIKI_USER || require('./token').wikiUser,
                pass: process.env.WIKI_PASS || require('./token').wikiPass,
            }
        },
        db: {
            user: process.env.DB_USER || require("./token").dbUser,
            password: process.env.DB_PASSWORD || require("./token").dbPassword,
            url: "playerdictionary.mftw9.mongodb.net/lookupBot"
        },
        prefix: process.env.LOCAL ? "!test" : "!bc",
        wiki:{
            fandom:"https://box-critters.fandom.com"
        },
        wikiPages: require("./wikiPages.json"),
        bcAPI: {
            players: "https://base.boxcritters.com/data/players.json?id="
        },
        bcmcAPI: {
            root: bcmcAPI,
            items: bcmcAPI + "/manifests/items",
            rooms: bcmcAPI + "/manifests/rooms",
            critters: bcmcAPI + "/manifests/critters",
            shop: bcmcAPI + "/shop",
            files: bcmcAPI + "/textures/BoxCritters.bctp.json",
            itemCodes: bcmcAPI + "/itemcodes",
            playerGear: bcmcAPI + "/player/",
            roomPreview: bcmcAPI + "/room/",
            gear: bcmcAPI + "/gear/",
            staticRoomPreview: bcmcAPI + "/room/static/"
        }
    };

global.iTrackBC = iTrackBC;
