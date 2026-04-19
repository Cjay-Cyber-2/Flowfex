import type { z } from 'zod';

export declare const CONNECTION_MODES: {
  readonly PROMPT: 'prompt';
  readonly SDK: 'sdk';
  readonly LINK: 'link';
  readonly LIVE: 'live';
};

export declare const LIVE_CHANNEL_PROTOCOLS: {
  readonly SOCKET_IO: 'socket.io';
  readonly SSE: 'sse';
};

export declare const promptConnectRequestSchema: z.ZodType<unknown>;
export declare const sdkConnectRequestSchema: z.ZodType<unknown>;
export declare const linkConnectRequestSchema: z.ZodType<unknown>;
export declare const liveConnectRequestSchema: z.ZodType<unknown>;
export declare const connectRequestSchema: z.ZodType<unknown>;
export declare const sessionBootstrapSchema: z.ZodType<unknown>;
export declare const connectionTransportSchema: z.ZodType<unknown>;
export declare const retrievalSummarySchema: z.ZodType<unknown>;
export declare const promptConnectionResponseSchema: z.ZodType<unknown>;
export declare const sdkConnectionResponseSchema: z.ZodType<unknown>;
export declare const linkConnectionResponseSchema: z.ZodType<unknown>;
export declare const liveConnectionResponseSchema: z.ZodType<unknown>;
export declare const connectResponseSchema: z.ZodType<unknown>;
export declare const linkResolveResponseSchema: z.ZodType<unknown>;

export type ConnectionMode = typeof CONNECTION_MODES[keyof typeof CONNECTION_MODES];
export type LiveChannelProtocol = typeof LIVE_CHANNEL_PROTOCOLS[keyof typeof LIVE_CHANNEL_PROTOCOLS];

export type PromptConnectRequest = z.infer<typeof promptConnectRequestSchema>;
export type SdkConnectRequest = z.infer<typeof sdkConnectRequestSchema>;
export type LinkConnectRequest = z.infer<typeof linkConnectRequestSchema>;
export type LiveConnectRequest = z.infer<typeof liveConnectRequestSchema>;
export type ConnectRequest = z.infer<typeof connectRequestSchema>;

export type SessionBootstrap = z.infer<typeof sessionBootstrapSchema>;
export type ConnectionTransport = z.infer<typeof connectionTransportSchema>;
export type PromptConnectionResponse = z.infer<typeof promptConnectionResponseSchema>;
export type SdkConnectionResponse = z.infer<typeof sdkConnectionResponseSchema>;
export type LinkConnectionResponse = z.infer<typeof linkConnectionResponseSchema>;
export type LiveConnectionResponse = z.infer<typeof liveConnectionResponseSchema>;
export type ConnectResponse = z.infer<typeof connectResponseSchema>;
export type LinkResolveResponse = z.infer<typeof linkResolveResponseSchema>;
