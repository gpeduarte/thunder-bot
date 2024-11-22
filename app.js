import 'dotenv/config';
import express, {json} from 'express';
import {InteractionType, InteractionResponseType, MessageComponentTypes} from 'discord-interactions';
import {
  VerifyDiscordRequest,
  getVehicleIDs, getVehicleInfo
} from './utils.js';
import {vehicleDictionary, weaponDictionary} from './assets/dictionary.js';
import winston from "winston";



let date = new Date();

let logFile = 'logs/info_' + date.toDateString().split(' ').join('-') + '.log';

let errorFile = 'errors/error_' + date.toDateString().split(' ').join('-') + '.log';

let lastSeen = '';

let sepData = [];

let current = 0;

let logger = winston.createLogger({
  level: 'logs',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: logFile, level: 'info' }),
        new winston.transports.File({ filename: errorFile, level: 'error' })
    ],
});

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const {type, data, user} = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({type: InteractionResponseType.PONG});
  }

  if (type === InteractionType.MESSAGE_COMPONENT) {

    if(data.custom_id === 'previous'){
      current--;
      await searchVehicle(req, res, data, true);
    } else if (data.custom_id === 'next'){
      current++;
      await searchVehicle(req, res, data, true);
    } else {

      let vID = data.custom_id;
      try{
        let vehicleData = await getVehicleInfo(vID);

        if(vehicleData === null){
          return res.send({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, content: 'No vehicle found for ID ' + vID});
        }

        let countryOpt = '{"name": "Country", "value": "' + vehicleData.country + '"}';
        let vehicleTypeOpt = '{"name": "Vehicle Type", "value": "' + vehicleData.vehicle_type + '"}';
        let arcadeOpt = '{"name": "Arcade BR", "value": "' + vehicleData.arcade_br + '"}';

        let fieldOpt = countryOpt + ', ' + vehicleTypeOpt + ', ' + arcadeOpt + ', ';

        for (let i = 0; i < vehicleData.weapon_count; i++)
          fieldOpt += '{"name": "Weapon ' + i + '"' + ', "value": "' + weaponDictionary(vehicleData.weapons[i].weapon.toLowerCase()) + '"}, ';

        fieldOpt = fieldOpt.substring(0, fieldOpt.length - 2);

        fieldOpt = '[' + fieldOpt + ']';

        JSON.parse(fieldOpt);

        let response = '{\n' +
            '"type": ' + InteractionResponseType.UPDATE_MESSAGE + ',\n' +
            '"data": {\n' +
            '"embeds": [{\n' +
            '"type": "rich",\n' +
            '"title": "Vehicle info for ID",\n' +
            '"color": ' + 15548997 + ',\n' +
            '"image": { "url": "' + vehicleData.image + '"},\n' +
            '"fields": ' + fieldOpt + '\n}\n]\n}\n}';

        logRequest("info", req.body.member.user.username, vID);

        return res.send(JSON.parse(response));
      }catch (e) {
        logError(e);
        return res.send({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, content: 'An error occurred while trying to fetch vehicle info'});
      }
    }
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const {name} = data;

    if (name === 'search')
      return searchVehicle(req, res, data, false);

    if(name === 'info'){
      try{
        let id = data.options[0].value;
        let vehicleData = await getVehicleInfo(id);

        if(vehicleData === null){
          return res.send({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, content: 'No vehicle found for ID ' + id});
        }

        let countryOpt = '{"name": "Country", "value": "' + vehicleData.country + '"}';
        let vehicleTypeOpt = '{"name": "Vehicle Type", "value": "' + vehicleData.vehicle_type + '"}';
        let arcadeOpt = '{"name": "Arcade BR", "value": "' + vehicleData.arcade_br + '"}';

        let fieldOpt = countryOpt + ', ' + vehicleTypeOpt + ', ' + arcadeOpt + ', ';

        for (let i = 0; i < vehicleData.weapon_count; i++)
          fieldOpt += '{"name": "Weapon ' + i + '"' + ', "value": "' + weaponDictionary(vehicleData.weapons[i].weapon.toLowerCase()) + '"}, ';

        fieldOpt = fieldOpt.substring(0, fieldOpt.length - 2);

        fieldOpt = '[' + fieldOpt + ']';

        JSON.parse(fieldOpt);

        let response = '{\n' +
            '"type": ' + InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE + ',\n' +
            '"data": {\n' +
            '"embeds": [{\n' +
              '"type": "rich",\n' +
              '"title": "Vehicle info for ID",\n' +
              '"color": ' + 15548997 + ',\n' +
              '"image": { "url": "' + vehicleData.image + '"},\n' +
              '"fields": ' + fieldOpt + '\n}\n]\n}\n}';

        logRequest("info", req.body.member.user.username, data.options[0].value);

        return res.send(JSON.parse(response));
        }catch (e) {
            logError(e);
            return res.send({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, content: 'An error occurred while trying to fetch vehicle info'});
        }
    }
  logger.log('error', 'unknown command' + type);
  return res.status(400).json({ error: 'unknown command' });
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});

