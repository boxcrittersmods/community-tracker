module.exports = {
    GetGuild:(client)=> {
        return client.guilds.get(global.serverID);
      },
    GetChannel:(client,id)=>{
    return global.GetGuild(client).channels.get(id);
    },
    GetRole:(client, name)=> {
    return global.GetGuild(client).roles.find(r=>r.name == name);
    }
}