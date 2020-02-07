function injectCheckMarkElement(titleElement, found) {
  const className = found ? 'check' : 'cross';

  const CHECKMARK_HTML_CODE = `
    <div class="checkmark-container ${className}">
      <div class="mark">
        <div class="${className}"></div>
        <div class="${className}"></div>
      </div>
    </div>
  `;

  $(CHECKMARK_HTML_CODE).appendTo(titleElement);
}

function markAsSupported(titleElem) {
  injectCheckMarkElement(titleElem, true);
}

function markAsNotSupported(titleElem) {
  injectCheckMarkElement(titleElem, false);
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
  return $.getJSON(chrome.runtime.getURL('./gfn.json'));
}

async function init() {
  const elems = $('.apphub_AppName');

  if (!!elems && elems.length > 0) {
    const titleElem = elems[0];
    const gamesArr = await fetchGames();

    const found = isGameSupported(gamesArr, titleElem.innerText, window.location.href);
    found ? markAsSupported(titleElem) : markAsNotSupported(titleElem);
  } else {
    console.error('TITLE NOT FOUND FOOOOOOOOOOO');
  }
}

init();
