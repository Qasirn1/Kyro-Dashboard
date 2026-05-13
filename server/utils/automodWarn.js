module.exports = async (message, reason) => {

    try {

        await message.author.send(
            `⚠ ${message.author}, your message in **${message.guild.name}** was removed.\n\nReason: **${reason}**`
        );

    } catch {
        // user has DMs closed
    }

};