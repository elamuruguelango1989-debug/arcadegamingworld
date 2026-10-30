
/* ArcadeGamingWorld: daily game and share challenge */
(() => {
  'use strict';

  if (document.getElementById('agw-share-challenge')) return;

  const games = [
    { name: 'Skyline Sprint', icon: '🏃', query: 'runner' },
    { name: 'Ludo', icon: '🎲', query: 'ludo' },
    { name: 'Nebula Strike', icon: '🚀', query: 'space' },
    { name: 'Neon Snake', icon: '🐍', query: 'snake' },
    { name: '2048', icon: '🔢', query: '2048' },
    { name: 'Memory Match', icon: '🧠', query: 'memory' },
    { name: 'Chess', icon: '♟️', query: 'chess' }
  ];

  const day = Math.floor(Date.now() / 86400000);
  const game = games[day % games.length];

  const origin = /^https?:/.test(location.protocol)
    ? location.origin
    : 'https://www.arcadegamingworld.com';

  const url = new URL('/', origin);
  url.searchParams.set('challenge', game.query);
  url.hash = 'games';

  const challengeUrl = url.toString();

  const message =
    `${game.icon} Today's ArcadeGamingWorld challenge: ` +
    `${game.name}! Think you can beat me? ` +
    `Play free, no download: ${challengeUrl}`;

  const section = document.createElement('section');
  section.id = 'agw-share-challenge';
  section.setAttribute('aria-labelledby', 'agw-share-title');

  section.innerHTML = `
    <div class="agw-share-inner">
      <div class="agw-share-eyebrow">
        🎯 PLAY TOGETHER · FREE · NO SIGNUP
      </div>

      <h2 id="agw-share-title">
        Challenge a friend today!
      </h2>

      <p>
        Today's featured game is
        <strong id="agw-share-game"></strong>.
        Play a round, then invite a friend to try it.
      </p>

      <div class="agw-share-actions">
        <a id="agw-share-play" href="#games">
          🎮 Find today's game
        </a>

        <button id="agw-share-send" type="button">
          ↗ Challenge a friend
        </button>

        <button id="agw-share-copy" type="button">
          🔗 Copy challenge link
        </button>
      </div>

      <p id="agw-share-status"
         role="status"
         aria-live="polite"></p>
    </div>
  `;

  const css = document.createElement('style');

  css.textContent = `
    #agw-share-challenge {
      max-width: 1232px;
      margin: 28px auto;
      padding: 0 20px;
      color: #f4f3fc;
    }

    #agw-share-challenge .agw-share-inner {
      padding: clamp(22px, 4vw, 42px);
      border: 1px solid #555077;
      border-radius: 22px;
      background: linear-gradient(115deg, #26223d, #171d32);
      box-shadow: 0 14px 36px #0002;
    }

    #agw-share-challenge .agw-share-eyebrow {
      font-size: 12px;
      letter-spacing: 2px;
      font-weight: 800;
      color: #c5ff76;
    }

    #agw-share-challenge h2 {
      font-size: clamp(25px, 4vw, 38px);
      margin: 10px 0;
    }

    #agw-share-challenge p {
      color: #d7d5e9;
      line-height: 1.6;
      margin: 8px 0 18px;
    }

    #agw-share-challenge strong {
      color: #c5ff76;
    }

    #agw-share-challenge .agw-share-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    #agw-share-challenge .agw-share-actions > * {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 17px;
      border: 1px solid #77738d;
      border-radius: 12px;
      background: #282a42;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      min-height: 44px;
    }

    #agw-share-challenge #agw-share-play {
      background: #c5ff76;
      border-color: #c5ff76;
      color: #161727;
    }

    #agw-share-challenge .agw-share-actions > *:focus-visible {
      outline: 3px solid #c5ff76;
      outline-offset: 3px;
    }

    #agw-share-challenge #agw-share-status {
      font-size: 13px;
      margin: 10px 0 0;
      min-height: 1em;
    }
  `;

  document.head.appendChild(css);

  const target =
    document.getElementById('games') ||
    document.querySelector('main') ||
    document.querySelector('footer');

  if (target && target.parentNode) {
    target.parentNode.insertBefore(section, target);
  } else {
    document.body.appendChild(section);
  }

  document.getElementById('agw-share-game').textContent =
    `${game.icon} ${game.name}`;

  const anchors = Array.from(
    document.querySelectorAll('a[href]')
  ).filter(a => !section.contains(a));

  const gameLink = anchors.find(a =>
    a.textContent.toLowerCase().includes(game.name.toLowerCase()) &&
    !a.getAttribute('href').startsWith('#')
  );

  if (gameLink) {
    document.getElementById('agw-share-play').href = gameLink.href;
  }

  document.getElementById('agw-share-send')
    .addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${game.name} Challenge`,
            text: `Can you beat me at ${game.name}? Play free:`,
            url: challengeUrl
          });
        } catch (err) {
          if (err.name !== 'AbortError') {
            window.open(
              `https://wa.me/?text=${encodeURIComponent(message)}`,
              '_blank',
              'noopener,noreferrer'
            );
          }
        }
      } else {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(message)}`,
          '_blank',
          'noopener,noreferrer'
        );
      }
    });

  document.getElementById('agw-share-copy')
    .addEventListener('click', async () => {
      const status = document.getElementById('agw-share-status');

      try {
        await navigator.clipboard.writeText(message);
        status.textContent =
          'Challenge message copied! Send it to a friend.';
      } catch (_) {
        status.textContent =
          'Copy this challenge link: ' + challengeUrl;
      }
    });

  if (new URLSearchParams(location.search).has('challenge')) {
    const grid = document.getElementById('games');

    if (grid) {
      setTimeout(() => {
        grid.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 400);
    }
  }
})();
