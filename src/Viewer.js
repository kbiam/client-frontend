import React, { useEffect, useRef } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { serverUrl } from './helper/Helper';

const Viewer = () => {
  const location = useLocation();
  const peerRef = useRef();

  useEffect(() => {
    if (location.pathname === "/view-stream") {
      watchStream();
    }
  }, [location.pathname]);

  const watchStream = () => {
    try {
      const peer = createPeer();
      peerRef.current = peer;
      peer.addTransceiver("video", { direction: "recvonly" });
      peer.addTransceiver("audio", { direction: "recvonly" });
    } catch (error) {
      console.error("Error watching stream:", error);
    }
  };

  const createPeer = () => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.stunprotocol.org" }],
    });

    peer.onicecandidate = handleICECandidateEvent;
    peer.ontrack = handleTrackEvent;
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);

    return peer;
  };

  const handleNegotiationNeededEvent = async (peer) => {
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const payload = { sdp: peer.localDescription };
      const { data } = await axios.post(`${serverUrl}/consumer`, payload);
      const desc = new RTCSessionDescription(data.sdp);
      await peer.setRemoteDescription(desc);
    } catch (error) {
      console.error("Error handling negotiation:", error);
    }
  };

  const handleTrackEvent = (e) => {
    const video = document.getElementById("video");
    video.srcObject = e.streams[0];
  };

  const handleICECandidateEvent = async (event) => {
    if (event.candidate) {
      try {
        await axios.post(`${serverUrl}/ice-candidate`, {
          candidate: event.candidate,
          role: 'consumer'
        });
      } catch (error) {
        console.error("Error sending ICE candidate:", error);
      }
    }
  };

  return (
    <div className="watch-on">
      <video autoPlay playsInline id="video"></video>
    </div>
  );
};

export default Viewer;
