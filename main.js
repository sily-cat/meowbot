
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
            case "say":
                payload.data.content = body.data.options[0].value;
                break;
            case "send":
                payload.data.content = "Message recieved";
                payload.data.flags = 64; // ephemeral
                if (body.data.options[0].value.includes("@")) {
                    payload.data.content = "@ is not allowed in /send";
                } else {
                    sendMessage(body.data.options[0].value, body.channel_id);
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
                payload.data.content = "pong!\nregion: " + Deno.env.get("DENO_REGION");
                break;
            case "octad":
                switch (body.data.options[0].name) {
                    case "generate":
                        payload.data.content = octadPuzzle();
                        break;
                    case "solve":
                        payload.data.flags = 64;
                        payload.data.content = "i can't do that yet, sorry!!"
                        break;
                }
                break;
            case "catness":
                var username;
                if (Object.keys(body.data).includes("options")) {
                    const users = body.data.resolved.users;
                    const key_name = Object.keys(users)[0];
                    if (users.global_name = null) {
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
                        if (body.member.user.global_name == null) {
                            username = body.member.user.username;
                        } else {
                            username = body.member.user.global_name;
                        }
                    }
                }
                if (username.includes("cat") || username.includes("ii") || username.includes("meow")) { // bias
                    const catness = 90 + getRandomInt(10);
                    payload.data.content = username + " is " + catness + "% cat!!";
                } else {
                    payload.data.content = username + " is " + getRandomInt(100) + "% cat!!"
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

function meowText() {
    var meows = [
        "meow :3",
        "mroww",
        "mroww :3",
        "mreow >w<",
        "meoww :3",
        "mrrp :3"
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