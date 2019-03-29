# emcb-udp-master

<!-- [![Build Status](https://secure.travis-ci.org/EatonEM/emcb-udp-master.svg?branch=master)](https://travis-ci.org/EatonEM/emcb-udp-master )-->
[![Dependency Status](https://david-dm.org/EatonEM/emcb-udp-master.svg)](https://david-dm.org/EatonEM/emcb-udp-master)
[![devDependency Status](https://david-dm.org/socketio/socket.io/dev-status.svg)](https://david-dm.org/EatonEM/emcb-udp-master#info=devDependencies)
[![npm version](https://badge.fury.io/js/emcb-udp-master.svg)](https://badge.fury.io/js/emcb-udp-master.io)

This node module allows you to experiment with the __EMCB UDP API__ to query and control Energy Management Circuit Breakers and provides an example implementation leveraging best practices.

> **NOTE** - The UDP API of the EMCB is currently in Beta.  To use this module, you must have an EMCB that has been enrolled in the UDP API Beta.  For more information, contact Eaton.

------------

## Installation

### npm

`npm install --save emcb-udp-master`

### Manual

    $ git clone https://github.com/EatonEM/emcb-udp-master
    $ cd emcb-udp-master
    $ npm install

## How to use

Relevant Documentation can be found at:

- [docs/API.md](./docs/API.md): Complete API documentation for this library
- [docs/EMCB UDP API.pdf](./docs/EMCB\ UDP\ API.pdf): Complete API documentation for the EMCB UDP API protocol used on the local network that this library is implemented against.
- [EMCB Cloud API](portal.developer.eatonem.com): Complete Cloud API documentation, including the steps required to setup UDP Keys on individual EMCBs which is needed to use this code!
- [Examples/README.md](./Examples/README.md): Contains documentation on the provided examples and the necessary steps to begin leveraging them.

## Logging

This library exposes a pre-configured [winston@3](https://github.com/winstonjs/winston) [`logger`](docs/API.md#logger).  It also overrides `console.log`, etc. so that all logs are captured by [winston](https://github.com/winstonjs/winston).

These logs are written to both the console and to `./logs/` whenever the `emcb-udp-master` is used to aid in debugging/understanding. See  [docs/API.md](./docs/API.md#logger) for more information.

## Requirements

You will need the following installed in your environment:

- Node.js and npm (Node Package Manager)
- git

> This library has been developed and tested on macOS using node v10.14.3.  **v10 or greater of Node.js is required.**

### Git

`git` should be available in your `$PATH` as `npm` might need it. You can find git at [https://git-scm.com/](https://git-scm.com/).

### Node

#### Node installation on Windows

The [official Node.js website](https://nodejs.org/) has an installer available for download.

#### Node installation on macOS

For macOS, the preferred installation method is to use [nvm (Node Version Manager)](https://github.com/creationix/nvm).  You can install nvm and the latest version of node using these commands:

    # Download and install nvm
    $ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash

    # Install node.
    $ nvm install v10

    # set the default `node` on your $PATH in your current terminal session to the version you just installed
    $ nvm use v10

    # set the default "node" on your $PATH for all future terminal sessions
    $ nvm alias v10 default

#### Node installation on Ubuntu

You can install nodejs and npm easily with apt install, just run the following commands:

  $ sudo apt install nodejs
  $ sudo apt install npm

#### Other Operating Systems

You can find more information about the installation on the [official Node.js website](https://nodejs.org/) and the [official NPM website](https://npmjs.org/).

If the installation was successful, you should be able to run the following command and get your version output

    $ node --version
    v10.14.3

    $ npm --version
    6.1.0

If you need to update `npm`, you can make it using `npm`! After running the following command, simply reopen your terminal

  $ npm install npm -g
