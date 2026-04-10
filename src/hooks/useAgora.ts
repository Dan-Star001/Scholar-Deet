import { useState, useEffect, useRef, useCallback } from "react";
import {
  createClient,
  createLocalTracks,
  AGORA_APP_ID,
  type IAgoraRTCClient,
  type IMicrophoneAudioTrack,
  type ICameraVideoTrack,
  AgoraRTC,
} from "@/utils/agora";
import type { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";

export function useAgora(channel: string | null) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const videoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [joined, setJoined] = useState(false);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localUid, setLocalUid] = useState<number | null>(null);
  const [localNetworkQuality, setLocalNetworkQuality] = useState<number>(0);

  const join = useCallback(async () => {
    if (!channel || !AGORA_APP_ID || joined) return;

    const client = createClient();
    clientRef.current = client;

    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      
      if (mediaType === "audio" && user.audioTrack) {
        user.audioTrack.play();
      }

      // We force a new array to trigger React re-render
      setRemoteUsers((prev) => {
        const exists = prev.find((u) => u.uid === user.uid);
        if (exists) {
          return prev.map((u) => (u.uid === user.uid ? user : u));
        }
        return [...prev, user];
      });
    });

    // Handle audio autoplay failure
    AgoraRTC.onAutoplayFailed = () => {
      // Audio autoplay blocked. User interaction required.
      // In a real app, we might show a "Click to enable audio" overlay.
      // Already adding .play() calls in components which should help if user interacts.
    };

    client.on("user-unpublished", (user, mediaType) => {
      setRemoteUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? user : u))
      );
    });

    client.on("user-left", (user) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    });

    client.on("network-quality", (stats) => {
      setLocalNetworkQuality(stats.uplinkNetworkQuality);
    });

    try {
      const uid = await client.join(AGORA_APP_ID, channel, null, null);
      setLocalUid(uid as number);

      const { audioTrack, videoTrack } = await createLocalTracks();
      audioTrackRef.current = audioTrack;
      videoTrackRef.current = videoTrack;
      setLocalVideoTrack(videoTrack);
      await client.publish([audioTrack, videoTrack]);
      setJoined(true);
    } catch (e) {
      // Silent catch
    }
  }, [channel, joined]);

  const leave = useCallback(async () => {
    audioTrackRef.current?.close();
    videoTrackRef.current?.close();
    if (clientRef.current) {
      await clientRef.current.leave();
    }
    setRemoteUsers([]);
    setJoined(false);
    setLocalVideoTrack(null);
    setLocalUid(null);
  }, []);

  const toggleMute = useCallback(async (muted: boolean) => {
    if (audioTrackRef.current) {
      await audioTrackRef.current.setEnabled(!muted);
    }
  }, []);

  const toggleVideo = useCallback(async (videoOn: boolean) => {
    if (videoTrackRef.current) {
      await videoTrackRef.current.setEnabled(videoOn);
    }
  }, []);

  useEffect(() => {
    return () => {
      audioTrackRef.current?.close();
      videoTrackRef.current?.close();
      clientRef.current?.leave();
    };
  }, []);

  return { join, leave, joined, remoteUsers, localVideoTrack, localUid, localNetworkQuality, toggleMute, toggleVideo };
}
