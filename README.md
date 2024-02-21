# WispJS
<p align="left">
    <a href="https://discord.gg/5JUqZjzmYJ" alt="Discord Invite"><img src="https://img.shields.io/discord/981394195812085770?label=Support&logo=discord&logoColor=white" /></a>
    <a href="https://www.npmjs.com/package/@cfc-servers/wispjs" alt="NPM Package Link"><img src="https://img.shields.io/npm/v/%40cfc-servers%2Fwispjs?label=NPM&logo=npm" /></a>
    <a href="https://docs.wispjs.com" alt="Docs Link"><img src="https://img.shields.io/badge/Docs-docs.wispjs.com-blue?logo=readthedocs" /></a>
</p>

JS Library for interacting with [Wisp](https://wisp.gg/) instances.

The entire [Wisp API](https://gamepanel.notion.site/API-Documentation-7b6a2cd53a1047aa9f8c7942ca0c1fe1) is implemented and documented to the best of our abilities.

We also added a lot of documentation _(i.e. response codes, special notes about weird behavior, response types, etc.)_ that is absent from the official docs.

### Compatability Notes
- This library is confirmed working for [Physgun](https://physgun.com/)-based instances
- This almost certainly _(but remains unconfirmed)_ works with wisp.gg instances
- This may also work for Pterodactyl servers, but we haven't been able to confirm this yet

We're always looking for notes about what this does/doesn't work for! Please leave a note in a Discussion or Issue if you learn something

## What can I do with this?
Well.. anything!

Everything you normally do in your Wisp panel is fully replicable using this library.

## Installation
```
npm i @cfc-servers/wispjs@v2
```

## Usage
_(Full docs available at: https://docs.wispjs.com)_

For essentially all use-cases, you will need a Wisp API Token.
To generate one, visit:
```
https://<your.wisp.domain>/account/security
```
_(while logged in)_ and generate a new Token.

<br>

In general, your WispJS code will start like this:
```js
import { WispInterface } from "@cfc-servers/wispjs"

const domain = "<your.wisp.domain>"

// You still need to provide this even if you're not doing anything server-specific (this will be improved)
const uuid = "<the uuid of the server you'll be messing with>"

const token = "<your wisp token>"

const wisp = new WispInterface(domain, uuid, token)
```


### The HTTP API vs. the WebSocket API
In Wisp exists both an HTTP API and a WebSocket API. They do different things, but both are needed for full functionality.

In general, the Wisp Socket is used for interacting with a server _intance_. Things like issuing console commands, watching console output, and more.

For almost everything else in the Wisp panel, you use the HTTP API. Databases, subusers, filesystem - it's all through the HTTP API.


In WispJS, you access each of these as you might expect:
```js
import { WispInterface } from "@cfc-servers/wispjs"

...

(async () => {
    const wisp = new WispInterface(domain, uuid, token)

    const api = wisp.api
    const socket = wisp.socket
})()
```

### Git Pulling / Cloning private repositories
If you need to interact with private repositories, you'll need to generate a new access token. On GitHub, these are called Personal Access Tokens _(Fine Grained probably works too)_.
Once you generate one, you just need to pass it to your `WispInterface`:
```js

const ghPAT = "<your personal access token>"

(async () => {
    const wisp = new WispInterface(domain, uuid, token, ghPAT)
    const socket = wisp.socket
})()
```
If you don't provide this and end up needing it, WispJS will produce an error the next time it gets a Git authentication failure.

### Server-specific functions
When creating a new WispInterface instance, you give it a Server UUID. All future functions that operate on a specific server will operate on that server.

You can make multiple WispInterface instances to manage multiple servers, or change the server UUID at runtime:
```js
(async () => {
    const wisp = new WispInterface(domain, uuid, token)
    const api = wisp.api

    // Sends to the the `uuid` server
    await api.Servers.SendCommand( "some_concmd" )

    // Update the UUID and send to the next server
    api.core.setUUID( "newUUID" )
    await api.Servers.SendCommand( "some_concmd" )
})()
```

### Cloud Hosting
This library runs just fine on GitHub Actions, Cloudflare Workers, and I'm sure many others.

#### Special note about Cloudflare Workers
Almost all Wisp Websockets are hosted on a different port, usually `:8080`. Cloudflare doesn't allow us to make requests to nonstandard HTTP ports.

At CFC, we host a dead-simple Nginx instance that proxies the requests through our dedicated server.
If you get stuck on this, please make an Issue and we'll try to provide a more robust solution.

<br>

## API
This is a general rundown of the functions you can use.
Please consult [the docs](https://docs.wispjs.com/) for types, parameters, and everything you'd need to actually use them.

### WispInterface
 - `disconnect`

### WispInterface.api.Allocations
_Manage all IP allocations_
 - `List`
 - `Update`

### WispInterface.api.AuditLogs
_Used to review Audit Logs_
 - `List`

### WispInterface.api.Backups
_Manage Server backups_
 - `List`
 - `Create`
 - `ToggleLock`
 - `Deploy`
 - `GetDownloadURL`
 - `Delete`

### WispInterface.api.Databases
_Manage Databases_
 - `List`
 - `Delete`
 - `RotatePassword`

### WispInterface.api.FastDL
_Sync FastDL for a Server_
 - `Sync`

### WispInterface.api.Filesystem
_Interact with the Filesystem_
 - `GetDirectoryContents`
 - `CreateDirectory`
 - `ReadFile`
 - `WriteFile`
 - `CopyFile`
 - `DeleteFiles`
 - `GetFileDownloadURL`
 - `RenameFile`
 - `CompressFiles`
 - `DecompressFile`

### WispInterface.api.Mods
_Use the "Mods" feature_
 - `List`
 - `ToggleInstall`

### WispInterface.api.Schedules
_Manage Schedules_
 - `List`
 - `GetDetails`
 - `Create`
 - `Update`
 - `Trigger`
 - `Delete`
 - `CreateTask`
 - `UpdateTask`
 - `DeleteTask`

### WispInterface.api.Servers
_A set of functions to manage a specific server_
 - `SendCommand`
 - `GetWebsocketDetails`
 - `SetName`
 - `GetDetails`
 - `GetResources`
 - `PowerRequest`

### WispInterface.api.Startup
_Get and adjust server Startup params (default map, tickrate, etc.)_
 - `Get`
 - `Update`

### WispInterface.api.Subusers
_Create, List, Update, Delete Subusers_
 - `List`
 - `GetDetails`
 - `GetAllPermissions`
 - `Create`
 - `Update`
 - `Delete`

### WispInterface.socket
_Interact with the realtime websocket for a Server_
 - `setWebsocketDetailsPreprocessor`
    - Allows you to modify the reeturned websocket details (i.e. for setting up a proxy)
 - `filesearch`
    - Performs the same file search as when you use the "Search" box in the Web File Browser
 - `gitPull`
    - Pulls an existing git repo
 - `gitClone`
    - Clones a git repo
 - `addConsoleListener`
    - Adds a callback that gets called every time a new console message is received from the server
 - `removeConsoleListener`
 - `sendCommandNonce`
    - Sends a command with a "nonce"
