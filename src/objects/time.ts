// Maintain the current time of the day.

export var CurrentTime = new Date();

export function setCurrentTime(date: Date) {
  CurrentTime = date;
}
