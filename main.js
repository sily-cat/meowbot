import { solveOctad } from "./octad.js";
import { default as Alea, Mash } from "jsr:@iv/alea";
import nacl from "https://esm.sh/tweetnacl@v1.0.3"; // i dont want to learn how authentication works
import { Buffer } from "node:buffer"; // needs this for some reason? idk i copied the authentication code from discord
const public_key = Deno.env.get("PUBLIC_KEY");
const api = "https://discord.com/api/v10";
const token = Deno.env.get("BOT_TOKEN");
const app_id = Deno.env.get("APP_ID");
const my_id = Deno.env.get("MY_ID"); // for future use, commands only usable by me

var head = new Headers(); // setting up the http header for later use
head.append("Content-Type", "application/json");
head.append("Authorization", "Bot " + Deno.env.get("BOT_TOKEN"));
// i dont know if this user agent is valid, but it works so whatever
head.append("User-Agent", "DiscordBot (https://discord.com/oauth2/authorize?client_id=" + app_id + ", 0.0.1)");

Deno.serve(async (req) => {

    if (req.method == "GET") { // serve the website!
        const payload = await Deno.readTextFile("index.html");
        return new Response(
            payload,
            {
                status: 200,
                headers: {
                    "content-type": "text/html; charset=utf-8"
                }
            }
        )
    }

    // discord authentication

    const sig = req.headers.get("X-Signature-Ed25519");
    const time = req.headers.get("X-Signature-Timestamp");

    if (!sig && !time) {
        console.log("failed verification");
        return new Response(
            JSON.stringify({ message: "invalid request" }),
            {
                status: 403,
                headers: {
                    "content-type": "application/json"
                }
            });
    }

    const text = await req.text();

    const valid = nacl.sign.detached.verify( // i have no clue what this does i just know it works
        Buffer.from(time + text),
        Buffer.from(sig, "hex"),
        Buffer.from(public_key, "hex")
    );

    if (!valid) {
        console.log("failed validation");
        return new Response(
            JSON.stringify({ message: "invalid request signature" }),
            {
                status: 401,
                headers: {
                    "content-type": "application/json"
                }
            });
    }

    console.log("valid request!");

    const body = JSON.parse(text);

    // this is a valid discord request, now to do something with it

    if (body.type == 1) {
        console.log("ping request"); // self explanatory
        return new Response(
            JSON.stringify({ type: 1 }),
            {
                status: 200,
                headers: {
                    "content-type": "application/json"
                }
            });
    }

    if (body.type == 2) {
        console.log("command request");
        var payload = {
            type: 4,
            data: {}
        }
        switch (body.data.name) {
            case "meow":
                payload.data.content = meowText();
                break;
            case "update":
                if (body.user.id == my_id) {
                    payload.data.content = await updateCommands();
                }
                break;
            case "wipers":
                const current_date = new Date();
                const random_seed = " " + current_date.getDate() + " " + current_date.getFullYear() + " " + current_date.getMonth();
                const wiper_sale = seedRandomInt(10, random_seed);
                if (wiper_sale >= 6) {
                    payload.data.content = "windshield wipers are **" + wiper_sale + "0% off** today!!";
                } else {
                    payload.data.content = "windshield wipers are not on sale today";
                }
                break;
            case "say":
                payload.data.content = body.data.options[0].value;
                break;
            case "send":
                payload.data.content = "/send requires the `meowbot send` role";
                payload.data.flags = 64; // ephemeral
                if (Object.keys(body).includes("member")) {
                    if (Object.keys(body.member).includes("roles")) {
                        const guild_roles = await get(api + "/guilds/" + body.guild_id + "/roles", head);
                        const send_role = guild_roles.find((el) => el.name == "meowbot send");
                        if (send_role && body.member.roles.includes(send_role.id)) {
                            if (body.data.options[0].value.includes("@")) {
                                payload.data.content = "@ is not allowed in /send";
                            } else {
                                payload.data.content = "message recieved";
                                sendMessage(body.data.options[0].value, body.channel_id);
                            }
                        }
                    }
                }
                break;
            case "cat":
                var cat = await getCat();
                payload.data.content = "[cat](" + cat + ")";
                payload.data.components = [ // another! button
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                label: "another!",
                                style: 2,
                                custom_id: "anothercat"
                            }
                        ]
                    }
                ];
                break;
            case "ping":
                const curent_date = new Date();
                const radom_seed = " " + curent_date.getDate() + " " + curent_date.getFullYear() + " " + curent_date.getMonth();
                payload.data.content = "pong!\nregion: " + Deno.env.get("DENO_REGION") + "\ndatetime: " + radom_seed;
                break;
            case "octad":
                switch (body.data.options[0].name) {
                    case "generate":
                        payload.data.content = octadPuzzle();
                        break;
                    case "solve":
                        var msg = body.data.options[0].options[0].value;
                        var input_octad = [];
                        for (var i = 0; i < msg.length; i++) {
                            if (msg[i] === "0" || msg[i] === "•") {
                                input_octad.push(0);
                            }
                            if (msg[i] === "1") {
                                input_octad.push(1);
                            }
                        }
                        var output_octad = solveOctad(input_octad);
                        output_octad.splice(20, 0, " ");
                        output_octad.splice(16, 0, " ");
                        output_octad.splice(12, 0, " ");
                        output_octad.splice(8, 0, " ");
                        output_octad.splice(4, 0, " ");
                        payload.data.content = output_octad.join("");
                        break;
                }
                break;
            case "catness":
                var username;
                if (Object.keys(body.data).includes("options")) {
                    const users = body.data.resolved.users;
                    const key_name = Object.keys(users)[0];
                    if (users[key_name].global_name == null) {
                        username = users[key_name].username;
                    } else {
                        username = users[key_name].global_name;
                    }
                } else {
                    if (Object.keys(body).includes("user")) {
                        if (body.user.global_name == null) {
                            username = body.user.username;
                        } else {
                            username = body.user.global_name;
                        }
                    } else {
                        if (body.member.nick !== null) {
                            username = body.member.nick;
                        } else if (body.member.user.global_name == null) {
                            username = body.member.user.username;
                        } else {
                            username = body.member.user.global_name;
                        }
                    }
                }
                if (username.includes("cat") || username.includes("ii") || username.includes("meow") || username.includes("sun") || username.includes("ie") || username.includes("!")) { // bias
                    const catness = 90 + getRandomInt(10);
                    payload.data.content = username + " is **" + catness + "%** cat!!";
                } else if (username.includes("sin")) {
                    const catness = 24;
                    payload.data.content = username + " is **" + catness + "%** cat!!";
                } else {
                    payload.data.content = username + " is **" + getRandomInt(100) + "%** cat!!"
                }
                break;
        }
        return new Response(
            JSON.stringify(payload),
            {
                status: 200,
                headers: {
                    "content-type": "application/json"
                }
            });
    }

    if (body.type == 3) {
        console.log("message component request");
        var payload = {
            type: 4,
            data: {}
        }
        switch (body.data.custom_id) {
            case "anothercat": // clicked the another button!!
                var url = api + "/channels/" + body.message.channel_id + "/messages/" + body.message.id;
                console.log(url);
                console.log("another cat");
                var thing = await fetch(url, { // patch request to remove the old button
                    method: "PATCH",
                    headers: head,
                    body: JSON.stringify({ components: [] })
                });
                var cat = await getCat();
                payload.data.content = "[cat](" + cat + ")";
                payload.data.components = [ // might make a function to simplify adding components later
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                label: "another!",
                                style: 2,
                                custom_id: "anothercat"
                            }
                        ]
                    }
                ];
                break;
        }
        return new Response( // send!!
            JSON.stringify(payload),
            {
                status: 200,
                headers: {
                    "content-type": "application/json"
                }
            });
    }

    return new Response( // should never get here, but if it does heres a handler for it
        JSON.stringify({ message: "bad request" }),
        {
            status: 400,
            headers: {
                "content-type": "application/json"
            }
        });
});

