const antiChannelDelete = require("./antiChannelDelete");
const antiChannelCreate = require("./antiChannelCreate");
const antiRoleDelete = require("./antiRoleDelete");
const antiRoleCreate = require("./antiRoleCreate");
const antiBan = require("./antiBan");
const antiKick = require("./antiKick");

module.exports = {
  async handleChannelDelete(channel, config) {
    await antiChannelDelete(channel, config);
  },

  async handleChannelCreate(channel, config) {
    await antiChannelCreate(channel, config);
  },

  async handleRoleDelete(role, config) {
    await antiRoleDelete(role, config);
  },

  async handleRoleCreate(role, config) {
    await antiRoleCreate(role, config);
  },

  async handleBan(guildBan, config) {
    await antiBan(guildBan, config);
  },

  async handleKick(member, config) {
    await antiKick(member, config);
  }
};