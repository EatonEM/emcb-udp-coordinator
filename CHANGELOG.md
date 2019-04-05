# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- EMCB_UDP_BROADCAST_ADDRESS is no longer a constant as we are now using some async code to determine the broadcast address.  This value can still be accessed through the `EmcbUDPbroadcastMaster.ipAddress` property (although it may not be available immediately in sync code after instantiation).

### Added

- `EmcbUDPbroadcastMaster` now accepts a `broadcastIPaddress` or a `ifaceName` argument to allow specifying which network interface/broadcast address a user want to use.

### Changed

- The default behavior for network interface and broadcast IP address discovery is now more intelligent in selecting the appropriate network interface (no longer simply the first one with a valid local IP address)
- Improve handling of no unicast udpKey being provided for a particular device ID that was found during the discovery process.

## [0.8.1] - 2019-04-03

### Fixed

- Commands now correctly resolve/reject with exactly 1 response/timeout/error per discovered device.  Timeouts were not being handled correctly in the previous release.

### Changed

- Minor improvements made to `Examples/cli/discoverAndInteractiveControl.js`

## [0.8.0] - 2019-03-29

### Added

- Initial Public Release!

<!-- Make all of our releases live links -->
[0.8.1]: https://github.com/EatonEM/emcb-udp-master/releases/tag/v0.8.1
[0.8.0]: https://github.com/EatonEM/emcb-udp-master/releases/tag/v0.8.0
