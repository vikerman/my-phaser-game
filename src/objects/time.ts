// Maintain the current time of the day.

export const TimesOfDay = {
  DAY: 'DAY',
  NIGHT: 'NIGHT',
};

export type TimeOfDay = (typeof TimesOfDay)[keyof typeof TimesOfDay];

// A global variable for the current time of the day.
export var CurrentTimeOfDay: TimeOfDay = 'DAY';

export function setCurrentTimeOfDay(time: TimeOfDay) {
  CurrentTimeOfDay = time;
}
