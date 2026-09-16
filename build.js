// build.js
import fs from "fs/promises";

/* ---------------------------------------------------------
   Fetch server data (server-side, no CORS, direct hits)
   --------------------------------------------------------- */
async function getServerData() {
  let playerText = "25,000+ / 50,000";
  let version = "Velocity 1.7.2-26.2";
  let motd = "DonutSMP.net ѕᴜʀᴠɪᴠᴀʟ";

  try {
    const res = await fetch(
      "https://api.mcstatus.io/v2/status/java/donutsmp.net"
    );
    const data = await res.json();

    if (data.online && data.players) {
      playerText = `${data.players.online.toLocaleString()} / ${data.players.max.toLocaleString()}`;
      console.log("  ✓ mcstatus.io players:", data.players.online);
    }
    if (data.version?.name_clean) {
      version = data.version.name_clean;
      console.log("  ✓ mcstatus.io version:", version);
    }
    if (data.motd?.clean) {
      motd = data.motd.clean.replace(/\n/g, " ").trim();
      console.log("  ✓ mcstatus.io motd:", motd);
    }
  } catch (err) {
    console.log("  ✗ mcstatus.io failed:", err.message);
  }

  return { playerText, version, motd };
}

async function getDiscord() {
  try {
    const res = await fetch(
      "https://discord.com/api/v9/invites/donutsmp?with_counts=true"
    );
    const data = await res.json();
    if (data.approximate_presence_count) {
      return {
        online: data.approximate_presence_count,
        members: data.approximate_member_count,
      };
    }
  } catch (err) {
    console.error("Discord fetch failed:", err.message);
  }
  return { online: 110000, members: 1000000 };
}

async function build() {
  console.log("→ Fetching server data...");
  const { playerText, version, motd } = await getServerData();

  console.log("→ Fetching Discord stats...");
  const discord = await getDiscord();
  const discordText = `${discord.online.toLocaleString()} online • ${discord.members.toLocaleString()} members`;

  const buildTime = new Date().toISOString();

  console.log("→ Final player count:", playerText);
  console.log("→ Final version:", version);
  console.log("→ Final MOTD:", motd);
  console.log("→ Final Discord:", discordText);

  const files = ["index.html", "rules.html", "store.html", "faq.html", "terms.html", "404.html"];

  for (const file of files) {
    try {
      let html = await fs.readFile(file, "utf8");

      // Player count in the header pill
      html = html.replace(
        /<span class="status-count" id="playerCount">[^<]*<\/span>/g,
        `<span class="status-count" id="playerCount">${playerText}</span>`
      );

      // Server info card (index only)
      if (file === "index.html") {
        html = html.replace(
          /<span class="server-info-value" id="infoVersion">[^<]*<\/span>/,
          `<span class="server-info-value" id="infoVersion">${version}</span>`
        );
        html = html.replace(
          /<span class="server-info-value" id="infoPlayers">[^<]*<\/span>/,
          `<span class="server-info-value" id="infoPlayers">${playerText}</span>`
        );
        html = html.replace(
          /<span class="server-info-value server-info-motd" id="infoMotd">[^<]*<\/span>/,
          `<span class="server-info-value server-info-motd" id="infoMotd">${motd}</span>`
        );

        // Discord counts
        html = html.replace(
          /<div class="discord-count">[\s\S]*?<\/div>/,
          `<div class="discord-count">
                <span class="discord-dot"></span>
                ${discordText}
              </div>`
        );
      }

      // Build timestamp on body
      html = html.replace(
        /<body(\s[^>]*)?>/,
        `<body$1 data-built="${buildTime}">`
      );

      await fs.writeFile(file, html);
      console.log(`✓ Updated ${file}`);
    } catch (err) {
      console.log(`✗ Skipped ${file}: ${err.message}`);
    }
  }
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});