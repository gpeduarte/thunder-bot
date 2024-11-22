import 'dotenv/config';
import {verifyKey} from 'discord-interactions';

export function VerifyDiscordRequest(clientKey) {
  return function (req, res, buf) {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');

    const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
    if (!isValidRequest) {
      res.status(401).send('Bad request signature');
      throw new Error('Bad request signature');
    }
  };
}

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent':
        'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
    },
    ...options,
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}

export async function getVehicleIDs(vehicleName) {
  let ids = await searchVehicleIDs(vehicleName);

  let arr = [];

  if(ids.length > 1)
    ids.map((id) => {
      arr.push(id)
    });
  else
    arr.push(ids[0]);

  return arr;
}

export async function getVehicleInfo(vehicleID) {
  let info = (await searchVehicleInfo(vehicleID));

  let w = {weapons: info.weapons};

  let weapon_names = [];

  w.weapons.map((weapon) => (weapon_names.push(weapon.name)));

  let country = "";

  if (info.country === "usa" || info.country === "ussr")
    country = info.country.toUpperCase();
  else
    country = info.country.charAt(0).toUpperCase() + info.country.slice(1);

  let vehicle_type = info.vehicle_type.toString().split('_');

  vehicle_type.map((word, i) => (
    vehicle_type[i] = word.charAt(0).toUpperCase() + word.slice(1)
  ));

  vehicle_type = vehicle_type.join(" ");

  let response = '{"country": "' + country + '", "vehicle_type": "' + vehicle_type + '", "arcade_br": ' + info.arcade_br + ', "realistic_br": ' + info.realistic_br + ', "realistic_ground_br": ' + info.realistic_ground_br + ', "simulator_br": ' + info.simulator_br + ', "simulator_ground_br": ' + info.simulator_ground_br + ', "is_premium": ' + info.is_premium + ', "weapons": [';

  weapon_names.forEach((weapon) => {
    response += '{"weapon"' + ': "' + weapon + '"}, ';
  });

  response = response.substring(0, response.length - 2);

  response += '], "weapon_count": ' + weapon_names.length + ', "image": "' + info.images.image + '"}';

  return JSON.parse(response);
}

async function searchVehicleInfo(vehicleID) {
  return await fetch(`https://www.wtvehiclesapi.sgambe.serv00.net/api/vehicles/` + vehicleID).then((response) => {
    return response.json();
  }).then((data) => {
    return data;
  });
}

async function searchVehicleIDs(vehicleName) {
  const response = await fetch(`https://www.wtvehiclesapi.sgambe.serv00.net/api/vehicles/search/` + vehicleName);
  return response.json();
}