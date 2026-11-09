export type GreetingPeriod = "morning" | "afternoon" | "evening";

/**
 * Determines the time period of the day for greetings:
 * - morning: 05:00 - 11:59
 * - afternoon: 12:00 - 18:59
 * - evening: 19:00 - 04:59
 */
export function getTimeAwareGreetingPeriod(date: Date = new Date()): GreetingPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return "morning";
  } else if (hour >= 12 && hour < 19) {
    return "afternoon";
  } else {
    return "evening";
  }
}

/**
 * Returns a personalized, localized greeting based on user name and current time of day.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTimeAwareGreeting(
  t: any,
  userName?: string,
  date: Date = new Date()
): string {
  const period = getTimeAwareGreetingPeriod(date);
  const name = userName?.trim() || "Usuario";

  const defaultMessages: Record<GreetingPeriod, string> = {
    morning: `Buenos días, ${name}`,
    afternoon: `Buenas tardes, ${name}`,
    evening: `Buenas noches, ${name}`,
  };

  const key = `home.greeting.${period}`;
  return typeof t === "function"
    ? t(key, { name, defaultValue: defaultMessages[period] })
    : defaultMessages[period];
}
