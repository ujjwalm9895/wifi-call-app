import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import Peer, { Instance as PeerInstance } from "simple-peer";

interface IncomingCall {
  from: string;
  signal: Peer.SignalData;
  username: string;
}

const socket = io("http://localhost:5000");

export default function Home() {
  const [username, setUsername] = useState("");
  const [callUsername, setCallUsername] = useState("");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const peerRef = useRef<PeerInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    })
    .then(mediaStream => {
      setStream(mediaStream);
    })
    .catch(err => {
      console.error("Microphone access denied", err);
      alert("Please allow microphone access.");
    });

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });

    socket.on("receive-call", ({ from, signal, username }) => {
      setIncomingCall({ from, signal, username });
    });

    socket.on("call-answered", ({ signal }) => {
      peerRef.current?.signal(signal);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (username) {
      socket.emit("register-user", username);
    }
  }, [username]);

  const callUser = () => {
    if (!username || !callUsername || !stream) return;

    const peer = new Peer({ initiator: true, trickle: false, stream });
    peerRef.current = peer;

    peer.on("signal", (signalData) => {
      socket.emit("call-user", {
        signal: signalData,
        toUsername: callUsername,
        username
      });
    });

    peer.on("stream", (remoteStream) => {
      if (audioRef.current) {
        audioRef.current.srcObject = remoteStream;
      }
    });
  };

  const answerCall = () => {
    if (!stream || !incomingCall) return;

    const peer = new Peer({ initiator: false, trickle: false, stream });
    peerRef.current = peer;

    peer.on("signal", (signalData) => {
      socket.emit("answer-call", {
        signal: signalData,
        to: incomingCall.from,
        username
      });
    });

    peer.on("stream", (remoteStream) => {
      if (audioRef.current) {
        audioRef.current.srcObject = remoteStream;
      }
    });

    peer.signal(incomingCall.signal);
    setIncomingCall(null);
  };

  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <h2>Voice Contacts</h2>

        <input
          placeholder="Your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <p><strong>Connected as:</strong> {username || "Not set"}</p>

        <input
          placeholder="Username to call"
          value={callUsername}
          onChange={(e) => setCallUsername(e.target.value)}
        />
        <button onClick={callUser}>Call</button>
        <button onClick={endCall} style={{ backgroundColor: "#FF4B55", marginTop: "10px" }}>
          End Call
        </button>
      </div>

      <div className="call-window">
        <h2>Audio Call</h2>

        <audio ref={audioRef} autoPlay controls />

        {incomingCall && (
          <div className="incoming-call">
            <p><strong>{incomingCall.username}</strong> is calling...</p>
            <button
              onClick={answerCall}
              style={{
                marginTop: "10px",
                padding: "8px 12px",
                backgroundColor: "#34B7F1",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer"
              }}
            >
              Answer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
