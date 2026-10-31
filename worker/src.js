
'use strict';

// ArcadeGamingWorld — Online Multiplayer Ludo
// Cloudflare Worker + Durable Objects

const MAX_PLAYERS = 4;
const STARTS = [0, 13, 26, 39];
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const ALLOWED_ORIGINS = new Set([
  'https://arcadegamingworld.com',
  'https://www.arcadegamingworld.com'
]);

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin':
      ALLOWED_ORIGINS.has(origin)
        ? origin
        : 'https://arcadegamingworld.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Cache-Control': 'no-store'
  };
}

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request)
    }
  });
}

function validRoom(room) {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(room);
}

function cleanName(value) {
  return String(value || 'Player')
    .replace(/[<>\u0000-\u001f]/g, '')
    .trim()
    .slice(0, 20) || 'Player';
}

function newGame() {
  return {
    players: [],
    phase: 'lobby',
    turn: 0,
    dice: null,
    sixes: 0,
    winner: null,
    updated: Date.now()
  };
}

function publicGame(game) {
  return {
    players: game.players.map(player => ({
      id: player.id,
      name: player.name,
      color: player.color,
      pieces: player.pieces,
      connected: player.connected
    })),
    phase: game.phase,
    turn: game.turn,
    dice: game.dice,
    winner: game.winner
  };
}

function square(player, progress) {
  if (progress < 0 || progress > 50) return null;
  return (STARTS[player.color] + progress) % 52;
}

function legalMove(game, index) {
  if (game.phase !== 'playing') return false;
  if (!Number.isInteger(index) || index < 0 || index > 3) {
    return false;
  }

  if (game.dice === null) return false;

  const player = game.players[game.turn];
  if (!player) return false;

  const position = player.pieces[index];

  if (position === -1) return game.dice === 6;

  return position >= 0 &&
    position < 56 &&
    position + game.dice <= 56;
}

function availableMoves(game) {
  return [0, 1, 2, 3].filter(index => legalMove(game, index));
}

function nextTurn(game) {
  game.turn = (game.turn + 1) % game.players.length;
  game.dice = null;
  game.sixes = 0;
}

function secureDice() {
  // Rejection sampling avoids modulo bias.
  const bytes = new Uint8Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] >= 252);

  return (bytes[0] % 6) + 1;
}

function createRoomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    byte => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]
  ).join('');
}

// Main Cloudflare Worker
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin');

      if (!ALLOWED_ORIGINS.has(origin)) {
        return json({ error: 'Origin not allowed' }, 403, request);
      }

      return new Response(null, {
        status: 204,
        headers: corsHeaders(request)
      });
    }

    if (path === '/api/ludo/health') {
      return json({
        ok: true,
        service: 'ludo-multiplayer'
      }, 200, request);
    }

    if (
      path === '/api/ludo/create' &&
      request.method === 'POST'
    ) {
      const origin = request.headers.get('Origin');

      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return json({ error: 'Origin not allowed' }, 403, request);
      }

      return json({
        room: createRoomCode()
      }, 200, request);
    }

    const match = path.match(
      /^\/api\/ludo\/room\/([A-HJ-NP-Z2-9]{6})\/ws$/
    );

    if (!match || !validRoom(match[1])) {
      return json({ error: 'Not found' }, 404, request);
    }

    if (
      request.headers.get('Upgrade')?.toLowerCase() !==
      'websocket'
    ) {
      return json({
        error: 'WebSocket required'
      }, 426, request);
    }

    const origin = request.headers.get('Origin');

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({
        error: 'Origin not allowed'
      }, 403, request);
    }

    const id = env.ROOMS.idFromName(match[1]);

    return env.ROOMS.get(id).fetch(request);
  }
};

// One Durable Object per multiplayer room
export class LudoRoom {
  constructor(ctx) {
    this.ctx = ctx;
    this.state = null;

    this.ready = ctx.blockConcurrencyWhile(async () => {
      this.state =
        (await ctx.storage.get('game')) || newGame();
    });
  }

  async save() {
    this.state.updated = Date.now();
    await this.ctx.storage.put('game', this.state);
  }

