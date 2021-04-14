const
    path = require("path"),
    moment = require('moment'),
    { mwn } = require('mwn'),
    imageDownloader = require('node-image-downloader'),
    { toTitle } = require('../util/util'),
    wikiInfo = {
        categories: {
            room: "Room",
            item: "Item",
            critter: "Critter"
        },
        pages: {
            prefix: "",//"User:Boxcritterswiki-bot/Sandbox/testwiki2/",
            freeItem: "Template:CurrentFreeItem/name",
            history: "/history"
        }, templates: {
            format: "MMMM D, YYYY",
            history: ({ info, from, to }) =>
                `|-
|${info}
|${moment(from).format(this.format)}
|${to ? moment(to).format(this.format) : "''Still available''"}`,
            item: (item) =>
                `{{stub}}
{{ItemInfobox
|image1 = ${item.id}.png
|available = No
|cost = {{Coins}} ${item.cost}
|type = ${toTitle(item.slot)} Item
|theme = ${toTitle(item.theme || "none")}
|item_id = ${item.id}
}}
'''${item.name}''' is a [[${toTitle(item.slot)} Item|${item.slot.toLowerCase()} item]] in ''[[Box Critters]]''.

==History==
{{History}}
{{${wikiInfo.pages.history}}}
|}

==Trivia==

==Gallery==
===Artwork===
===In Game Appearances===
<gallery captionalign="center">
Hamster ${item.id}.png|As seen in-game.
</gallery>

==References==
<references />
`,
            critter: (critter) =>
                `{{stub}}
{{CritterInfobox
|image1 = ${critter.id}.png
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
                `{{stub}}
{{RoomInfobox
|image1=${room.id}.png
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
    //silent: false, // suppress messages (except error messages)
    retryPause: 5000, // pause for 5000 milliseconds (5 seconds) on maxlag error.
    maxRetries: 3, // attempt to retry a failing requests upto 3 times
    exclusionRegex: /\{\{nobots\}\}/i,
});

async function login() {
    await bot.login();
    bot.enableEmergencyShutoff({
        page: 'User:Boxcritterswiki-bot/status',  	// The name of the page to check 
        intervalDuration: 1000, 			// check shutoff page every 5 seconds
        condition: async function (pagetext) {		// function to determine whether the bot should continue to run or not
            if (pagetext !== 'running') {
                return false;				// other than "running", let's decide to stop!
            } else return true;
        },
        onShutoff: function (pagetext) { 	// function to trigger when shutoff is activated
            process.exit();			// let's just exit, though we could also terminate 
        }									// any open connections, close files, etc.
    });
}


function getWikiPageName(bcObj) {
    return bcObj.wiki ? path.basename(bcObj.wiki) : bcObj.name || bcObj.id;
}

async function createPage(title, content) {
    title = wikiInfo.pages.prefix + title;
    try {
        await bot.create(title, content, "[BOT] Created a new page");
        console.log(`Created Page: "${title}"`);
    } catch (e) { }
}

async function editPage(title, contentCB) {
    title = wikiInfo.pages.prefix + title;
    try {
        await bot.edit(title, contentCB, /* editConfig */ {
            exclusionRegex: /\{\{nobots\}\}/i
        });
        console.log(`Edited Page: "${title}"`);
    } catch (e) { }
}

async function uploadImage(title, url) {
    let filename = title;
    try {
        await imageDownloader({
            imgs: [
                {
                    uri: url,
                    filename: `${title}`
                }
            ],
            dest: '/tmp', //destination folder
        });
        await bot.upload(`/tmp/${filename}.png`, title, "[BOT] Uploaded a new file");
        console.log(`Uploaded File: "${title}"`);
        // process.exit(0);
    } catch (e) { /*console.log(e);*/ }
}

async function getCategoryPages(c) {
    return await new bot.category(c).members();
}

async function getItemPages() {
    return await getCategoryPages(wikiInfo.categories.item);
}

async function getRoomPages() {
    return await getCategoryPages(wikiInfo.categories.room);

}

async function getCritterPages() {
    return await getCategoryPages(wikiInfo.categories.critter);

}

async function updateFreeItem(item) {
    await editPage(wikiInfo.pages.freeItem, () => getWikiPageName(item));
}

async function createItemPage(item) {
    await createPage(getWikiPageName(item), wikiInfo.templates.item(item));
    //await createPage(getWikiPageName(item) + wikiInfo.pages.history, ``);
}

async function createCritterPage(critter) {
    await createPage(getWikiPageName(critter), wikiInfo.templates.critter(critter));

}

async function createRoomPage(room) {
    await createPage(getWikiPageName(room), wikiInfo.templates.room(room));
}

async function addHistory(thing, info, from, to) {
    await createPage(getWikiPageName(thing) + wikiInfo.pages.history, ``);
    await editPage(getWikiPageName(thing) + wikiInfo.pages.history, c =>
        `${c.content}
${wikiInfo.templates.history({ info, from, to })}`
    );
}

module.exports = {
    login,
    getWikiPageName,
    getCategoryPages,
    createPage,
    editPage,
    uploadImage,
    getCritterPages,
    getItemPages,
    getRoomPages,
    createCritterPage,
    createItemPage,
    createRoomPage,
    addHistory,
    updateFreeItem
};
