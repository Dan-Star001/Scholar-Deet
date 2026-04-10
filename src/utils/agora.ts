import AgoraRTC, {
  type IAgoraRTCClient,
  type IMicrophoneAudioTrack,
  type ICameraVideoTrack,
} from "agora-rtc-sdk-ng";

export const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || "";

export function createClient(): IAgoraRTCClient {
  return AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
}

export async function createLocalTracks(): Promise<{
  audioTrack: IMicrophoneAudioTrack;
  videoTrack: ICameraVideoTrack;
}> {
  const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
  return { audioTrack, videoTrack };
}

export { AgoraRTC };
export type { IAgoraRTCClient, IMicrophoneAudioTrack, ICameraVideoTrack };
