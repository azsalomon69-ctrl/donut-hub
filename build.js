// build.js
import fs from "fs/promises";

async function getPlayerCount() {
  try {
    const res = await fetch(
      "https://api.mcstatus.io/v2/status/java/donutsmp.net"
    );
    const data = await res.json();
    if (data.online && data.players) {
      console.log("  ✓ mcstatus.io returned", data.players.online);
      return `${data.players.online.toLocaleString()} / ${data.players.max.toLocaleString()}`;
    }
  } catch (err) {
    console.log("  ✗ mcstatus.io failed:", err.message);
  }
  return "25,000+ / 50,000";
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
  console.log("→ Fetching player count...");
  const playerText = await getPlayerCount();

  console.log("→ Fetching Discord stats...");
  const discord = await getDiscord();
  const discordText = `${discord.online.toLocaleString()} online • ${discord.members.toLocaleString()} members`;

  // ISO string of the build time for the "last updated" display
  const buildTime = new Date().toISOString();

  console.log("→ Final player count:", playerText);
  console.log("→ Final Discord:", discordText);
  console.log("→ Build time:", buildTime);

  const files = ["index.html", "rules.html", "store.html", "faq.html", "terms.html", "404.html"];

  for (const file of files) {
    try {
      let html = await fs.readFile(file, "utf8");

      // Player count
      html = html.replace(
        /<span class="status-count" id="playerCount">[^<]*<\/span>/g,
        `<span class="status-count" id="playerCount">${playerText}</span>`
      );

      // Build timestamp attribute on body (for client-side "updated Xh ago")
      html = html.replace(
        /<body(\s[^>]*)?>/,
        `<body$1 data-built="${buildTime}">`
      );

      // Discord counts (index only)
      if (file === "index.html") {
        html = html.replace(
          /<div class="discord-count">[\s\S]*?<\/div>/,
          `<div class="discord-count">
                <span class="discord-dot"></span>
                ${discordText}
              </div>`
        );
      }

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