  send(ws, message) {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Ignore closed connections.
    }
  }

  broadcast(message) {
    for (const ws of this.ctx.getWebSockets()) {
      this.send(ws, message);
    }
  }

  update() {
    this.broadcast({
      type: 'state',
      game: publicGame(this.state)
    });
  }

  async fetch(request) {
    await this.ready;

    if (
      request.headers.get('Upgrade')?.toLowerCase() !==
      'websocket'
    ) {
      return new Response('WebSocket required', {
        status: 426
      });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);

    this.send(server, {
      type: 'hello',
      game: publicGame(this.state)
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async webSocketMessage(ws, data) {
    try {
      await this.ready;

      const msg = JSON.parse(String(data));
      const game = this.state;
      const attachedId = ws.deserializeAttachment()?.id;

      if (msg.type === 'join') {
        const requested = String(msg.token || '');

        let player = game.players.find(
          p => requested.length >= 24 &&
            p.token === requested
        );

        if (!player) {
          if (game.phase !== 'lobby') {
            throw new Error(
              'Match already started. Only existing players can reconnect.'
            );
          }

          if (game.players.length >= MAX_PLAYERS) {
            throw new Error('Room is full.');
          }

          player = {
            id: crypto.randomUUID(),
            token: crypto.randomUUID() +
              crypto.randomUUID(),
            name: cleanName(msg.name),
            color: game.players.length,
            pieces: [-1, -1, -1, -1],
            connected: true
          };

          game.players.push(player);
        }

        ws.serializeAttachment({ id: player.id });

        for (const other of this.ctx.getWebSockets()) {
          if (
            other !== ws &&
            other.deserializeAttachment()?.id === player.id
          ) {
            try {
              other.close(4000, 'Reconnected');
            } catch {
              // Ignore connection close errors.
            }
          }
        }

        player.connected = true;

        this.send(ws, {
          type: 'joined',
          token: player.token,
          playerId: player.id
        });

      } else {
        const player = game.players.find(
          p => p.id === attachedId
        );

        if (!player) {
          throw new Error('Join the room first.');
        }

        if (msg.type === 'start') {
          if (
            game.phase !== 'lobby' ||
            game.players.length < 2
          ) {
            throw new Error(
              'Need 2–4 players to start.'
            );
          }

          if (game.players[0].id !== player.id) {
            throw new Error(
              'Only the room creator can start.'
            );
          }

          game.phase = 'playing';
          game.turn = 0;
          game.dice = null;
          game.sixes = 0;

        } else if (msg.type === 'roll') {
          if (
            game.phase !== 'playing' ||
            game.players[game.turn].id !== player.id ||
            game.dice !== null
          ) {
            throw new Error(
              'Not your turn to roll.'
            );
          }

          const dice = secureDice();
          game.dice = dice;

          if (dice === 6) {
            game.sixes++;
          } else {
            game.sixes = 0;
          }

          if (game.sixes === 3) {
            this.broadcast({
              type: 'notice',
              text:
                `${player.name} rolled three consecutive sixes. Turn forfeited.`
            });

            nextTurn(game);

          } else if (availableMoves(game).length === 0) {
            this.broadcast({
              type: 'notice',
              text:
                `${player.name} rolled ${dice} but has no legal move.`
            });

            if (dice === 6) {
              game.dice = null;
            } else {
              nextTurn(game);
            }
          }

        } else if (msg.type === 'move') {
          if (
            game.phase !== 'playing' ||
            game.players[game.turn].id !== player.id
          ) {
            throw new Error('Not your turn.');
          }

          const index = msg.piece;

          if (!legalMove(game, index)) {
            throw new Error('Illegal move.');
          }

          const dice = game.dice;

          player.pieces[index] =
            player.pieces[index] === -1
              ? 0
              : player.pieces[index] + dice;

          const progress = player.pieces[index];
          const target = square(player, progress);

          let captures = 0;

          if (target !== null && !SAFE.has(target)) {
            for (const opponent of game.players) {
              if (opponent.id === player.id) continue;

              for (let j = 0; j < 4; j++) {
                if (
                  square(
                    opponent,
                    opponent.pieces[j]
                  ) === target
                ) {
                  opponent.pieces[j] = -1;
                  captures++;
                }
              }
            }
          }

          if (player.pieces.every(p => p === 56)) {
            game.phase = 'finished';
            game.winner = player.id;
            game.dice = null;

            this.broadcast({
              type: 'notice',
              text: `${player.name} wins!`
            });

          } else {
            const reachedHome = progress === 56;

            const extraTurn =
              dice === 6 ||
              captures > 0 ||
              reachedHome;

            game.dice = null;

            if (!extraTurn) {
              nextTurn(game);
            }
          }

        } else {
          throw new Error('Unknown action.');
        }
      }

      await this.save();
      this.update();

    } catch (error) {
      this.send(ws, {
        type: 'error',
        message: String(
          error.message || error
        )
      });
    }
  }

  async webSocketClose(ws) {
    await this.disconnect(ws);
  }

  async webSocketError(ws) {
    await this.disconnect(ws);
  }

  async disconnect(ws) {
    await this.ready;

    const id = ws.deserializeAttachment()?.id;

    if (!id) return;

    const anotherConnection =
      this.ctx.getWebSockets().some(
        other =>
          other !== ws &&
          other.deserializeAttachment()?.id === id &&
          other.readyState === 1
      );

    if (anotherConnection) return;

    const player = this.state.players.find(
      p => p.id === id
    );

    if (player) {
      player.connected = false;
      await this.save();
      this.update();
    }
  }
}
