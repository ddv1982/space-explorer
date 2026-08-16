export class AuthoredEventTracker {
  private readonly triggered = new Set<string>();

  reset(): void {
    this.triggered.clear();
  }

  claim(
    sectionId: string,
    type: 'wave' | 'drop',
    eventId: string,
    triggerProgress: number,
    sectionProgress: number
  ): boolean {
    const key = `${sectionId}:${type}:${eventId}`;
    if (this.triggered.has(key) || sectionProgress < triggerProgress) return false;

    this.triggered.add(key);
    return true;
  }
}
