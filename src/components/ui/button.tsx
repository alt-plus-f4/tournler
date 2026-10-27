// Server-safe entry point: buttonVariants() can be called from server components, while Button
// itself (stateful, so a client component) lives in button-client.tsx.
export { buttonVariants } from './button-variants';
export { Button, type ButtonProps } from './button-client';
