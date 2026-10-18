export function isEventRegistrationOpen(event: { status: string; registration_open: boolean }): boolean {
  return event.status === "published" && event.registration_open;
}