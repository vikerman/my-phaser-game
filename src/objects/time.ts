// Maintain the current time of the day.

export const TimesOfDay = {
  DAY: 'DAY',
  NIGHT: 'NIGHT',
};

export type TimeOfDay = (typeof TimesOfDay)[keyof typeof TimesOfDay];

// A global variable for the current time of the day.
export var CurrentTimeOfDay: TimeOfDay = 'DAY';

export var CurrentDate = new Date();

function setCurrentTimeOfDay(time: TimeOfDay) {
  CurrentTimeOfDay = time;
}

export function setCurrentTime(date: Date) {
  CurrentDate = date;
  const hours = date.getHours();
  if (hours >= 6 && hours < 18) {
    setCurrentTimeOfDay(TimesOfDay.DAY);
  } else {
    setCurrentTimeOfDay(TimesOfDay.NIGHT);
  }
}
