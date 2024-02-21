# WispJS
<p align="left">
    <a href="https://discord.gg/5JUqZjzmYJ" alt="Discord Invite"><img target="_blank" src="https://img.shields.io/discord/981394195812085770?label=Support&logo=discord&logoColor=white" /></a>
    <a href="https://www.npmjs.com/package/@cfc-servers/wispjs" alt="NPM Package Link"><img target="_blank" src="https://img.shields.io/npm/v/%40cfc-servers%2Fwispjs?label=NPM&logo=npm" /></a>
    <a href="https://docs.wispjs.com" alt="Docs Link"><img target="_blank" src="https://img.shields.io/badge/Docs-docs.wispjs.com-blue?logo=readthedocs" /></a>
</p>

JS Library for interacting with [Wisp](https://wisp.gg/) instances.

The entire [Wisp API](https://gamepanel.notion.site/API-Documentation-7b6a2cd53a1047aa9f8c7942ca0c1fe1) is implemented and documented to the best of our abilities.

We also added a lot of documentation _(i.e. response codes, special notes about weird behavior, etc.)_ that is absent from the official docs.

### Compatability Notes
- This library is confirmed working for [Physgun](https://physgun.com/)-based instances
- This almost certainly _(but remains unconfirmed)_ works with wisp.gg instances
- This may also work for Pterodactyl servers, but we haven't been able to confirm this yet

We're always looking for notes about what this does/doesn't work for! Please leave a note in a Discussion or Issue if you learn something

## What can I do with this?
Well.. anything!

Everything you normally do in your Wisp panel is fully replicable using this library.


## How do I use this?

(Full docs available at: https://docs.wispjs.com)

It depends on what you want to do.

For essentially all use-cases, though, you will need a Wisp API Token.
To generate one, visit: `https://<your.wisp.domain>/account/security` _(while logged in)_ and generate a new Token.


_(This tool was made for developers, so I assume you're one too!)_

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
