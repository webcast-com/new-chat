import { useEffect, useRef, useState, useCallback } from "react";
import Peer, { DataConnection } from "peerjs";
import { playNotificationSound } from "../audio/sounds";

export type PlayerInfo = {
  id: string;
  username: string;
  avatar: string;
  colorIdx: number;
  level: number;
};

export type OnlineMessage =
  | { type: "JOIN_REQUEST"; player: PlayerInfo }
  | { type: "JOIN_ACCEPTED"; players: PlayerInfo[] }
  | { type: "JOIN_DENIED"; reason: string }
  | { type: "LOBBY_STATE"; players: PlayerInfo[] }
  | { type: "PLAYER_LEFT"; playerId: string; username: string }
  | { type: "GAME_START"; numPlayers: number; players: Array<Omit<PlayerInfo, "level">> }
  | { type: "ROLL_DICE"; playerIdx: number; roll: number }
  | { type: "EMOTE"; username: string; emote: string }
  | { type: "RESTART_GAME" };

export type Notification = {
  id: number;
  type: "join_request" | "info" | "joined" | "left" | "denied";
  message: string;
  requester?: PlayerInfo; // Only for join_request type
};

export function useOnlineMultiplayer() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerInfo[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>("Disconnected");
  const [lastEmote, setLastEmote] = useState<{ username: string; emote: string; id: number } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const onMessageCallback = useRef<((msg: OnlineMessage) => void) | null>(null);
  const onlinePlayersRef = useRef<PlayerInfo[]>([]);
  const notificationIdRef = useRef(0);

  // Keep ref in sync
  useEffect(() => {
    onlinePlayersRef.current = onlinePlayers;
  }, [onlinePlayers]);

  const addNotification = useCallback((notif: Omit<Notification, "id">) => {
    const id = ++notificationIdRef.current;
    setNotifications((prev) => [...prev.slice(-9), { ...notif, id }]);
    // Auto-remove join requests after 25 seconds
    if (notif.type === "join_request") {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 25000);
    }
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const setOnMessage = useCallback((cb: (msg: OnlineMessage) => void) => {
    onMessageCallback.current = cb;
  }, []);

  // Broadcast out to all peers
  const sendMessage = useCallback((msg: OnlineMessage) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) conn.send(msg);
    });
    if (bcRef.current) bcRef.current.postMessage(msg);
  }, []);

  // Initialize BroadcastChannel
  useEffect(() => {
    if (!roomCode) return;
    const channelName = `snakes_ladders_${roomCode}`;
    const bc = new BroadcastChannel(channelName);
    bcRef.current = bc;

    bc.onmessage = (ev) => {
      const data = ev.data as OnlineMessage;
      if (data) {
        if (!isHost && data.type === "LOBBY_STATE") {
          setOnlinePlayers(data.players);
        }
        if (data.type === "JOIN_REQUEST" && isHost) {
          handleJoinRequest(data.player);
        }
        handleIncomingMessage(data);
      }
    };

    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, [roomCode, isHost]);

  const handleIncomingMessage = (msg: OnlineMessage) => {
    if (msg.type === "EMOTE") {
      setLastEmote({ username: msg.username, emote: msg.emote, id: Date.now() });
    }
    if (onMessageCallback.current) {
      onMessageCallback.current(msg);
    }
  };

  const handleJoinRequest = useCallback((player: PlayerInfo) => {
    const currentPlayers = onlinePlayersRef.current;
    if (currentPlayers.some((p) => p.id === player.id)) return;
    if (currentPlayers.length >= 4) {
      sendMessage({ type: "JOIN_DENIED", reason: "Room is full (max 4 players)." });
      return;
    }
    playNotificationSound("request");
    addNotification({
      type: "join_request",
      message: `${player.avatar} ${player.username} (Lv.${player.level}) wants to join!`,
      requester: player,
    });
    setOnlinePlayers((prev) => prev);
  }, [addNotification, sendMessage]);

  const acceptPlayer = useCallback((player: PlayerInfo) => {
    const currentPlayers = onlinePlayersRef.current;
    if (currentPlayers.some((p) => p.id === player.id)) return;
    if (currentPlayers.length >= 4) return;

    playNotificationSound("joined");
    const updated = [...currentPlayers, player];
    setOnlinePlayers(updated);
    onlinePlayersRef.current = updated;

    const stateMsg: OnlineMessage = { type: "LOBBY_STATE", players: updated };
    const acceptMsg: OnlineMessage = { type: "JOIN_ACCEPTED", players: updated };

    connectionsRef.current.forEach((conn) => {
      if (conn.open) conn.send(stateMsg);
    });
    if (bcRef.current) bcRef.current.postMessage(stateMsg);

    connectionsRef.current.forEach((conn) => {
      if (conn.open) conn.send(acceptMsg);
    });
    if (bcRef.current) bcRef.current.postMessage(acceptMsg);

    addNotification({
      type: "joined",
      message: `✅ ${player.avatar} ${player.username} joined the lobby!`,
    });
  }, [addNotification]);

  const rejectPlayer = useCallback((player: PlayerInfo, reason?: string) => {
    playNotificationSound("left");
    const denyMsg: OnlineMessage = {
      type: "JOIN_DENIED",
      reason: reason || "Host declined your request.",
    };
    connectionsRef.current.forEach((conn) => {
      if (conn.open) conn.send(denyMsg);
    });
    if (bcRef.current) bcRef.current.postMessage(denyMsg);

    addNotification({
      type: "denied",
      message: `❌ Declined ${player.avatar} ${player.username}.`,
    });
  }, [addNotification]);

  const createRoom = useCallback((hostUser: PlayerInfo) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setIsHost(true);
    setOnlinePlayers([hostUser]);
    onlinePlayersRef.current = [hostUser];
    setStatusMsg(`Room ${code} open! Share invite link or code.`);
    setNotifications([]);

    const peerId = `snakes-ladders-${code}`;
    const peer = new Peer(peerId);
    peerRef.current = peer;

    peer.on("open", () => {
      setIsConnected(true);
    });

    peer.on("connection", (conn) => {
      connectionsRef.current.push(conn);

      conn.on("data", (data: unknown) => {
        const msg = data as OnlineMessage;
        if (msg?.type === "JOIN_REQUEST") {
          handleJoinRequest(msg.player);
        } else if (msg) {
          // Relay to all other connected peers (not the sender)
          connectionsRef.current.forEach((c) => {
            if (c !== conn && c.open) c.send(msg);
          });
          if (bcRef.current) bcRef.current.postMessage(msg);
          handleIncomingMessage(msg);
        }
      });

      conn.on("close", () => {
        connectionsRef.current = connectionsRef.current.filter((c) => c !== conn);
      });
    });

    peer.on("error", (err) => {
      console.warn("PeerJS:", err);
    });

    addNotification({ type: "info", message: `🚀 Room created! Code: ${code}` });
  }, [addNotification, handleJoinRequest]);

  const joinRoom = useCallback((code: string, guestUser: PlayerInfo) => {
    const cleanCode = code.trim().toUpperCase();
    setRoomCode(cleanCode);
    setIsHost(false);
    setStatusMsg(`Connecting to ${cleanCode}...`);
    setNotifications([]);

    const peerId = `snakes-ladders-${cleanCode}`;
    const peer = new Peer();
    peerRef.current = peer;

    peer.on("open", () => {
      const conn = peer.connect(peerId);
      connectionsRef.current = [conn];

      conn.on("open", () => {
        setIsConnected(true);
        setStatusMsg(`Connected! Waiting for host...`);
        const joinMsg: OnlineMessage = { type: "JOIN_REQUEST", player: guestUser };
        conn.send(joinMsg);
        if (bcRef.current) bcRef.current.postMessage(joinMsg);
      });

      conn.on("data", (data: unknown) => {
        const msg = data as OnlineMessage;
        if (msg.type === "LOBBY_STATE" || msg.type === "JOIN_ACCEPTED") {
          const players = (msg as any).players as PlayerInfo[];
          setOnlinePlayers(players);
          onlinePlayersRef.current = players;
          if (players.some((p) => p.id === guestUser.id)) {
            setStatusMsg(`✅ Joined Room ${cleanCode}!`);
          }
        } else if (msg.type === "JOIN_DENIED") {
          setStatusMsg(`❌ Denied: ${msg.reason}`);
          addNotification({ type: "denied", message: `❌ Host declined: ${msg.reason}` });
        } else {
          handleIncomingMessage(msg);
        }
      });

      conn.on("close", () => {
        setStatusMsg("Connection closed");
        connectionsRef.current = connectionsRef.current.filter((c) => c !== conn);
      });
    });

    setTimeout(() => {
      if (bcRef.current) {
        const joinMsg: OnlineMessage = { type: "JOIN_REQUEST", player: guestUser };
        bcRef.current.postMessage(joinMsg);
        setIsConnected(true);
      }
    }, 400);

    peer.on("error", (err) => {
      console.warn("PeerJS:", err);
      addNotification({ type: "info", message: "⚠️ Using local fallback..." });
    });
  }, [addNotification, handleIncomingMessage]);

  const removePlayer = useCallback((playerId: string) => {
    setOnlinePlayers((prev) => {
      const updated = prev.filter((p) => p.id !== playerId);
      onlinePlayersRef.current = updated;
      const stateMsg: OnlineMessage = { type: "LOBBY_STATE", players: updated };
      connectionsRef.current.forEach((conn) => { if (conn.open) conn.send(stateMsg); });
      if (bcRef.current) bcRef.current.postMessage(stateMsg);
      return updated;
    });
  }, []);

  const leaveRoom = useCallback(() => {
    playNotificationSound("left");
    if (roomCode) {
      const mySelf = onlinePlayersRef.current[0];
      if (mySelf) {
        const leftMsg: OnlineMessage = { type: "PLAYER_LEFT", playerId: mySelf.id, username: mySelf.username };
        sendMessage(leftMsg);
      }
    }
    if (peerRef.current) peerRef.current.destroy();
    if (bcRef.current) bcRef.current.close();
    connectionsRef.current = [];
    setRoomCode(null);
    setIsConnected(false);
    setIsHost(false);
    setOnlinePlayers([]);
    onlinePlayersRef.current = [];
    setStatusMsg("Disconnected");
    setNotifications([]);
  }, [roomCode, sendMessage]);

  return {
    roomCode,
    isHost,
    isConnected,
    onlinePlayers,
    statusMsg,
    lastEmote,
    notifications,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    setOnMessage,
    acceptPlayer,
    rejectPlayer,
    removePlayer,
    dismissNotification,
  };
}
