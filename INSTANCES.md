# Barashka & Monochrome Instances

This document lists public instances of Monochrome that can be used with Barashka Music Player. Barashka is a fork of Monochrome and maintains compatibility with Monochrome API instances.

> **Note**: Barashka is designed to work with your local music library and supports multiple API backends including Tidal and Qobuz. These instances provide additional streaming capabilities.

---

## Using API Instances with Barashka

To use an API instance with Barashka:

1. Go to **Settings** → **API Configuration**
2. Enter the instance URL in the **API Endpoint** field
3. Save and restart the application

---

## Monochrome Official Instances

The official Monochrome instances maintained by the core team:

| URL                                                    | Status   | Notes            |
| ------------------------------------------------------ | -------- | ---------------- |
| [monochrome.tf](https://monochrome.tf)                 | Official | Primary instance |
| [monochrome.samidy.com](https://monochrome.samidy.com) | Official | Secondary mirror |

---

## UI-Only Instances

These instances provide the tidal-ui web interface:

| Provider            | URL                                            | Status    |
| ------------------- | ---------------------------------------------- | --------- |
| **bini (tidal-ui)** | [music.binimum.org](https://music.binimum.org) | Community |
| **squid.wtf**       | [tidal.squid.wtf](https://tidal.squid.wtf)     | Community |
| **QQDL**            | [tidal.qqdl.site](https://tidal.qqdl.site/)    | Community |

---

## API Instances

Barashka uses the Hi-Fi API under the hood. Live, up-to-date status trackers (which return JSON) can be found below:

- https://tidal-uptime.jiffy-puffs-1j.workers.dev/
- https://tidal-uptime.props-76styles.workers.dev/

These are available API endpoints that can be used with Barashka or other Hi-Fi based applications:

### Official & Community APIs

| Provider          | URL                                 | Notes                                                      |
| ----------------- | ----------------------------------- | ---------------------------------------------------------- |
| **Monochrome**    | `https://monochrome-api.samidy.com` | Official API - [See Note](https://rentry.co/monochromeapi) |
|                   | `https://api.monochrome.tf`         | Official API                                               |
|                   | `https://arran.monochrome.tf`       | Official API                                               |
| **squid.wtf**     | `https://triton.squid.wtf`          | Community hosted                                           |
| **Lucida (QQDL)** | `https://wolf.qqdl.site`            | Community hosted                                           |
|                   | `https://maus.qqdl.site`            | Community hosted                                           |
|                   | `https://vogel.qqdl.site`           | Community hosted                                           |
|                   | `https://katze.qqdl.site`           | Community hosted                                           |
|                   | `https://hund.qqdl.site`            | Community hosted                                           |
| **Spotisaver**    | `https://hifi-one.spotisaver.net`   | Community hosted                                           |
|                   | `https://hifi-two.spotisaver.net`   | Community hosted                                           |
| **Kinoplus**      | `https://tidal.kinoplus.online`     | Community hosted                                           |
| **Binimum**       | `https://tidal-api.binimum.org`     | Community hosted                                           |

---

## Instance Health

To check the current status of instances:

1. Visit the instance URL in your browser
2. Check if the page loads correctly
3. Try playing a track to verify API connectivity

> **Note:** Community instances may have varying uptime and performance. If one doesn't work, try another.

---

## Self-Hosting

Want to host your own instance? See our [Self-Hosting Guide](self-hosted-database.md) for detailed instructions on setting up your own backend.

---

## Adding Your Instance

Want to add your instance to this list?

1. Ensure your instance is stable and publicly accessible
2. Open a pull request with your instance details
3. Include:
    - Instance URL
    - Provider name
    - Type (UI/API/Both)
    - Brief description

---

## Disclaimer

- Community instances are not affiliated with the official Monochrome or Barashka projects
- Use at your own risk
- Instance availability and performance may vary
- The Barashka project does not guarantee uptime for community instances

---

## Related Resources

- [Self-Hosting Guide](self-hosted-database.md) - Host your own instance
- [Contributing Guide](CONTRIBUTING.md) - Contribute to the project
- [Barashka Repository](https://github.com/Bebrowskiy/barashka) - Source code
- [Monochrome Repository](https://github.com/monochrome-music/monochrome) - Original project
