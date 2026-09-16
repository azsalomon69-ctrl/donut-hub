// build.js
import fs from "fs/promises";

/* ---------------------------------------------------------
   Fetch live values from APIs (server-side, no CORS issues)
   --------------------------------------------------------- */
async function getPlayerCount() {
  try {
    const res = await fetch(
      "https://minecraft-serverhub.com/api/ping?host=donutsmp.net&port=25565&platform=java"
    );
    const data = await res.json();
    if (data.online && data.players) {
      return `${data.players.online.toLocaleString()} / ${data.players.max.toLocaleString()}`;
    }
  } catch (err) {
    console.error("Player count fetch failed:", err.message);
  }
  return "25,000+ / 50,000"; // fallback
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

/* ---------------------------------------------------------
   Inject values into HTML files
   --------------------------------------------------------- */
async function build() {
  const playerText = await getPlayerCount();
  const discord = await getDiscord();
  const discordText = `${discord.online.toLocaleString()} online • ${discord.members.toLocaleString()} members`;

  console.log("→ Player count:", playerText);
  console.log("→ Discord:", discordText);

  const files = ["index.html", "rules.html", "store.html"];

  for (const file of files) {
    let html = await fs.readFile(file, "utf8");

    // Inject player count into the status pill
    html = html.replace(
      /<span class="status-count" id="playerCount">[^<]*<\/span>/g,
      `<span class="status-count" id="playerCount">${playerText}</span>`
    );

    // Inject Discord counts (index only)
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
  }
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});