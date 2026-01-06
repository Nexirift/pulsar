# Pulsar

Pulsar is an open source, decentralized social media platform that's free forever! 🚀

We aim to provide a community-oriented experience for our social media platform, [Nexirift](https://nexirift.com).

### Notice

GitHub is NOT the official place to contribute correctly. Please visit our own instance at [code.nexirift.com/Nexirift/pulsar](https://code.nexirift.com/Nexirift/pulsar). Issues and pull requests are still accepted on GitHub but we highly advise you to not do that as this may change in the future.

---

## ✨ Changes

- 🎨 Bottom navigation bar customisation
  - Post button now floats (hides in a chat)
- 🐛 Fixed random "test" notification
- 🔒 Requires adminstrator to view emails
- 📊 New "Combined" profile view
  - Has pinned posts, posts (no replies), and boosts
- 💬 Chat shown in navbar by default
  - On both the desktop and mobile ones
- ⚙️ Allow timeline tabs to be customised
  - Show or hide labels for all tabs
- 📝 Post form textarea resizes automatically
- 🎛️ Added a toggle for the widgets sidebar
- 🐛 Fixed revoked shared tokens causing an error
- 🐛 Fixed users not showing up in some searches
- 📱 Added a thumb-friendly account switcher (turtkey)
- 👮 Added new role policies for:
  - Maximum number of poll choices
  - Maximum number of attachments per note
  - Maximum note length
  - Maximum content warning length
- 🔞 Added an adults only toggle with age gating (no ID verification!!)
  - Toggle for moderators to force it upon users
  - Toggle in timeline for showing and hiding that content
  - Toggle in preferences to show and hide profiles
- 🚨 Add a toggle for moderation inactivity detection
- 🤖 Support for ALTCHA captcha services
  - Sentinel (untested) and custom supported
  - Requires { verified: true/false } on custom verify endpoints
- 🐛 Fixed preferences profile when nothing is backed up
  - Also fixed the locale string missing
- ⭐ Applied better defaults for users coming from other sites
  - Post form is shown on timeline by default
  - Widgets are hidden with the toggle visible on the sidebar
  - Replies are hidden in the timeline by default
- 🌐 Misskey locale fallback is now en-US and then ja-JP
- 👤 Allow users to create new preference profiles
- 🎮 Added a shake mechanic to the bubble game for fun :)
- 🎬 Added a GIF picker powered by the Tenor API
- 🎨 Customise (show/hide) posting form buttons
- 🔗 Option to merge quote and boost buttons
- 🐛 Fixed the queues not working and added an endpoint to update stuck counts
- 🔗 Added an option to show link previews in posting form
- 📜 Scrollbars added on sign up and sign in dialogs

## Documentation

Sharkey (not Pulsar) Documentation can be found at [Sharkey Documentation](https://docs.joinsharkey.org/docs/install/fresh/). 99% of the instructions, guides, information, etc. is the same or similar. Subsitute Sharkey for Pulsar in references like the Docker Compose file.

## Acknowledgements

Pulsar would never exist without the amazing contributors working on both [Sharkey](https://activitypub.software/TransFem-org/Sharkey) and [Misskey](https://github.com/misskey-dev/misskey).

Please consider donating to them by visting their respective donation pages -> [Sharkey](https://opencollective.com/sharkey) and [Misskey](https://misskey-hub.net/en/docs/donate).

If you donate to Nexirift, we plan to donate a portion to Sharkey and Misskey after we cover our bills.
