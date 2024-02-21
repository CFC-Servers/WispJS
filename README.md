# WispJS
JS Library for interacting with Wisp.
100% of the current [Wisp API](https://gamepanel.notion.site/API-Documentation-7b6a2cd53a1047aa9f8c7942ca0c1fe1) is implemented.

This library is confirmed working for [Physgun](https://physgun.com/)-based servers, and we're looking for help confirming other platforms!
This may also work for Pterodactyl servers as well, but this hasn't been confirmed yet.


## How do I use this?

It depends on what you want to do.

For essentially all use-cases, though, you will need a Wisp API Token.
To generate one, visit: `https://<your.wisp.domain>/account/security` _(while logged in)_ and generate a new Token.


This tool was made for developers, so I assume you're one too!

In general, your WispJS code will start like this:
```js
import { WispInterface } from "wispjs"

const domain = "<your.wisp.domain>"

// You still need to provide this even if you're not doing anything server-specific (this will be improved)
const uuid = "<the uuid of the server you'll be messing with>"

const token = "<your wisp token>"

const wisp = new WispInterface(domain, uuid, token)
```


### The HTTP API vs. the WebSocket API
In Wisp exists both an HTTP API and a WebSocket API. They do different things, but both are needed for full functionality.

In general, the Wisp Socket is used for interacting with a server _intance_. Things like power control, issuing console commands, watching console output, and more.

For almost everything else in the Wisp panel, you use the HTTP API. Databases, subusers, filesystem - it's all through the HTTP API.


In WispJS, you access each of these as you might expect:
```js
import { WispInterface } from "wispjs"

...

(async () => {
    const wisp = new WispInterface(domain, uuid, token)

    // This is ready to use!
    const api = wisp.api

    // Once you run `.connect()`, you can start using the WebSocket library
    await wisp.connect()
    const socket = wisp.socket
})()
```

### Git Pulling / Cloning private repositories
If you need to interact with private repositories, you'll need to generate a new access token. On GitHub, these are called Personal Access Tokens _(Fine Grained probably works too)_.
Once you generate one, you just need to pass it to `wisp.connect()`:
```js

const ghPAT = "<your personal access token>"

(async () => {
    const wisp = new WispInterface(domain, uuid, token)

    await wisp.connect(ghPAT)
    const socket = wisp.socket
})()
```

If you don't provide this and end up needing it, WispJS will produce an error the next time it gets a Git authentication failure.
