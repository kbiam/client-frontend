import React, { useState, useRef } from "react";
import axios from "axios";
import Share from "./Share";
import { serverUrl } from "./helper/Helper";

const Broadcasting = () => {
  const [streamUrl, setStreamUrl] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const peerRef = useRef(null);

  const startStreamingAndRecording = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const videoElement = document.getElementById("video");
      const peer = createPeer();
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      videoElement.srcObject = stream;

      const streamLink = `${serverUrl}/view-stream`;
      setStreamUrl(streamLink);
      setIsStreaming(true);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm; codecs=vp8,opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = function (e) {
        chunksRef.current.push(e.data);
      };
      mediaRecorder.start();
    } catch (error) {
      console.error("Error starting stream and recording:", error);
    }
  };

  const stopStreamingAndDownload = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "recorded-video.webm";
        a.click();

        chunksRef.current = [];
        setIsStreaming(false);
      };
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
  };

  const createPeer = () => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.stunprotocol.org" }],
    });

    peer.onicecandidate = handleICECandidateEvent;
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);

    return peer;
  };

  const handleNegotiationNeededEvent = async (peer) => {
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const payload = { sdp: peer.localDescription };
      const { data } = await axios.post(`${serverUrl}/broadcast`, payload);
      const desc = new RTCSessionDescription(data.sdp);
      await peer.setRemoteDescription(desc);
    } catch (error) {
      console.error("Error handling negotiation:", error);
    }
  };

  const handleICECandidateEvent = async (event) => {
    if (event.candidate) {
      try {
        await axios.post(`${serverUrl}/ice-candidate`, {
          candidate: event.candidate,
          role: 'broadcaster'
        });
      } catch (error) {
        console.error("Error sending ICE candidate:", error);
      }
    }
  };

  return (
    <div className="broadcasting">
      <div className="video-container">
        <video id="video" autoPlay muted></video>
      </div>
      <div className="controls">
        {!isStreaming ? (
          <button onClick={startStreamingAndRecording}>Start Streaming</button>
        ) : (
          <button onClick={stopStreamingAndDownload}>Stop Streaming</button>
        )}
      </div>
      {streamUrl && <Share streamUrl={streamUrl} />}
    </div>
  );
};

export default Broadcasting;