function getRandomInt(max) { // stole this from mdn web docs
    return Math.floor(Math.random() * max);
}

function seedRandomInt(max, seed) {
    const alea = new Alea({
        seed: seed
    });
    return Math.floor(alea.random() * max)
}

function meowText() {
    var meows = [
        "meow :3",
        "mroww",
        "mroww :3",
        "mreow >w<",
        "meoww :3",
        "mrrp :3",
        "nyan :3",
        "mlem :3",
        "meowmeow",
        "maow :3",
        "maow ^w^",
        "purrrrr ~w~",
        "nyaaa",
        "miau ~w~",
        "miau :3"
    ];
    return meows[getRandomInt(meows.length - 1)];
}

async function sendMessage(message, channel) {
    var url = api + "/channels/" + channel + "/messages";
    var payload = {
        content: message
    }
    await fetch(url, {
        method: "POST",
        headers: head,
        body: JSON.stringify(payload)
    });
    console.log("sent message");
}

async function getCat() { // might switch to cataas as it doesnt have a limit
    const url = "https://api.thecatapi.com/v1/images/search";
    const header = { 'x-api-key': Deno.env.get("CAT_API") }
    var body = await get(url, header);
    return body[0].url;
}

async function get(url, header) {
    var result = await fetch(url, {
        method: "GET",
        headers: header
    });
    var text = await result.text();
    var body = JSON.parse(text);
    return body;
}

