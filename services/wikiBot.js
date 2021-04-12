const { toTitle } = require('../util/util'),
    path = require("path"),
    { mwn } = require('mwn'),
    wikiInfo = {
        categories: {
            room: "Room",
            item: "Item",
            critter: "Critter"
        },
        pages: {
            freeItem: "Template:CurrentFreeItem/name"
        }, templates: {
            item: (item) =>
                `{{CreatedByBot}}
{{ItemInfobox
|image1 = ${item.name.replace(" ", "_")}.png
|available = No
|type = ${toTitle(item.slot)} Item
|theme = ${toTitle(item.theme)}
|item_id = ${item.id}
}}
'''${item.name}''' is a [[${toTitle(item.slot)} Items|${item.slot.toLowerCase()}_item]] in ''[[Box Critters]]''.

==History==
{{History}}
{{/history}}
|}

==Trivia==

==Gallery==
===Artwork===
===In Game Appearances===


==References==
<references />
`,
            critter: (critter) =>
                `{{CreatedByBot}}
{{CritterInfobox
|image1 = ${critter.name.replace(" ", "_")}.png
|trait = Unknown
|release_date = TBA
|critter_id = ${critter.id}
}}
'''${critter.name}''' is an upcoming [[critter]] in [[Box Critters|''Box Critters''.]]

==Default Appearance==
==Trivia==
==Gallery==
===Artwork===
<gallery orientation="none" captionalign="center">
</gallery>

==References==
<references />`,
            room: room =>
                `{{CreatedByBot}}
{{RoomInfobox
|image1=${room.name.replace(" ", "_")}.png
|where=Somewhere.
|opened=On a Date
|room_id=${room.id}
|mini-games = None
|music = ${room.media.music}
}}'''${room.name}''' is a [[Rooms|room]] in ''[[Box Critters]]''.

==Trivia==

==Gallery==
===Artwork===    
===Room===    
===Events=== 
==References==
<references />

{{Places}}
    `
        }
    },
    bot = new mwn({
        apiUrl: "https://box-critters.fandom.com/api.php",
        username: iTrackBC.token.wiki.user,
        password: iTrackBC.token.wiki.pass,
        userAgent: 'boxCrittersWikiBot 0.1 (indev) - Send Bug Reports to: https://discord.gg/mbTSD4yPee',
        defaultParams: {
            assert: 'user' // ensure we're logged in
        }
    });

bot.setOptions({
    silent: false, // suppress messages (except error messages)
    retryPause: 5000, // pause for 5000 milliseconds (5 seconds) on maxlag error.
    maxRetries: 3, // attempt to retry a failing requests upto 3 times
    exclusionRegex: /\{\{nobots\}\}/i,
});

async function login() {
    return await bot.login();
}
bot.enableEmergencyShutoff({
    page: 'User:Boxcritterswiki-bot/status',  	// The name of the page to check 
    intervalDuration: 5000, 			// check shutoff page every 5 seconds
    condition: async function (pagetext) {		// function to determine whether the bot should continue to run or not
        if (pagetext !== 'running') {
            return false;				// other than "running", let's decide to stop!
        } else return true;
    },
    onShutoff: function (pagetext) { 	// function to trigger when shutoff is activated
        process.exit();			// let's just exit, though we could also terminate 
    }									// any open connections, close files, etc.
});

function getWikiPageName(bcObj) {
    return bcObj.wiki ? path.basename(bcObj.wiki) : bcObj.name || bcObj.id;
}

async function createPage(title, content) {
    title = "User:Boxcritterswiki-bot/Sandbox/" + title;
    await bot.create(title, content, "[BOT] Created a new page");
}

async function editPage(title, contentCB) {
    await bot.edit(title, contentCB, /* editConfig */ {
        exclusionRegex: /\{\{nobots\}\}/i
    });
}

async function getCategoryPages(c) {
    return await new bot.category(c).members();
}

async function getItemPages() {
    return getCategoryPages(wikiInfo.categories.item);
}

async function getRoomPages() {
    return getCategoryPages(wikiInfo.categories.room);

}

async function getCritterPages() {
    return getCategoryPages(wikiInfo.categories.critter);

}

async function updateFreeItem(item) {
    editPage(wikiInfo.pages.freeItem, () => getWikiPageName(item));
}

async function createItemPage(item) {
    createPage(getWikiPageName(item), wikiInfo.templates.item(item));
}

async function createCritterPage(critter) {
    createPage(getWikiPageName(critter), wikiInfo.templates.critter(critter));

}

async function createRoomPage(room) {
    createPage(getWikiPageName(room), wikiInfo.templates.room(room));
}

module.exports = {
    login,
    getCategoryPages,
    getCritterPages,
    getItemPages,
    getRoomPages,
    createPage,
    createCritterPage,
    createItemPage,
    createRoomPage,
    updateFreeItem
};