function logRequest(req, username, input) {
  logFile = 'logs/info_' + date.toDateString().split(' ').join('-') + '.log';
  const info = {
    level : 'info',
    message : username + ' requested ' + req + ' for ' + input + ' at ' + date.toTimeString().split(' ')[0]
  }
    logger.log(info);
}

function logError(error) {
  errorFile = 'errors/error_' + date.toDateString().split(' ').join('-') + '.log';
  const err = {
    level : 'error',
    message : 'An error occurred: ' + error + ' at ' + date.toTimeString().split(' ')[0]
  }
    logger.log(err);
}

async function searchVehicle(req, res, data, research) {
  try{

    if(!research){
      lastSeen = data.options[0].value;
      let idData = await getVehicleIDs(lastSeen);

      sepData = [];

      if(idData.length === 0){
        return res.send({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, content: 'No vehicle IDs found for ' + lastSeen});
      } else if (idData.length > 20) {
        let redos = Math.ceil(idData.length / 20);
        for (let i = 0; i < redos; i++)
          sepData.push(idData.slice(i*20, 20 * i + 20));
      } else {
        sepData.push(idData);
      }
      logRequest("search", req.body.member.user.username, lastSeen);
    }

    let counter = 0;

    let lastRow = 0;

    let rows = [{
      type: 1,
      components: []
    }];

    for (let j = 0; j < sepData[current].length; j++) {
      if (counter < 5 && lastRow <= 4) {
        rows[lastRow].components.push({
          type: 2,
          label: vehicleDictionary(sepData[current][j].toLowerCase()),
          style: 2,
          custom_id: sepData[current][j],
          disabled: false,
          value: sepData[current][j],
        });
        counter++;
      } else {
        rows.push({
          type: 1,
          components: []
        });
        counter = 0;
        lastRow++;
        j--;
      }
    }

    if(sepData.length > 1){
      rows.push({
        type: 1,
        components: []
      })
      lastRow++;
      rows[lastRow].components.push({
        type: 2,
        label: 'Previous',
        style: 1,
        custom_id: 'previous',
        disabled: (current === 0),
        value: 'previous'
      });
      rows[lastRow].components.push({
        type: 2,
        label: 'Next',
        style: 1,
        custom_id: 'next',
        disabled: (current === sepData.length - 1),
        value: 'next'
      });
    }

    return res.send({
      type: (research ? InteractionResponseType.UPDATE_MESSAGE : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE),
      data: {
        embeds: [{
          type: "rich",
          title: 'Here are the vehicle IDs for ' + lastSeen,
          color: 15548997,
          fields: []
        }],
        components: rows
      }
    });
  }catch (e) {
    logError(e);
    return res.send({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, content: 'An error occurred while trying to fetch vehicle IDs'});
  }
}
