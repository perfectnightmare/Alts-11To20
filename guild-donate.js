// ================================================================
// 💰 GUILD (CLUB) DONATION
// Donates ALL of the player's dollars to the club bank using the
// internal request (no clicking), same style as the other sub-scripts.
// ================================================================

module.exports = async function runGuildDonate(page) {

  // ------------------------------------------------------------
  // 1️⃣ Open the guild page and wait for it to load
  // ------------------------------------------------------------
  await page.goto('https://v3.g.ladypopular.com/guild.php', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // ------------------------------------------------------------
  // 2️⃣ Read the current dollars from the header
  //    The element looks like: <span id="player-dollars">12,147</span>
  // ------------------------------------------------------------

  // Wait until the dollars element exists on the page
  await page.waitForSelector('#player-dollars', { timeout: 15000 });

  // Get the text exactly as shown on screen, e.g. "12,147"
  const dollarText = await page.locator('#player-dollars').innerText();

  // Convert the text into a plain number.
  // - Remove ALL commas (the /,/g part) so "1,234,567" becomes "1234567"
  // - Handle "k" / "m" suffixes just in case the game abbreviates (e.g. "12k")
  function parseDollars(text) {
    text = text.toLowerCase().replace(/,/g, '').trim();
    if (text.endsWith('k')) return Math.floor(parseFloat(text) * 1000);
    if (text.endsWith('m')) return Math.floor(parseFloat(text) * 1_000_000);
    return Math.floor(parseFloat(text));
  }

  const dollars = parseDollars(dollarText);

  // Safety check: if parsing failed or there is nothing to donate, stop here
  if (!Number.isFinite(dollars) || dollars <= 0) {
    console.log(`💰 Guild donation skipped (dollars = "${dollarText}").`);
    return;
  }

  // ------------------------------------------------------------
  // 3️⃣ Send the internal donation request
  //    This runs INSIDE the browser page (page.evaluate), so it
  //    automatically uses your logged-in session cookies.
  //    Payload copied from what you saw in the Network tab:
  //      type=bankDeposit, dollars=<amount>, emeralds=(empty), credits=(empty)
  // ------------------------------------------------------------
  const response = await page.evaluate(async (dollars) => {
    const res = await fetch('/ajax/guilds.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams({
        type: 'bankDeposit',
        dollars: String(dollars),
        emeralds: '',   // left empty = donate no emeralds
        credits: ''     // left empty = donate no credits
      }),
      credentials: 'same-origin'
    });

    // The server replies with JSON; we only need status + message
    return res.json();
  }, dollars);

  // ------------------------------------------------------------
  // 4️⃣ Log ONE line with the result
  //    status === 1 means success (message comes from the server)
  // ------------------------------------------------------------
  if (response?.status === 1) {
    console.log(`💰 Donated ${dollars} dollars to club: SUCCESS - ${response.message}`);
  } else {
    console.log(`💰 Donating ${dollars} dollars to club: FAILED - ${response?.message ?? 'Unknown reason'}`);
  }
};
