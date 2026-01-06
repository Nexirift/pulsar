# @nexirift/pulsar.js

**Strongly-typed official Pulsar SDK for browsers/Node.js.**

[![NPM](https://nodei.co/npm/@nexirift/pulsar-js.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/@nexirift/pulsar-js)

Official Pulsar SDK for JavaScript (TypeScript). Works on browsers and Node.js.

The following features are provided:

- User authentication
- API requests
- Streaming
- Utility functions
- Various Pulsar type definitions

Compatible with Pulsar version 2025.12.14-ptb.1 and above.

## Install

```
npm i @nexirift/pulsar-js
```

# Usage

It is convenient to import everything together as follows:

```ts
import * as Misskey from '@nexirift/pulsar-js';
```

For convenience, subsequent code examples assume that you have imported `* as Misskey` as shown above.

However, this import method prevents tree-shaking, so for use cases where code size is important, we recommend individual imports like the following:

```ts
import { api as misskeyApi } from '@nexirift/pulsar-js';
```

## Authenticate

todo

## API request

When using the API, initialize an instance of the `APIClient` class with the server information and access token, then call the `request` method of that instance to make requests.

```ts
const cli = new Misskey.api.APIClient({
	origin: 'https://pulsar.test',
	credential: 'TOKEN',
});

const meta = await cli.request('meta', { detail: true });
```

The first argument to `request` is the endpoint name to call, and the second argument is the parameter object. The response is returned as a Promise.

## Streaming

pulsar.js streaming provides two classes.
One is the `Stream` class, which manages the streaming connection itself, and the other is the `Channel` class, which represents the concept of a channel on the stream.
When using streaming, first initialize an instance of the `Stream` class, then use the methods of the `Stream` instance to obtain instances of the `Channel` class.

```ts
const stream = new Misskey.Stream('https://pulsar.test', { token: 'TOKEN' });
const mainChannel = stream.useChannel('main');
mainChannel.on('notification', notification => {
	console.log('notification received', notification);
});
```

The connection will automatically reconnect if disconnected.

### Connecting to a channel

To connect to a channel, use the `useChannel` method of the `Stream` class.

Without parameters

```ts
const stream = new Misskey.Stream('https://pulsar.test', { token: 'TOKEN' });

const mainChannel = stream.useChannel('main');
```

With parameters

```ts
const stream = new Misskey.Stream('https://pulsar.test', { token: 'TOKEN' });

const chatChannel = stream.useChannel('chat', {
	other: 'xxxxxxxxxx',
});
```

### Disconnecting from a channel

Call the `dispose` method of the `Channel` class.

```ts
const stream = new Misskey.Stream('https://pulsar.test', { token: 'TOKEN' });

const mainChannel = stream.useChannel('main');

mainChannel.dispose();
```

### Receiving messages

The `Channel` class extends EventEmitter, and when a message is received from the server, it emits the payload with the received event name.

```ts
const stream = new Misskey.Stream('https://pulsar.test', { token: 'TOKEN' });
const mainChannel = stream.useChannel('main');
mainChannel.on('notification', notification => {
	console.log('notification received', notification);
});
```

### Sending messages

You can use the `send` method of the `Channel` class to send messages to the server.

```ts
const stream = new Misskey.Stream('https://pulsar.test', { token: 'TOKEN' });
const chatChannel = stream.useChannel('chat', {
	other: 'xxxxxxxxxx',
});

chatChannel.send('read', {
	id: 'xxxxxxxxxx'
});
```

### Connection established event

The `_connected_` event of the `Stream` class is available.

```ts
const stream = new Misskey.Stream('https://pulsar.test', { token: 'TOKEN' });
stream.on('_connected_', () => {
	console.log('connected');
});
```

### Connection disconnected event

The `_disconnected_` event of the `Stream` class is available.

```ts
const stream = new Misskey.Stream('https://pulsar.test', { token: 'TOKEN' });
stream.on('_disconnected_', () => {
	console.log('disconnected');
});
```

### Connection state

You can check it with the `state` property of the `Stream` class.

- `initializing`: Before connection is established
- `connected`: Connection completed
- `reconnecting`: Reconnecting

---

<div align="center">
	<a href="https://code.nexirift.com/Nexirift/pulsar/src/branch/develop/CONTRIBUTING.md"><img src="https://assets.misskey-hub.net/public/i-want-you.png" width="300"></a>
</div>
