import { registerOTel } from '@vercel/otel';

/**
 * OpenTelemetry tracing. Next.js already emits spans for routes, rendering and fetches; this
 * registers the exporter. On Vercel, traces show up in the dashboard (and any connected
 * observability integration); elsewhere set OTEL_EXPORTER_OTLP_ENDPOINT to send them to a collector.
 */
export function register() {
	registerOTel({ serviceName: 'tournler' });
}
