const Discord = require('discord.js');
const fs = require('fs');
const dictionary = require('./dictionary');
let hasLoaded = false;
const botId = process.env.BOT_ID;
const botToken = process.env.token;

function pullMessages(channel, begin) {
    return channel.fetchMessages({limit: 100, after: begin})
        .then(messages => {
            const messagesArray = messages.array();
            let nextBegin;
            if (messagesArray.length > 0) {
                nextBegin = messagesArray[0].id;
                for (const message of messagesArray) {
                    const mentions = message.mentions.users.array();
                    let wasMentioned = false;
                    for (const mention of mentions) {
                        if (mention.id === botId) {
                            wasMentioned = true;
                        }
                    }
                    if (message.content != '' && 
                        !message.author.bot &&
                        !wasMentioned) {
                        fs.appendFileSync('messages.txt', message.content + '\n');
                    }
                }
            }
            if (nextBegin) {
                channels[channel.id] = nextBegin;
                fs.writeFileSync('channelsAndMessages.txt', JSON.stringify(channels));
            }
            if (messagesArray.length === 100) {
                return pullMessages(channel, nextBegin);
            }
        }) 
        .catch(error => {
            console.error();
        });
}

function sentenceGenerator(message) {
    let sentence;
    if (message) {
        const words = cleanMessage(message).split(/[\s]+/).slice(1);
        let markovWord;
        if (words.length > 0) {
            markovWord = words[Math.floor(Math.random() * words.length)];
        }
        sentence = MarkovDictionary.createMarkovSentence(markovWord);
    } else {
        sentence = MarkovDictionary.createMarkovSentence();
    }

    return sentence;
}

function fillDictionary() {
    fs.readFile('messages.txt', 'utf8', (err, data) => {
        if (err) throw err;

        const parsedData = data.split(/[\n]+/);

        for (let i = 0; i < parsedData.length - 1; i++) {
            MarkovDictionary.addLine(parsedData[i]);
        }

        hasLoaded = true;
    })
};


client.on('error', (error) => {
    console.error(new Date() + ": Discord client encountered an error");
    console.error(error);
});

client.on('ready', async () => {
    /*channelsAndMessages.txt is formatted like {'channelId':'message#, 'channel2Id':'message#'}
    In order to add a channel just add in the channel's id and set the message number to 0*/
    channels = JSON.parse(fs.readFileSync('channelsAndMessages.txt', 'utf8'));

    const pullMessagesPromises = [];
    for (const channel in channels) {
        let channelHolder = client.channels.get(channel.toString());
        pullMessagesPromises.push(pullMessages(channelHolder, channels[channel]));
    }
    await Promise.all(pullMessagesPromises);

    fillDictionary();
});

client.on('message', (msg) => { 
    if (hasLoaded) {
        const mentions = msg.mentions.users.array();
        let wasMentioned = false;
        for (const mention of mentions) {
            if (mention.id === botId) {
                wasMentioned = true;
            }
        }

        if (wasMentioned) {
                let sentence = sentenceGenerator(msg.content)
                client.channels.get(msg.channel.id).send(sentence);
        }

        if (
            hasLoaded &&
            channels[msg.channel.id] &&
            !msg.author.bot
            ) {
    
            for (let i = 0; i < lines.length; i++) {
                if (lines[i] !== '') {
                    MarkovDictionary.addLine(lines[i]);
                    fs.appendFileSync('messages.txt', lines[i] + '\n');
                }
            }
            channels[msg.channel.id] = msg.id;
            fs.writeFileSync('channelsAndMessages.txt', JSON.stringify(channels));
    
        }
    }

}

client.login(botToken);