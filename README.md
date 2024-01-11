# Energy Management Local Communications Protocol Node.JS SDK

[![Dependency Status][dependency-status-svg]][dependency-status-link]
[![devDependency Status][dev-dependency-status-svg]][dev-dependency-status-link]
[![npm version][npm-version-svg]][npm-version-link]

This node module allows you to experiment with the Energy Management Local
Communications Protocol, or **EMLCP**, to query and control EM Devices, or, in
the context of this documentation **EM Nodes**, and provides an example
implementation leveraging best practices.

------------

## Release Status

This Node.JS SDK, while a useful example of leveraging the protocol and utilizing
best practices for common workflows, should be considered in an Alpha state and
not suitable for production applications. However, the SDK is open-source and
contributions to enhance the state of the SDK are encouraged!

## Overview and Terminology

Relevant Documentation can be found at:

- [Node.JS SDK API](docs/api.md): Complete API documentation for this SDK
- [Understanding EM Local
  Communications](https://api.em.eaton.com/docs#section/EM-API-Overview/Understanding-Local-Communications):
  Documentation that descrbies, at a high level, local communications with EM
  Nodes.
- [EM Local Communications Protocol](https://api.em.eaton.com/docs/emlcp.html):
  Complete API documentation for the EMLCP used on the local
  network that this SDK is implemented against.
- [EM Partner API](https://api.em.eaton.com/docs): Complete REST API
  documentation.
- [Examples/README.md](Examples/README.md): Contains documentation on the
  provided examples and the necessary steps to begin leveraging them.

Terminology:

- EMLCP: Energy Management Local Communications Protocol
- EM Node: A generic name for an EM Device (including EMCBs) on the local
  network
- EM Coordinator: A name for the coordinator that is utilizing the [EM Local
  Communications Protocol](https://api.em.eaton.com/docs/emlcp.html) to
  communicate with EM Nodes on the local network (this Node.JS SDK serves as an
  EM Coodinator)

**NOTE:** The implementation utilizes `Emcb` and `EMCB` as a prefix for several
entities and constants, such as `EmcbUDPbroadcastCoordinator` and
`EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS`, and this will be updated to use more
generic `EmNode` and `EM_LCP` terminology throughout in a later release.

## Installation

### npm

`npm install --save emcb-udp-coordinator`

### Manual

```sh
git clone https://github.com/EatonEM/emcb-udp-coordinator
cd emcb-udp-coordinator
npm install
```

## Logging

This SDK exposes a pre-configured
[winston@3](https://github.com/winstonjs/winston)
[`logger`](docs/api.md#logger).  It also overrides `console.log`, etc. so that
all logs are captured by [winston](https://github.com/winstonjs/winston).

These logs are written to both the console and to `./logs/` whenever the
`emcb-udp-coordinator` is used to aid in debugging/understanding. See
[docs/api.md](./docs/api.md#logger) for more information.

## Requirements

You will need the following installed in your environment:

- Node.js and npm (Node Package Manager)
- git

> This library has been developed and tested on macOS using node v10.14.3.
> **v10 or greater of Node.js is required.**

### Git

`git` should be available in your `$PATH` as `npm` might need it. You can find
git at [https://git-scm.com/](https://git-scm.com/).

### Node

#### Node installation on Windows

The [official Node.js website](https://nodejs.org/) has an installer available
for download.

#### Node installation on macOS

For macOS, the preferred installation method is to use [nvm (Node Version
Manager)](https://github.com/creationix/nvm).  You can install nvm and the
latest version of node using these commands:

```sh
# Download and install nvm
$ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash

# Install node.
$ nvm install v10

# set the default `node` on your $PATH in your current terminal session to the version you just installed
$ nvm use v10

# set the default "node" on your $PATH for all future terminal sessions
$ nvm alias v10 default
```

#### Node installation on Ubuntu

You can install nodejs and npm easily with apt install, just run the following
commands:

```sh
# Install Node.JS
$ sudo apt install nodejs

# Install NPM
$ sudo apt install npm
```

#### Other Operating Systems

You can find more information about the installation on the [official Node.js
website](https://nodejs.org/) and the [official NPM
website](https://npmjs.org/).

If the installation was successful, you should be able to run the following
command and get your version output

```sh
$ node --version
# v10.14.3

$ npm --version
# 6.1.0
```

If you need to update `npm`, you can make it using `npm`! After running the
following command, simply reopen your terminal

```sh
# Update NPM
$ npm install npm -g
```