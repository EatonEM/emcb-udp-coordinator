# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.12.0] - 2023-11-30

### Added

- Support for the following EV-SB commands: `getEvseDeviceState`, `getEvseAppliedControlSettings`, `getEvseConfigSettingsAndMode`, and `patchEvseConfigSettingsAndMode`
- Example files for each SB and EV-SB command using unicast

### Changed

- Updated the message queuing system to allow every command to have it's own timeout instead of a single, static timeout for each batch of messages
- Updated several dependencies and removed unused ones

### Removed

- Support for `getDeviceDebugData` and `setCloudLogging` (these were removed from the device in EM firmware release v1.16.0)

## [0.11.1] - 2021-04-07

### Fixed

- Update all documentation for EMLCP Node.JS SDK

## [0.11.0] - 2021-02-17

### Added

- UDP latency tests.  New file `Examples/cli/discoverAndTestUDPLatency.js`

### Changed

- Updated `Examples/README.md` to include new UDP latency tests information.

## [0.10.0] - 2019-06-26

### Added

- Average Power Calculation / Logging (in Watts) to
  `Examples/cli/writeDeviceDataToCSV.js`
- `getMasterIPAddress()`
- `createDevice(idDevice, ipAddress, unicastGetNextSequenceNumber = true)`
- Undocumented EmcbUDPbroadcastMaster functionality:
  - `setCloudLogging` and `EMCB_UDP_MESSAGE_CODE_SET_CLOUD_LOGGING` constant
  - `setMeterMode` and `EMCB_UDP_MESSAGE_CODE_SET_METER_MODE` constant

### Changed

- Allow `.send()` to be called by outside code with a generic `messageCode` and
  `messageData`, passing the response back as a raw buffer.  This allows sending
  of arbitrary data to a device, without needing to implement a parser, etc.
  held by the library.  Currently this is Undocumented behavior.

### Fixed

- Parsing issues for Int64 numbers (was only parsing 7 bytes instead of all 8
  due to the fact that `Buffer.slice(start,end)` is not inclusive on the `end`)
- The `device` property was not present in **EMCB_UDP_EVENT_DEVICE_REMOVED**
  events
- Issue with using an undefined device in `.on(EMCB_UDP_ERROR_TIMEOUT, ...)` in
  examples
- Documentation error in `getMeterData` `data.responses[${IP_ADDRESS}].period`
- Formatting issues in `Examples/cli/writeDeviceDataToCSV.js`
- Improved initialization code to handle devices discovered with a good
  Broadcast key but without a provided unicast key

## [0.9.0] - 2019-04-05

### Removed

- EMCB_UDP_BROADCAST_ADDRESS is no longer a constant as we are now using some
  async code to determine the broadcast address.  This value can still be
  accessed through the `EmcbUDPbroadcastMaster.ipAddress` property (although it
  may not be available immediately in sync code after instantiation).

### Added

- `EmcbUDPbroadcastMaster` now accepts a `broadcastIPaddress` or a `ifaceName`
  argument to allow specifying which network interface/broadcast address a user
  want to use.

### Changed

- The default behavior for network interface and broadcast IP address discovery
  is now more intelligent in selecting the appropriate network interface (no
  longer simply the first one with a valid local IP address)
- Improve handling of no unicast udpKey being provided for a particular device
  ID that was found during the discovery process.

## [0.8.1] - 2019-04-03

### Fixed

- Commands now correctly resolve/reject with exactly 1 response/timeout/error
  per discovered device.  Timeouts were not being handled correctly in the
  previous release.

### Changed

- Minor improvements made to `Examples/cli/discoverAndInteractiveControl.js`

## [0.8.0] - 2019-03-29

### Added

- Initial Public (Alpha) Release!

[0.12.0]: https://github.com/EatonEM/emcb-udp-master/releases/tag/v0.12.0
[0.11.1]: https://github.com/EatonEM/emcb-udp-master/releases/tag/v0.11.1
[0.11.0]: https://github.com/EatonEM/emcb-udp-master/releases/tag/v0.11.0
[0.10.0]: https://github.com/EatonEM/emcb-udp-master/releases/tag/v0.10.0
[0.9.0]: https://github.com/EatonEM/emcb-udp-master/releases/tag/v0.9.0
[0.8.1]: https://github.com/EatonEM/emcb-udp-master/releases/tag/v0.8.1
[0.8.0]: https://github.com/EatonEM/emcb-udp-master/releases/tag/v0.8.0
