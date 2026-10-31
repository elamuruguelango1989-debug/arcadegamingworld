
(() => {
  'use strict';

  // ArcadeGamingWorld — Online Multiplayer Ludo
  const API =
    'https://agw-ludo-multiplayer.sathyavathielamurugu.workers.dev';

  const $ = id => document.getElementById(id);

  const colors = [
    '#d54863',
    '#197d58',
    '#ba8617',
    '#3567b4'
  ];

  const names = ['Red', 'Green', 'Yellow', 'Blue'];
  const letters = ['R', 'G', 'Y', 'B'];
  const starts = [0, 13, 26, 39];
  const safe = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

  const path = [
    [6,1],[6,2],[6,3],[6,4],[6,5],
    [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
    [0,7],[0,8],
    [1,8],[2,8],[3,8],[4,8],[5,8],
    [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
    [7,14],[8,14],
    [8,13],[8,12],[8,11],[8,10],[8,9],
    [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
    [14,7],[14,6],
    [13,6],[12,6],[11,6],[10,6],[9,6],
    [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
    [7,0],[6,0]
  ];

  const yards = [
    [[2,2],[2,4],[4,2],[4,4]],
    [[2,10],[2,12],[4,10],[4,12]],
    [[10,10],[10,12],[12,10],[12,12]],
    [[10,2],[10,4],[12,2],[12,4]]
  ];

  const center = [
    [7,6],
    [6,7],
    [7,8],
    [8,7]
  ];

  const lane = (color, progress) => {
    if (color === 0) return [7, progress - 50];
    if (color === 1) return [progress - 50, 7];
    if (color === 2) return [7, 64 - progress];
    return [64 - progress, 7];
  };

  let ws = null;
  let game = null;
  let playerId = null;
  let room = '';
  let reconnectTimer = null;
  let connectionSerial = 0;
  let lastDice = null;

  function status(message) {
    $('online-status').textContent = message;
  }

  function tokenPosition(color, progress, index) {
    if (progress === -1) {
      return yards[color][index];
    }

    if (progress >= 0 && progress <= 50) {
      return path[(starts[color] + progress) % 52];
    }

    if (progress >= 51 && progress <= 55) {
      return lane(color, progress);
    }

    return center[color];
  }

  // Draw the classic Ludo board.
  function art() {
    let output =
      '<rect width="600" height="600" fill="#f0eef5"/>';

    const homes = [
      [0,0],
      [0,9],
      [9,9],
      [9,0]
    ];

    homes.forEach(([row, col], color) => {
      output += `
        <rect
          x="${col * 40}"
          y="${row * 40}"
          width="240"
          height="240"
          fill="${colors[color]}"
        />
        <rect
          x="${col * 40 + 35}"
          y="${row * 40 + 35}"
          width="170"
          height="170"
          rx="24"
          fill="#fff"
          opacity=".93"
        />
      `;

      yards[color].forEach(([r, c]) => {
        output += `
          <circle
            cx="${c * 40 + 20}"
            cy="${r * 40 + 20}"
            r="20"
            fill="${colors[color]}"
            opacity=".22"
          />
        `;
      });
    });

    path.forEach(([row, col], index) => {
      const start = starts.indexOf(index);

      output += `
        <rect
          x="${col * 40}"
          y="${row * 40}"
          width="40"
          height="40"
          fill="${start >= 0 ? colors[start] : '#faf9fc'}"
          stroke="#b6b3c5"
          stroke-width="1.5"
        />
      `;

      if (safe.has(index)) {
        output += `
          <text
            x="${col * 40 + 20}"
            y="${row * 40 + 29}"
            text-anchor="middle"
            font-size="28"
            fill="${start >= 0 ? '#fff' : '#777184'}"
          >☆</text>
        `;
      }
    });

    colors.forEach((color, index) => {
      for (let progress = 51; progress <= 55; progress++) {
        const [row, col] = lane(index, progress);

        output += `
          <rect
            x="${col * 40}"
            y="${row * 40}"
            width="40"
            height="40"
            fill="${color}"
            stroke="#fff"
            stroke-width="1.5"
            opacity=".78"
          />
        `;
      }
    });

    const triangles = [
      [240,240,300,300,240,360],
      [240,240,360,240,300,300],
      [360,240,360,360,300,300],
      [240,360,300,300,360,360]
    ];

    triangles.forEach((points, index) => {
      output += `
        <polygon
          points="${points.join(' ')}"
          fill="${colors[index]}"
        />
      `;
    });

    output += `
      <circle cx="300" cy="300" r="21" fill="#fff"/>
      <text
        x="300"
        y="308"
        text-anchor="middle"
        font-size="23"
        fill="#242335"
      >⌂</text>
    `;

    $('online-art').innerHTML = output;
  }

  // Dice faces are rendered by the CSS using data-face.
  function renderDice(value) {
    const dice = $('online-dice');

    const face =
      Number.isInteger(value) && value >= 1 && value <= 6
        ? String(value)
        : '';

    dice.dataset.face = face;
    dice.textContent = '';
    dice.setAttribute(
      'aria-label',
      face ? `Dice rolled ${face}` : 'Dice not rolled'
    );

    if (face && value !== lastDice) {
      dice.classList.remove('dice-pop');
      void dice.offsetWidth;
      dice.classList.add('dice-pop');
    }

    lastDice = value;
  }

  function send(type, extra = {}) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      status('Not connected. Please wait for reconnection.');
      return;
    }

    ws.send(JSON.stringify({ type, ...extra }));
  }

  function legal(index) {
    if (!game || game.phase !== 'playing') return false;

    const current = game.players[game.turn];

    if (!current || current.id !== playerId) return false;
    if (game.dice === null) return false;
    if (!Number.isInteger(index) || index < 0 || index > 3) {
      return false;
    }

    const position = current.pieces[index];
    const dice = game.dice;

    if (position === -1) return dice === 6;

    return position >= 0 &&
      position < 56 &&
      position + dice <= 56;
  }

  function renderPlayers() {
    const container = $('online-players');
    container.replaceChildren();

    if (!game) return;

    game.players.forEach((player, index) => {
      const element = document.createElement('div');

      element.className =
        'online-player' +
        (index === game.turn ? ' current' : '');

      element.style.setProperty(
        '--player-color',
        colors[player.color]
      );

      const home = player.pieces.filter(
        progress => progress === 56
      ).length;

      element.textContent =
        `${names[player.color]} · ${player.name}` +
        (player.id === playerId ? ' (you)' : '') +
        ` · ${player.connected ? 'Online' : 'Offline'}` +
        ` · ${home}/4 home`;

      container.append(element);
    });
  }

  function renderTokens() {
    const container = $('online-tokens');
    container.replaceChildren();

    if (!game) return;

    const occupied = new Map();

    game.players.forEach((player, playerIndex) => {
      player.pieces.forEach((progress, tokenIndex) => {
        const position = tokenPosition(
          player.color,
          progress,
          tokenIndex
        );

        const key = position.join(',');

        if (!occupied.has(key)) {
          occupied.set(key, []);
        }

        occupied.get(key).push({
          player,
          playerIndex,
          progress,
          tokenIndex,
          position
        });
      });
    });

    for (const group of occupied.values()) {
      group.forEach((token, groupIndex) => {
        const {
          player,
          playerIndex,
          progress,
          tokenIndex,
          position
        } = token;

        const [row, col] = position;

        const button = document.createElement('button');
        button.type = 'button';

        const canMove =
          playerIndex === game.turn && legal(tokenIndex);

        button.className =
          'online-token' +
          (canMove ? ' movable' : '') +
          (progress === 56 ? ' finished' : '');

        // Offset stacked tokens so they remain visible.
        const dx =
          group.length > 1
            ? ((groupIndex % 2) - 0.5) * 0.32
            : 0;

        const dy =
          group.length > 1
            ? (Math.floor(groupIndex / 2) -
              (Math.ceil(group.length / 2) - 1) / 2) * 0.25
            : 0;

        button.style.left =
          ((col + 0.5 + dx) / 15 * 100) + '%';

        button.style.top =
          ((row + 0.5 + dy) / 15 * 100) + '%';

        button.style.background = colors[player.color];

        button.textContent =
          letters[player.color] + (tokenIndex + 1);

        button.setAttribute(
          'aria-label',
          `${player.name}, ${names[player.color]} token ` +
          `${tokenIndex + 1}, position ${progress}`
        );

        button.disabled = !canMove;

        button.onclick = () => {
          send('move', { piece: tokenIndex });
        };

        container.append(button);
      });
    }
  }

  function renderMoves() {
    const container = $('online-moves');
    container.replaceChildren();

    if (!game) return;

    for (let index = 0; index < 4; index++) {
      if (!legal(index)) continue;

      const button = document.createElement('button');
      button.type = 'button';

      button.textContent = `Move token ${index + 1}`;

      button.onclick = () => {
        send('move', { piece: index });
      };

      container.append(button);
    }
  }

  function render() {
    if (!game) return;

    const current = game.players[game.turn];

    renderPlayers();
    renderTokens();
    renderMoves();
    renderDice(game.dice);

    const connected =
      ws && ws.readyState === WebSocket.OPEN;

    $('start-online').disabled = !(
      connected &&
      game.phase === 'lobby' &&
      game.players.length >= 2 &&
      game.players[0]?.id === playerId
    );

    $('roll-online').disabled = !(
      connected &&
      game.phase === 'playing' &&
      current?.id === playerId &&
      game.dice === null
    );

    if (game.phase === 'finished') {
      const winner = game.players.find(
        player => player.id === game.winner
      );

      status(`${winner?.name || 'Player'} wins!`);

    } else if (game.phase === 'playing') {
      status(
        `${current?.name || 'Player'}'s turn` +
        (current?.id === playerId ? ' (you)' : '') +
        '. ' +
        (game.dice === null
          ? 'Roll the dice.'
          : 'Choose a token.')
      );

    } else {
      status(
        `Waiting for players (${game.players.length}/4). ` +
        `Room ${room}`
      );
    }
  }

  function connect(code) {
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
      status('Enter a valid six-character room code.');
      return;
    }

    clearTimeout(reconnectTimer);

    const serial = ++connectionSerial;

    if (ws) {
      const previous = ws;
      ws = null;
      previous.close();
    }

    room = code;
    playerId = null;
    game = null;
    lastDice = null;

    $('room-label').textContent = room;
    $('invite').disabled = false;

    history.replaceState(null, '', `?room=${room}`);

    const endpoint = new URL(
      `/api/ludo/room/${room}/ws`,
      API
    );

    endpoint.protocol = 'wss:';

    const socket = new WebSocket(endpoint);
    ws = socket;

    status('Connecting to multiplayer room...');

    socket.onopen = () => {
      if (serial !== connectionSerial) return;

      const token =
        localStorage.getItem('agw-ludo-token-' + room) || '';

      socket.send(JSON.stringify({
        type: 'join',
        name: $('nickname').value,
        token
      }));
    };

    socket.onmessage = event => {
      if (serial !== connectionSerial) return;

      let message;

      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.type === 'joined') {
        playerId = message.playerId;

        localStorage.setItem(
          'agw-ludo-token-' + room,
          message.token
        );

        render();

      } else if (
        message.type === 'hello' ||
        message.type === 'state'
      ) {
        game = message.game;
        render();

      } else if (message.type === 'error') {
        status('Error: ' + message.message);

      } else if (message.type === 'notice') {
        status(message.text);
      }
    };

    socket.onclose = () => {
      if (serial !== connectionSerial) return;

      $('roll-online').disabled = true;
      $('start-online').disabled = true;

      status('Connection lost. Reconnecting...');

      reconnectTimer = setTimeout(() => {
        if (serial === connectionSerial) {
          connect(room);
        }
      }, 2000);
    };

    socket.onerror = () => {
      if (serial !== connectionSerial) return;

      status(
        'Connection error. Check the Cloudflare Worker.'
      );
    };
  }

  // Room controls
  $('create').onclick = async () => {
    try {
      status('Creating room...');

      const response = await fetch(
        API + '/api/ludo/create',
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(
          'Server returned ' + response.status
        );
      }

      const result = await response.json();

      connect(result.room);

    } catch (error) {
      status('Cannot create room: ' + error.message);
    }
  };

  $('join').onclick = () => {
    connect(
      $('room-code').value.trim().toUpperCase()
    );
  };

  $('start-online').onclick = () => {
    send('start');
  };

  $('roll-online').onclick = () => {
    send('roll');
  };

  $('invite').onclick = async () => {
    if (!room) return;

    const link =
      location.origin +
      '/online-ludo.html?room=' +
      room;

    try {
      await navigator.clipboard.writeText(link);
      status('Invitation link copied!');
    } catch {
      window.prompt('Copy invitation link:', link);
    }
  };

  // Initialize board and dice
  art();
  renderDice(null);

  // Automatically join a room from an invitation link.
  const incoming = new URLSearchParams(
    location.search
  ).get('room')?.toUpperCase();

  if (incoming) {
    $('room-code').value = incoming;
    connect(incoming);
  }
})();
