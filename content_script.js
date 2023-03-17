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

function isGameSupported(gameList, gameTitle) {
  const normalizedGameTitle = gameTitle.replace(/\W/g, '').toLowerCase();

  return !!gameList.find((game) => {
    return game.title.replace(/\W/g, '').toLowerCase() === normalizedGameTitle;
  });
}

async function fetchGames() {
  const games = [];
  const initialPayload = `{
  apps(country: "US", language: "en_US") {
    pageInfo {
      endCursor
      hasNextPage
    }
    items {
      title
    }
  }
}
`;

  const endCursorPlaceholder = '%ENDCURSOR%';
  const PAYLOAD_TEMPLATE = `{
  apps(country: "US", language: "en_US", after:"${endCursorPlaceholder}") {
    pageInfo {
      endCursor
      hasNextPage
    }
    items {
      title
    }
  }
}`
  let payload = initialPayload;
  let keepGoing = true;

  while (keepGoing) {
    console.log('fetching');
    const response = await fetch('https://api-prod.nvidia.com/gfngames/v1/gameList', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: payload
    }).then((response) => response.json());

    console.log('received', response.data.apps.items);
    games.push(response.data.apps.items);
    payload = PAYLOAD_TEMPLATE.replace(endCursorPlaceholder, response.data.apps.pageInfo.endCursor);
    keepGoing = response.data.apps.pageInfo.hasNextPage;
  }

  return games.flat();
}

async function init() {
  const titleElement = $('#appHubAppName');

  if (!!titleElement) {
    const gameList = await fetchGames();

    isGameSupported(gameList, titleElement.innerText)
      ? injectCheckMarkElement(titleElement, true)
      : injectCheckMarkElement(titleElement, false);
  } else {
    console.error('GAME NOT FOUND');
  }
}

init();