function octadPuzzle() {
    var puzzle = "•••• •••• •••• •••• •••• ••••".split("");
    var i = 0;
    var possible_index;
    while (i < 5) {
        possible_index = getRandomInt(puzzle.length - 1);
        if (puzzle[possible_index] == "•") {
            puzzle[possible_index] = 1;
            i++;
        } else {
            continue;
        }
    }
    return puzzle.join("");
}

async function updateCommands() {
    var url = api + "/applications/" + app_id + "/commands";
    var payload = [
        {
            name: "catness",
            description: "finds out how cat someone is",
            type: 1,
            contexts: [0, 1, 2],
            integration_types: [0, 1],
            options: [
                {
                    name: "person",
                    description: "who to check",
                    type: 6
                }
            ]
        },
        {
            name: "update",
            description: "update command list (OWNER ONLY)",
            type: 1,
            contexts: [1],
            integration_types: [1],
        },
        {
            name: "meow",
            description: "send a random meow",
            type: 1,
            contexts: [0, 1, 2],
            integration_types: [0, 1],
        },
        {
            name: "say",
            description: "say something",
            type: 1,
            contexts: [0, 1, 2],
            integration_types: [0, 1],
            options: [{
                name: "message",
                type: 3,
                description: "the message to say",
                required: true
            }]
        },
        {
            name: "send",
            description: "send something as the bot",
            type: 1,
            contexts: [0],
            integration_types: [0],
            options: [{
                name: "message",
                type: 3,
                description: "the message to say",
                required: true
            }]
        },
        {
            name: "ping",
            description: "ping the bots servers",
            type: 1,
            contexts: [0, 1, 2],
            integration_types: [0, 1],
        },
        {
            name: "wipers",
            description: "are windshield wipers on sale today?",
            type: 1,
            contexts: [0, 1, 2],
            integration_types: [0, 1],
        },
        {
            name: "octad",
            description: "octad",
            type: 1,
            options: [
                {
                    name: "generate",
                    description: "generate a puzzle",
                    type: 1,
                    contexts: [0, 1, 2],
                    integration_types: [0, 1]
                },
                {
                    name: "solve",
                    description: "solve a puzzle",
                    type: 1,
                    contexts: [0],
                    integration_types: [0],
                    options: [{
                        name: "puzzle",
                        type: 3,
                        description: "the puzzle to solve",
                        required: true
                    }]
                }
            ]
        }
    ];
    const response = await fetch(url, {
        method: "PUT",
        headers: head,
        body: JSON.stringify(payload)
    });
    return response.status + " " + response.statusText;
}