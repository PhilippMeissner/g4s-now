function injectCheckMarkElement(titleElement, found) {
  const logo = found ? chrome.runtime.getURL('./assets/check.svg') : chrome.runtime.getURL('./assets/cross.svg');
  const title = found ? 'GeForce Now compatible' : 'GeForce Now incompatible';

  const CHECKMARK_HTML_CODE = `
    <div class="g4s-now-container">
      <img src="${logo}" class="logo spinner" title="${title}" alt="${title}"/>
    </div>
  `;

  $(titleElement).css('display', 'inline-block');
  $(titleElement).after($(CHECKMARK_HTML_CODE));
}

function isGameSupported(source, gameTitle, gameUrl) {
  let found;
  // For some reason steam identifies it self as game, but is isn't. So we just remove it.
  const STEAM_CLIENT_ID = 100021711;
  const games = source.filter(function(game) {
    return game.id !== STEAM_CLIENT_ID;
  });

  // #1 Search for matching steamUrl (most precise)
  // -> Remove games without proper url
  const gamesWithSteamUrl = games.filter(function(game) {
    return game.steamUrl !== '';
  });

  found = !!(gamesWithSteamUrl.find(function(game) {
    return gameUrl.includes(game.steamUrl);
  }));

  // #2 Search for matching title if nothing found yet
  // -> Remove by matching RegeExp ("\w")
  if (!found) {
    found = !!(games.find(function(game) {
      return game.title.replace(/\W/g, '') === gameTitle.replace(/\W/g, '');
    }));
  }
  return found;
}

function fetchGames() {
  // Original source: https://static.nvidiagrid.net/supported-public-game-list/gfnpc.json
  return $.getJSON('https://static.nvidiagrid.net/supported-public-game-list/gfnpc.json');
}

async function init() {
  const elems = $('.apphub_AppName');

  if (!!elems && elems.length > 0) {
    const titleElem = elems[0];
    const gamesArr = await fetchGames();

    const found = isGameSupported(gamesArr, titleElem.innerText, window.location.href);
    found ? injectCheckMarkElement(titleElem, true) : injectCheckMarkElement(titleElem, false);
  } else {
    console.error('TITLE NOT FOUND');
  }
}

init();
